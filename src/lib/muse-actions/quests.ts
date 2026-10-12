// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — QUESTS
// Extracted from api/muse/route.ts (monolith, 2504 L). Handlers are exported
// pure-ish functions; the monolith's ACTIONS registry still dispatches them, so
// the POST URL / frontend call sites are UNCHANGED. This is Phase-1 decoupling:
// the code leaves the monolith file, the dispatch wiring stays put and safe.
// ══════════════════════════════════════════════════════════════════════════════
import { NextResponse } from "next/server";
import { checkRateUser } from "@/lib/rate-limit";
import { questPeriodKey, bumpLoginStreak, bumpQuest, awardQuestXp, refreshMetaQuest } from "@/lib/questEngine";
import { UUID_RE, type ActionContext } from "./shared";
import { pushToProfile } from "@/lib/push";

/** A muse_quests row, narrowed to the columns the quest verbs read. */
type QuestRow = {
  id: string;
  title?: string | null;
  icon?: string | null;
  frequency: string;
  target_count: number;
  action_key?: string | null;
  xp_reward: number;
  reward_type?: string | null;
  reward_amount: number;
  reward_label?: string | null;
};

/** A muse_quests row read by the claim verb (reward columns only). */
type QuestRewardRow = {
  id: string;
  reward_type?: string | null;
  reward_amount: number;
  reward_label?: string | null;
  frequency: string;
};

/** A muse_user_quests row read for per-period progress lookup. */
type UserQuestRow = {
  id?: string;
  quest_id?: string | null;
  progress?: number | null;
  target?: number | null;
  completed?: boolean | null;
  claimed?: boolean | null;
  period_key?: string | null;
};

/** A user-quest row joined with its quest definition (notify readout). */
type ClaimableQuestRow = {
  quest_id?: string | null;
  muse_quests?: { title?: string | null; reward_label?: string | null } | null;
};

/** One per-quest result line returned by the track verb. */
type QuestTrackResult = {
  action_key?: string | null;
  alreadyCompleted?: boolean;
  progress?: number;
  target?: number;
  completed?: boolean;
  newlyCompleted?: boolean;
  quest?: { title?: string | null; icon?: string | null; reward_label?: string | null };
  leveledUp?: boolean;
};

export async function questGetQuests({ sb, profile }: ActionContext) {
  const { data: quests }: { data: QuestRow[] | null } = await sb.from("muse_quests").select("*").eq("active", true).order("sort_order");
  if (!quests) return NextResponse.json({ quests: [], xp: { total_xp: 0, level: 1 } });

  const { data: userQuests }: { data: UserQuestRow[] | null } = await sb.from("muse_user_quests")
    .select("quest_id, progress, target, completed, claimed, period_key")
    .eq("user_id", profile.id);

  const { data: xpData }: { data: { total_xp?: number | null; level?: number | null } | null } = await sb.from("muse_user_xp").select("total_xp, level").eq("user_id", profile.id).maybeSingle();

  const progressMap: Record<string, UserQuestRow> = {};
  for (const uq of userQuests || []) {
    progressMap[`${uq.quest_id}:${uq.period_key}`] = uq;
  }

  const enriched = quests.map((q) => {
    const periodKey = questPeriodKey(q.frequency);
    const userProg = progressMap[`${q.id}:${periodKey}`];
    return {
      ...q,
      progress: userProg?.progress || 0,
      target: q.target_count,
      completed: userProg?.completed || false,
      claimed: userProg?.claimed || false,
      period_key: periodKey,
    };
  });

  const streak = await bumpLoginStreak(sb, profile.id);
  await bumpQuest(sb, profile.id, "login");
  const unclaimedCount = (userQuests || []).filter((uq) => uq.completed && !uq.claimed).length;
  if (unclaimedCount > 0) {
    pushToProfile(profile.id, "Rewards waiting!", `You have ${unclaimedCount} completed quest${unclaimedCount > 1 ? "s" : ""} ready to claim`, "/muse/quests").catch(() => {});
  }
  return NextResponse.json({ quests: enriched, xp: xpData || { total_xp: 0, level: 1 }, streak });
}

export async function questTrackQuest({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRateUser(profile.id, "track-quest", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const rawKeys: string[] = Array.isArray(rest.action_keys)
    ? rest.action_keys.filter((k: unknown) => typeof k === "string" && k.length <= 64).slice(0, 6)
    : (typeof rest.action_key === "string" ? [rest.action_key] : []);
  if (!rawKeys.length) return NextResponse.json({ error: "action_key required" }, { status: 400 });

  const SERVER_ONLY_KEYS = new Set(["match", "book_session", "host_session", "complete_session", "complete_host", "get_verified", "referral_signup"]);
  const clientKeys = rawKeys.filter(k => !SERVER_ONLY_KEYS.has(k));
  if (!clientKeys.length) return NextResponse.json({ success: true, results: [] });

  const { data: questDefs }: { data: QuestRow[] | null } = await sb.from("muse_quests")
    .select("*").eq("active", true).in("action_key", clientKeys);
  if (!questDefs?.length) return NextResponse.json({ success: true, noQuest: true });

  const results: QuestTrackResult[] = [];
  let leveledUp = false;
  for (const quest of questDefs) {
    const periodKey = questPeriodKey(quest.frequency);

    const { data: existing }: { data: { id?: string; progress?: number | null; completed?: boolean | null } | null } = await sb.from("muse_user_quests")
      .select("id, progress, completed")
      .eq("user_id", profile.id).eq("quest_id", quest.id).eq("period_key", periodKey)
      .maybeSingle();

    if (existing?.completed) { results.push({ action_key: quest.action_key, alreadyCompleted: true }); continue; }

    const newProgress = (existing?.progress || 0) + 1;
    const completed = newProgress >= quest.target_count;

    if (existing) {
      await sb.from("muse_user_quests").update({
        progress: newProgress,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await sb.from("muse_user_quests").insert({
        user_id: profile.id,
        quest_id: quest.id,
        period_key: periodKey,
        progress: newProgress,
        target: quest.target_count,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      });
    }

    if (completed) {
      leveledUp = (await awardQuestXp(sb, profile.id, quest.xp_reward)) || leveledUp;
      await refreshMetaQuest(sb, profile.id);
      pushToProfile(profile.id, "Quest Complete!", `${quest.title} — tap to claim your reward`, "/muse/quests").catch(() => {});
    }

    results.push({
      action_key: quest.action_key,
      progress: newProgress,
      target: quest.target_count,
      completed,
      newlyCompleted: completed,
      quest: { title: quest.title, icon: quest.icon, reward_label: quest.reward_label },
    });
  }
  if (leveledUp) results.push({ leveledUp: true });

  return NextResponse.json({ success: true, results });
}

export async function questClaimQuest({ sb, profile, rest }: ActionContext) {
  if (!await checkRateUser(profile.id, "claim-quest", 12)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { quest_id } = rest;
  if (!quest_id || !UUID_RE.test(String(quest_id))) return NextResponse.json({ error: "quest_id required" }, { status: 400 });

  const { data: questDef }: { data: QuestRewardRow | null } = await sb.from("muse_quests").select("id, reward_type, reward_amount, reward_label, frequency").eq("id", quest_id).maybeSingle();
  if (!questDef) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  const periodKey = questPeriodKey(questDef.frequency);
  const { data: uq }: { data: { id: string; completed?: boolean | null; claimed?: boolean | null } | null } = await sb.from("muse_user_quests")
    .select("id, completed, claimed")
    .eq("user_id", profile.id).eq("quest_id", quest_id).eq("period_key", periodKey)
    .maybeSingle();

  if (!uq) return NextResponse.json({ error: "Quest not started" }, { status: 404 });
  if (!uq.completed) return NextResponse.json({ error: "Quest not completed" }, { status: 400 });
  if (uq.claimed) return NextResponse.json({ error: "Already claimed" }, { status: 400 });

  const { data: claimedRows, error: claimErr } = await sb.from("muse_user_quests")
    .update({ claimed: true, updated_at: new Date().toISOString() })
    .eq("id", uq.id).eq("claimed", false)
    .select("id");

  if (claimErr) return NextResponse.json({ error: "Could not claim reward" }, { status: 500 });
  if (!claimedRows?.length) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  let grantedUntil: string | undefined;
  if (questDef.reward_type === "superpower" || questDef.reward_type === "pro_day") {
    const months = questDef.reward_type === "pro_day"
      ? Math.max(1, Math.ceil(questDef.reward_amount / 30))
      : Math.max(1, questDef.reward_amount);
    const { data: prof }: { data: { tier?: string | null; pro_expires_at?: string | null } | null } = await sb.from("muse_profiles").select("tier, pro_expires_at").eq("id", profile.id).maybeSingle();
    const cur = prof?.pro_expires_at ? new Date(prof.pro_expires_at).getTime() : 0;
    const base = Math.max(Date.now(), cur);
    grantedUntil = new Date(base + months * 30 * 24 * 60 * 60 * 1000).toISOString();
    await sb.from("muse_profiles").update({ pro_expires_at: grantedUntil }).eq("id", profile.id);
  } else if (questDef.reward_type === "boost") {
    // Earned boost credits go into the user's boost inventory (spendable via
    // "boost" action; consumed by boost_expires_at on activation).
    const count = Math.max(1, Number(questDef.reward_amount || 1));
    const { data: prof }: { data: { boost_inventory?: number | null } | null } = await sb.from("muse_profiles").select("boost_inventory").eq("id", profile.id).maybeSingle();
    const cur = Number(prof?.boost_inventory || 0);
    await sb.from("muse_profiles").update({ boost_inventory: cur + count }).eq("id", profile.id);
  }

  return NextResponse.json({
    success: true,
    grantedUntil: grantedUntil || null,
    reward: { reward_type: questDef.reward_type, reward_amount: questDef.reward_amount, reward_label: questDef.reward_label },
  });
}

// Only reads `sb`/`profile` — narrowed from the full ActionContext so the
// claimable-quests cron can reuse the exact same push logic per user (the
// monolith registry still assigns it to ActionHandler; a full context is
// structurally assignable to this narrower parameter).
export async function questNotifyClaimable({ sb, profile }: Pick<ActionContext, "sb" | "profile">) {
  // Supabase's select parser infers the embedded muse_quests to-one join as an
  // array; the runtime rows carry an object (same pattern as get.ts/sessions).
  // Cast the awaited response to the row shape the loop reads, erased at runtime.
  const { data: claimable }: { data: ClaimableQuestRow[] | null } = (await sb.from("muse_user_quests")
    .select("quest_id, muse_quests(title, reward_label)")
    .eq("user_id", profile.id)
    .eq("completed", true)
    .eq("claimed", false)) as unknown as { data: ClaimableQuestRow[] | null };
  if (!claimable?.length) return NextResponse.json({ notified: 0 });
  let notified = 0;
  for (const uq of claimable) {
    const questTitle = uq.muse_quests?.title || "Quest";
    const rewardLabel = uq.muse_quests?.reward_label || "reward";
    pushToProfile(profile.id, "Quest Complete!", `${questTitle} — claim your ${rewardLabel}`, "/muse/quests").catch(() => {});
    notified++;
  }
  return NextResponse.json({ notified });
}
