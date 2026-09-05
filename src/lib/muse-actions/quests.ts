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

export async function questGetQuests({ sb, profile }: ActionContext) {
  const { data: quests } = await sb.from("muse_quests").select("*").eq("active", true).order("sort_order");
  if (!quests) return NextResponse.json({ quests: [], xp: { total_xp: 0, level: 1 } });

  const { data: userQuests } = await sb.from("muse_user_quests")
    .select("quest_id, progress, target, completed, claimed, period_key")
    .eq("user_id", profile.id);

  const { data: xpData } = await sb.from("muse_user_xp").select("total_xp, level").eq("user_id", profile.id).maybeSingle();

  const progressMap: Record<string, any> = {};
  for (const uq of userQuests || []) {
    progressMap[`${uq.quest_id}:${uq.period_key}`] = uq;
  }

  const enriched = quests.map((q: any) => {
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

  const { data: questDefs } = await sb.from("muse_quests")
    .select("*").eq("active", true).in("action_key", clientKeys);
  if (!questDefs?.length) return NextResponse.json({ success: true, noQuest: true });

  const results: any[] = [];
  let leveledUp = false;
  for (const quest of questDefs) {
    const periodKey = questPeriodKey(quest.frequency);

    const { data: existing } = await sb.from("muse_user_quests")
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

  const { data: questDef } = await sb.from("muse_quests").select("id, reward_type, reward_amount, reward_label, frequency").eq("id", quest_id).maybeSingle();
  if (!questDef) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  const periodKey = questPeriodKey(questDef.frequency);
  const { data: uq } = await sb.from("muse_user_quests")
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
    const { data: prof } = await sb.from("muse_profiles").select("tier, pro_expires_at").eq("id", profile.id).maybeSingle();
    const cur = prof?.pro_expires_at ? new Date(prof.pro_expires_at).getTime() : 0;
    const base = Math.max(Date.now(), cur);
    grantedUntil = new Date(base + months * 30 * 24 * 60 * 60 * 1000).toISOString();
    await sb.from("muse_profiles").update({ pro_expires_at: grantedUntil }).eq("id", profile.id);
  }

  return NextResponse.json({
    success: true,
    grantedUntil: grantedUntil || null,
    reward: { reward_type: questDef.reward_type, reward_amount: questDef.reward_amount, reward_label: questDef.reward_label },
  });
}
