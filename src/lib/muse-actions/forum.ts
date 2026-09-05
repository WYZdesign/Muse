// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — FORUM, REPORTS & BLOCKS
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// Last of the six highest-traffic domains wyzmind's handoff flagged to save for
// last. Handlers are exported functions; the monolith's ACTIONS registry still
// dispatches them under the same action names (forum's multi-verb dispatch via
// `rawType` is preserved as-is), so the POST URL and every frontend call site
// are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { checkRate, checkRateUser } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/request-safety";
import { screenText, moderateText } from "@/lib/aiModeration";
import { sendEmail, notify } from "@/lib/email";
import { UUID_RE, applyStrikeAndEscalate, validateInput, NextResponse, safeServerError, type ActionContext } from "./shared";

export const forumDispatch = async ({ sb, profile, rest, ip, rawType }: ActionContext) => {
  if (!await checkRate(ip, "forum", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const vErr = validateInput(rest);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
  const { title, body: forumBody, text, cat, postId } = rest;
  const forumType = rawType;
  if (forumType === "get-replies") {
    const { data: replies, error: replErr } = await sb.from("muse_forum_replies")
      .select("id, user_name, user_avatar, text, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (replErr) return safeServerError(replErr, "db op");
    const mapped = (replies || []).map((r: any) => ({
      author: r.user_name || "User",
      avatar: r.user_avatar || "",
      text: r.text || "",
      time: r.created_at ? new Date(r.created_at).toLocaleString() : "Just now",
    }));
    return NextResponse.json({ success: true, replies: mapped });
  }
  if (forumType === "reply") {
    const cleanText = sanitizeText(String(text || ""), 2000);
    const replyScreen = screenText(cleanText);
    if (replyScreen.block) {
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "forum_reply_blocked", details: { categories: replyScreen.categories } });
      return NextResponse.json({ error: "Reply blocked by safety policy", code: "SAFETY_BLOCK" }, { status: 403 });
    }
    const isStubPost = typeof postId === "number" || !UUID_RE.test(String(postId));
    if (isStubPost) return NextResponse.json({ success: true, demo: true });
    const { error } = await sb.from("muse_forum_replies").insert({ post_id: postId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar, text: cleanText });
    if (error) return safeServerError(error, "db op");
    return NextResponse.json({ success: true });
  }
  if (forumType === "vote") {
    const { direction } = rest;
    if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });
    const isStubVote = typeof postId === "number" || !UUID_RE.test(String(postId));
    if (isStubVote) return NextResponse.json({ success: true, demo: true });
    const delta = direction === "down" ? -1 : 1;
    const { data: post } = await sb.from("muse_forum_posts").select("votes").eq("id", postId).maybeSingle();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const newVotes = (post.votes || 0) + delta;
    const { error: updErr } = await sb.from("muse_forum_posts").update({ votes: newVotes }).eq("id", postId);
    if (updErr) return safeServerError(updErr, "db op");
    return NextResponse.json({ success: true, votes: newVotes });
  }
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const cleanTitle = sanitizeText(String(title).trim(), 200);
  if (!cleanTitle) return NextResponse.json({ error: "title required" }, { status: 400 });
  const cleanBody = sanitizeText(String(forumBody || ""), 5000);
  const postScreen = screenText(`${cleanTitle} ${cleanBody}`);
  if (postScreen.block) {
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "forum_post_blocked", details: { categories: postScreen.categories } });
    return NextResponse.json({ error: "Post blocked by safety policy", code: "SAFETY_BLOCK" }, { status: 403 });
  }
  const { error } = await sb.from("muse_forum_posts").insert({ author_id: profile.id, title: cleanTitle, body: cleanBody, category: cat || "General" });
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const reportCreate = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRateUser(profile.id, "report", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { target_id, target_type, reason, details } = rest;
  if (!target_id || !reason) return NextResponse.json({ error: "target_id and reason required" }, { status: 400 });
  if (target_id === profile.id) return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
  const isPostTarget = target_type === "feed_post" || target_type === "forum_post";
  if (!isPostTarget) {
    if (!UUID_RE.test(String(target_id))) return NextResponse.json({ success: true, demo: true });
    const { data: targetProfile } = await sb.from("muse_profiles").select("id").eq("id", target_id).maybeSingle();
    if (!targetProfile) return NextResponse.json({ error: "Target not found" }, { status: 400 });
  }
  let aiClassification: unknown = null;
  try {
    const verdict = await moderateText(`${reason} ${details || ""}`.trim());
    aiClassification = verdict;
  } catch { /* best-effort; never block report creation on AI */ }
  const { error } = await sb.from("muse_reports").insert({ reporter_id: profile.id, target_id, target_type: target_type || "user", reason, details: details || "", ai_classification: aiClassification });
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "report", details: { target_id, reason } });
  if (profile.email) sendEmail(notify(profile.email, "We received your report", "Report received", "Thanks for looking out for the community. Our safety team is reviewing your report.", "Muse Safety", "https://muse.wyzdesign.com/muse/safety")).catch(() => {});
  if (target_type === "user" || target_type === "match") {
    try {
      const { count: distinctReporters } = await sb.from("muse_reports")
        .select("reporter_id", { count: "exact", head: true })
        .eq("target_id", target_id);
      const { data: allReports } = await sb.from("muse_reports")
        .select("reporter_id")
        .eq("target_id", target_id)
        .limit(50);
      const distinct = new Set((allReports || []).map((r: any) => String(r.reporter_id))).size;
      if (distinct >= 3) {
        await applyStrikeAndEscalate(sb, target_id, {
          category: "standard",
          severity: "warning",
          reason: "Multiple user reports",
          details: `${distinct} distinct reporters flagged this account`,
        });
      }
    } catch { /* best-effort enforcement; never block report creation */ }
  }
  return NextResponse.json({ success: true });
};

export const userBlock = async ({ sb, profile, rest }: ActionContext) => {
  const { target_id } = rest;
  if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
  if (target_id === profile.id) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  const { data: target } = await sb.from("muse_profiles").select("id").eq("id", target_id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 400 });
  await sb.from("muse_blocks").upsert(
    { user_id: profile.id, target_id },
    { onConflict: "user_id,target_id", ignoreDuplicates: true }
  );
  return NextResponse.json({ success: true });
};

export const userUnblock = async ({ sb, profile, rest }: ActionContext) => {
  const { target_id } = rest;
  if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
  await sb.from("muse_blocks").delete().eq("user_id", profile.id).eq("target_id", target_id);
  return NextResponse.json({ success: true });
};

export const blocksGet = async ({ sb, profile }: ActionContext) => {
  const { data: blocks } = await sb.from("muse_blocks").select("target_id").eq("user_id", profile.id);
  return NextResponse.json({ blocked: blocks?.map((b: { target_id: string }) => b.target_id) || [] });
};
