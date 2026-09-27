import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demo-mode";
import { savedSearchAlerts } from "@/lib/muse-actions/misc";

/**
 * Saved-search alert sweep.
 *
 * `saved-search-alerts` (lib/muse-actions/misc.ts) is single-profile scoped —
 * it reads the caller's own saved searches and pushes a notification for each
 * one that has newly-listed profiles matching it since `last_notified_at`.
 * Nothing called it, so saved searches never surfaced. This cron fans it out:
 * collect the distinct owners of saved searches, then run the SAME handler
 * per user. The handler already advances `last_notified_at` when it finds
 * matches, so repeat runs can't re-alert the same profiles — no extra state
 * or dedupe column needed.
 */
const SEARCH_BATCH = 1000;
const USER_BATCH = 50;

export async function GET(req: NextRequest) {
  // Same fail-closed gate as sibling crons (checkins/capture-bookings/
  // storage-cleanup/purge-deleted-accounts): an unset secret must 401, not
  // degrade to "Bearer undefined".
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoMode()) return NextResponse.json({ success: true, demo: true, users: 0, alerts: 0 });

  const sb = getServiceClient();
  try {
    const { data: searches, error } = await sb
      .from("muse_saved_searches")
      .select("user_id")
      .order("created_at", { ascending: false })
      .limit(SEARCH_BATCH);
    if (error) throw error;

    const userIds = Array.from(new Set((searches || []).map((row: { user_id: string }) => row.user_id).filter(Boolean))).slice(0, USER_BATCH);

    let users = 0;
    let alerts = 0;
    for (const userId of userIds) {
      try {
        const res = await savedSearchAlerts({ sb, profile: { id: userId } });
        const body = await res.json().catch(() => ({}));
        const found = Array.isArray(body.alerts) ? body.alerts.length : 0;
        if (found > 0) {
          users++;
          alerts += found;
        }
      } catch (userError) {
        // One user's failure must not abort the whole sweep.
        console.error("[cron] saved-search-alerts failed for user", userId, userError);
      }
    }

    return NextResponse.json({ success: true, users, alerts, checked: userIds.length });
  } catch (error) {
    console.error("[cron] saved-search-alerts failed", error);
    return NextResponse.json({ error: "Saved search alerts failed" }, { status: 500 });
  }
}
