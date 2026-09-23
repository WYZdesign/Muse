import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demo-mode";

/** Permanently purge accounts only after the published 30-day retention window. */
async function removeStorageTree(sb: ReturnType<typeof getServiceClient>, bucket: string, prefix: string): Promise<void> {
  const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  const files: string[] = [];
  const folders: string[] = [];
  for (const item of data || []) {
    const path = `${prefix}/${item.name}`;
    // Supabase storage returns null id for folder placeholders.
    if ((item as any).id) files.push(path); else folders.push(path);
  }
  if (files.length) {
    const { error: removeError } = await sb.storage.from(bucket).remove(files);
    if (removeError) throw removeError;
  }
  await Promise.all(folders.map((folder) => removeStorageTree(sb, bucket, folder)));
}

export async function GET(req: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoMode()) return NextResponse.json({ success: true, demo: true, purged: 0, failed: 0 });

  const sb = getServiceClient();
  try {
    const { data: accounts, error } = await sb.from("muse_profiles")
      .select("id, auth_id")
      .not("deletion_requested_at", "is", null)
      .lte("deletion_purge_after", new Date().toISOString())
      .limit(50);
    if (error) throw error;

    let purged = 0;
    let failed = 0;
    for (const account of accounts || []) {
      try {
        const id = account.id;
        // Uploads are always rooted by profile id. Remove both buckets before
        // deleting database references, so a failed storage cleanup leaves the
        // account retryable on the next cron rather than orphaning media.
        await Promise.all([
          removeStorageTree(sb, "muse-uploads", String(id)),
          removeStorageTree(sb, "muse-private", String(id)),
        ]);
        const results = await Promise.all([
          sb.from("muse_messages").delete().or(`sender_id.eq.${id},receiver_id.eq.${id}`),
          sb.from("muse_matches").delete().or(`user_id.eq.${id},target_id.eq.${id}`),
          sb.from("muse_feed_posts").delete().eq("author_id", id),
          sb.from("muse_briefs").delete().eq("author_id", id),
          sb.from("muse_brief_applications").delete().eq("user_id", id),
          sb.from("muse_forum_posts").delete().eq("author_id", id),
          sb.from("muse_forum_replies").delete().eq("user_id", id),
          sb.from("muse_connections").delete().or(`user_id.eq.${id},target_id.eq.${id}`),
          sb.from("muse_community_members").delete().eq("user_id", id),
          sb.from("muse_bookings").delete().eq("user_id", id),
          sb.from("muse_notifications").delete().or(`user_id.eq.${id},from_id.eq.${id}`),
          sb.from("muse_push_subscriptions").delete().eq("user_id", id),
          sb.from("muse_activity_log").delete().eq("user_id", id),
          sb.from("muse_reports").delete().eq("reporter_id", id),
          sb.from("muse_blocks").delete().or(`user_id.eq.${id},target_id.eq.${id}`),
          sb.from("muse_verification_sessions").delete().eq("user_id", id),
          sb.from("muse_message_requests").delete().or(`request_from.eq.${id},request_to.eq.${id}`),
          sb.from("muse_saved_searches").delete().eq("user_id", id),
          sb.from("muse_albums").delete().eq("profile_id", id),
        ]);
        const failure = results.find((result: any) => result.error)?.error;
        if (failure) throw failure;
        const { error: profileError } = await sb.from("muse_profiles").delete().eq("id", id);
        if (profileError) throw profileError;
        if (account.auth_id) {
          const { error: authError } = await sb.auth.admin.deleteUser(account.auth_id);
          if (authError) throw authError;
        }
        purged++;
      } catch (accountError) {
        failed++;
        console.error("[cron] account purge failed", account.id, accountError);
      }
    }
    return NextResponse.json({ success: true, purged, failed, checked: (accounts || []).length });
  } catch (error) {
    console.error("[cron] purge-deleted-accounts failed", error);
    return NextResponse.json({ error: "Account purge failed" }, { status: 500 });
  }
}
