// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — PROFILE
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// One of the six highest-traffic domains wyzmind's handoff flagged to save for
// last. Handler is an exported function; the monolith's ACTIONS registry still
// dispatches it under the same action name, so the POST URL and every frontend
// call site are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { sanitizeText } from "@/lib/request-safety";
import { checkRateUser } from "@/lib/rate-limit";
import { NextResponse, safeServerError, type ActionContext } from "./shared";

export const profileUpdate = async ({ sb, profile, rest }: ActionContext) => {
  const ALLOWED_PROFILE_FIELDS = ["name", "bio", "styles", "loc", "city", "type", "zodiac", "chinese", "mbti", "life_path", "looking", "avatar", "audience", "media_kit_url", "travel_dates", "availability_status", "budget_range", "travel_destinations"];
  const updates: Record<string, unknown> = {};
  for (const k of ALLOWED_PROFILE_FIELDS) {
    if (rest[k] !== undefined) updates[k] = rest[k];
  }
  if (typeof updates.name === "string") updates.name = sanitizeText(updates.name as string, 80);
  if (typeof updates.bio === "string") updates.bio = sanitizeText(updates.bio as string, 500);
  if (typeof updates.styles === "string") updates.styles = sanitizeText(updates.styles as string, 200);
  if (typeof updates.looking === "string") updates.looking = sanitizeText(updates.looking as string, 200);
  if (typeof updates.budget_range === "string") updates.budget_range = sanitizeText(updates.budget_range as string, 100);
  if (!Array.isArray(updates.travel_dates)) delete updates.travel_dates;
  if (typeof updates.travel_destinations === "string") {
    const raw = updates.travel_destinations as string;
    updates.travel_destinations = raw.split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 20);
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  const { error } = await sb.from("muse_profiles").update(updates).eq("id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const profileDelete = async ({ sb, profile, ip }: ActionContext) => {
  if (!await checkRateUser(profile.id, "delete-account", 1)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const pid = profile.id;
  await sb.from("muse_messages").delete().or(`sender_id.eq.${pid},receiver_id.eq.${pid}`);
  await sb.from("muse_matches").delete().or(`user_id.eq.${pid},target_id.eq.${pid}`);
  await sb.from("muse_feed_posts").delete().eq("author_id", pid);
  await sb.from("muse_briefs").delete().eq("author_id", pid);
  await sb.from("muse_forum_posts").delete().eq("author_id", pid);
  await sb.from("muse_forum_replies").delete().eq("user_id", pid);
  await sb.from("muse_connections").delete().or(`user_id.eq.${pid},target_id.eq.${pid}`);
  await sb.from("muse_community_members").delete().eq("user_id", pid);
  await sb.from("muse_bookings").delete().eq("user_id", pid);
  await sb.from("muse_notifications").delete().eq("user_id", pid);
  await sb.from("muse_blocks").delete().or(`user_id.eq.${pid},target_id.eq.${pid}`);
  await sb.from("muse_reports").delete().eq("reporter_id", pid);
  await sb.from("muse_push_subscriptions").delete().eq("user_id", pid);
  await sb.from("muse_message_requests").delete().or(`request_from.eq.${pid},request_to.eq.${pid}`);
  await sb.from("muse_saved_searches").delete().eq("user_id", pid);
  await sb.from("muse_activity_log").delete().eq("user_id", pid);
  await sb.from("muse_profiles").update({ name: "Deleted User", bio: "", avatar: "", photos: [], suspended: true, suspended_at: new Date().toISOString() }).eq("id", pid);
  return NextResponse.json({ success: true, message: "Account data deleted. Profile anonymized." });
};
