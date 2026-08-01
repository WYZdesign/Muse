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
    // Verify this is a Vercel Cron invocation (not a random GET).
    if (req.headers.get("x-vercel-cron") !== "1") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        snapshots[table] = error ? { error: error.message } : { count: count ?? 0 };
      } catch {
        snapshots[table] = { count: "query failed" };
      }
    }

    // Grab the latest messages for a content-level checkpoint.
    try {
      const { data: messages } = await sb
        .from("muse_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      snapshots["_recent_messages"] = messages || [];
    } catch {
      snapshots["_recent_messages"] = [];
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...snapshots });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
