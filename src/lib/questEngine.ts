import { getServiceClient } from "@/lib/supabase";

type SupabaseClient = ReturnType<typeof getServiceClient>;

/** Period bucket for quest progress. Weekly buckets are keyed by the Monday
 *  (UTC) date so weeks roll over cleanly; 'once' and 'lifetime' never reset. */
export function questPeriodKey(frequency: string): string {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  if (frequency === "weekly") {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const mondayOffset = (d.getDay() + 6) % 7; // Mon=0..Sun=6
    d.setDate(d.getDate() - mondayOffset);
    return `weekly:${d.toISOString().slice(0, 10)}`;
  }
  if (frequency === "monthly") return `monthly:${day.slice(0, 7)}`;
  if (frequency === "lifetime" || frequency === "once") return "lifetime:all";
  return `daily:${day}`;
}

/** Persist a "quest complete" notification so server-side completions
 *  (match/book/verify/referral etc.) surface in the bell — client-tracked
 *  actions already toast, but these would otherwise be silent. */
export async function notifyQuestComplete(sb: SupabaseClient, userId: string, title: string): Promise<void> {
  try {
    await sb.from("muse_notifications").insert({
      user_id: userId, type: "quest",
      body: `⭐ Quest complete: ${title} — claim your reward in Settings → Quests`,
      read: false,
    });
  } catch { /* best-effort */ }
}

/** Set ABSOLUTE progress on every active quest with this action_key
 *  (lifetime period). Used for level-based and meta quests. */
export async function setQuestProgress(sb: SupabaseClient, profileId: string, actionKey: string, absolute: number): Promise<void> {
  const { data: quests } = await sb.from("muse_quests").select("*").eq("active", true).eq("action_key", actionKey);
  for (const quest of quests || []) {
    const periodKey = questPeriodKey(quest.frequency);
    const clamped = Math.min(Math.max(0, Math.floor(absolute)), quest.target_count);
    const completed = clamped >= quest.target_count;
    const { data: existing } = await sb.from("muse_user_quests")
      .select("id, progress, completed").eq("user_id", profileId).eq("quest_id", quest.id).eq("period_key", periodKey).maybeSingle();
    if (existing?.completed) continue;
    if (existing && existing.progress === clamped && !completed) continue;
    if (existing) {
      await sb.from("muse_user_quests").update({
        progress: clamped, completed,
        completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await sb.from("muse_user_quests").insert({
        user_id: profileId, quest_id: quest.id, period_key: periodKey,
        progress: clamped, target: quest.target_count, completed,
        completed_at: completed ? new Date().toISOString() : null,
      });
    }
    if (completed && quest.xp_reward > 0) {
      // Meta quests recompute their own count after being marked complete —
      // guard against recursion by skipping the recount when setting meta itself.
      if (actionKey !== "meta_quests") await refreshMetaQuest(sb, profileId);
      await awardQuestXp(sb, profileId, quest.xp_reward);
    }
    if (completed) await notifyQuestComplete(sb, profileId, quest.title);
  }
}

/** Award XP for a completed quest; handles level-ups and cascades into
 *  reach_level + meta_quests quests. Idempotent per completion. */
export async function awardQuestXp(sb: SupabaseClient, profileId: string, xpReward: number): Promise<boolean> {
  const { data: xpRow } = await sb.from("muse_user_xp").select("total_xp, level").eq("user_id", profileId).maybeSingle();
  const currentXp = xpRow?.total_xp || 0;
  const newXp = currentXp + xpReward;
  const prevLevel = Math.floor(Math.sqrt(currentXp / 50)) + 1;
  const newLevel = Math.floor(Math.sqrt(newXp / 50)) + 1;
  await sb.from("muse_user_xp").upsert({ user_id: profileId, total_xp: newXp, level: newLevel, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (newLevel > prevLevel) await setQuestProgress(sb, profileId, "reach_level", newLevel);
  return newLevel > prevLevel;
}

/** Recompute total-completed-quests meta progress. */
export async function refreshMetaQuest(sb: SupabaseClient, profileId: string): Promise<void> {
  const { count } = await sb.from("muse_user_quests")
    .select("id", { count: "exact", head: true }).eq("user_id", profileId).eq("completed", true);
  await setQuestProgress(sb, profileId, "meta_quests", count || 0);
}

/** Increment (+1) progress on every active quest with this action_key.
 *  Server-side events call this: match, book_session, host_session,
 *  complete_session, complete_host, get_verified, referral_signup. */
export async function bumpQuest(sb: SupabaseClient, profileId: string, actionKey: string): Promise<void> {
  try {
    const { data: quests } = await sb.from("muse_quests").select("*").eq("active", true).eq("action_key", actionKey);
    let anyCompleted = false;
    for (const quest of quests || []) {
      const periodKey = questPeriodKey(quest.frequency);
      const { data: existing } = await sb.from("muse_user_quests")
        .select("id, progress, completed").eq("user_id", profileId).eq("quest_id", quest.id).eq("period_key", periodKey).maybeSingle();
      if (existing?.completed) continue;
      const newProgress = (existing?.progress || 0) + 1;
      const completed = newProgress >= quest.target_count;
      if (existing) {
        await sb.from("muse_user_quests").update({
          progress: newProgress, completed,
          completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await sb.from("muse_user_quests").insert({
          user_id: profileId, quest_id: quest.id, period_key: periodKey,
          progress: newProgress, target: quest.target_count, completed,
          completed_at: completed ? new Date().toISOString() : null,
        });
      }
      if (completed) {
        anyCompleted = true;
        await notifyQuestComplete(sb, profileId, quest.title);
      }
    }
    if (anyCompleted) {
      // Award XP once per bump using the highest tier reward for this key —
      // slight over-award vs tracking per-tier ledgers, but never under-awards.
      const { data: tiers } = await sb.from("muse_quests").select("xp_reward").eq("action_key", actionKey).eq("active", true);
      const maxXp = Math.max(0, ...(tiers || []).map((q: any) => q.xp_reward || 0));
      if (maxXp > 0) await awardQuestXp(sb, profileId, maxXp);
      await refreshMetaQuest(sb, profileId);
    }
  } catch { /* quest failures must never break the primary action */ }
}

/** Set ABSOLUTE quest progress for referral signups using a lifetime count.
 *  Unlike bumpQuest (which increments +1), referral signups use the total
 *  count of successful referrals as the absolute progress value. */
export async function setReferralQuestProgress(sb: SupabaseClient, referrerId: string): Promise<void> {
  try {
    const { count: signupCount } = await sb.from("muse_referrals")
      .select("id", { count: "exact", head: true }).eq("referrer_id", referrerId);
    const { data: quests } = await sb.from("muse_quests").select("*").eq("active", true).eq("action_key", "referral_signup");
    for (const q of quests || []) {
      const clamped = Math.min(signupCount || 0, q.target_count);
      const completed = clamped >= q.target_count;
      const { data: existing } = await sb.from("muse_user_quests")
        .select("id, progress, completed").eq("user_id", referrerId).eq("quest_id", q.id).maybeSingle();
      if (existing?.completed) continue;
      if (existing) {
        await sb.from("muse_user_quests").update({
          progress: clamped, completed,
          completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await sb.from("muse_user_quests").insert({
          user_id: referrerId, quest_id: q.id, period_key: "lifetime:all",
          progress: clamped, target: q.target_count, completed,
          completed_at: completed ? new Date().toISOString() : null,
        });
      }
      if (completed && q.xp_reward > 0) {
        await awardQuestXp(sb, referrerId, q.xp_reward);
      }
      if (completed) await notifyQuestComplete(sb, referrerId, q.title);
    }
  } catch { /* quest bump is best-effort */ }
}
