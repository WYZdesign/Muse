import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demo-mode";
import { questNotifyClaimable } from "@/lib/muse-actions/quests";

/**
 * Claimable-quest reminder sweep.
 *
 * `notify-claimable-quests` (lib/muse-actions/quests.ts) is single-profile
 * scoped — it pushes a "claim your reward" alert for each of the caller's
 * completed-but-unclaimed quests. It had no trigger at all, and a per-user
 * handler can't sweep by itself, so this cron supplies the missing bulk
 * discovery: collect the distinct users with claimable quests, then run the
 * SAME handler once per user.
 *
 * Runs weekly (see vercel.json) — a reminder cadence, not a firehose. The
 * moment-of-completion push is already owned by questTrackQuest / the quest
 * engine's notifyQuestComplete; this only catches members who haven't opened
 * the Quests panel since a reward became claimable.
 */
const ROW_BATCH = 1000;
const USER_BATCH = 50;

export async function GET(req: NextRequest) {
  // Same fail-closed gate as sibling crons: an unset secret must 401.
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoMode()) return NextResponse.json({ success: true, demo: true, users: 0, notified: 0 });

  const sb = getServiceClient();
  try {
    const { data: claimable, error } = await sb
      .from("muse_user_quests")
      .select("user_id")
      .eq("completed", true)
      .eq("claimed", false)
      .order("completed_at", { ascending: false })
      .limit(ROW_BATCH);
    if (error) throw error;

    const userIds = Array.from(new Set((claimable || []).map((row: { user_id: string }) => row.user_id).filter(Boolean))).slice(0, USER_BATCH);

    let users = 0;
    let notified = 0;
    for (const userId of userIds) {
      try {
        const res = await questNotifyClaimable({ sb, profile: { id: userId } });
        const body = await res.json().catch(() => ({}));
        const count = Number(body.notified) || 0;
        if (count > 0) {
          users++;
          notified += count;
        }
      } catch (userError) {
        // One user's failure must not abort the whole sweep.
        console.error("[cron] notify-claimable-quests failed for user", userId, userError);
      }
    }

    return NextResponse.json({ success: true, users, notified, checked: userIds.length });
  } catch (error) {
    console.error("[cron] notify-claimable-quests failed", error);
    return NextResponse.json({ error: "Claimable quest notifications failed" }, { status: 500 });
  }
}
