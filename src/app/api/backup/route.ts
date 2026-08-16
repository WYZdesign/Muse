import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Daily backup endpoint hit by Vercel cron. Dumps key table counts +
 * the most recent 50 messages as a JSON snapshot. To restore, the data
 * is already stored in Supabase — this is a safety snapshot.
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (same pattern as checkins) — a spoofable header is not auth.
    const authHeader = req.headers.get("authorization");
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (!process.env.CRON_SECRET || authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getServiceClient();
    const snapshots: Record<string, unknown> = {};
    const tables = [
      "muse_profiles", "muse_messages", "muse_matches", "muse_feed_posts",
      "muse_briefs", "muse_forum_posts", "muse_notifications", "muse_reports",
      "muse_blocks", "muse_connections", "muse_bookings",
      "muse_push_subscriptions", "muse_communities", "muse_community_members",
    ];

    for (const table of tables) {
      try {
        const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
        snapshots[table] = error ? { error: "query failed" } : { count: count ?? 0 };
      } catch {
        snapshots[table] = { count: "query failed" };
      }
    }

    // Content checkpoint: message COUNT only — never return message bodies
    // (PII). This endpoint is a health/summary ping, not a restore source.
    try {
      const { count, error } = await sb.from("muse_messages").select("*", { count: "exact", head: true });
      snapshots["_message_count"] = error ? { error: "query failed" } : { count: count ?? 0 };
    } catch {
      snapshots["_message_count"] = { count: "query failed" };
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...snapshots });
  } catch (e: unknown) {
    console.error("[backup] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
