// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — FEED, MOMENTS & BRIEFS
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// One of the six highest-traffic domains wyzmind's handoff flagged to save for
// last, grouped per wyzmind's own suggested split (feed.ts = feed/
// like-feed-post/feed-comment/create-moment/like-moment/brief/brief-apply).
// Handlers are exported functions; the monolith's ACTIONS registry still
// dispatches them under the same action names, so the POST URL and every
// frontend call site are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { checkRate } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/request-safety";
import { screenText } from "@/lib/aiModeration";
import { UUID_RE, validateInput, NextResponse, safeServerError, type ActionContext } from "./shared";

export const feedPost = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "feed", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const vErr = validateInput(rest);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
  const { text, image_url, image, img, media } = rest;
  if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
  const cleanText = sanitizeText(String(text).trim());
  if (!cleanText) return NextResponse.json({ error: "text required" }, { status: 400 });
  const screen = screenText(cleanText);
  if (screen.block) return NextResponse.json({ error: "Post blocked by safety policy", code: "SAFETY_BLOCK" }, { status: 403 });
  const mediaArr = Array.isArray(media) ? media : [];
  const resolvedImg = img || image_url || image || mediaArr[0] || "";
  const { error } = await sb.from("muse_feed_posts").insert({ author_id: profile.id, text: cleanText, img: resolvedImg, type: resolvedImg ? "photo" : "text" });
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const feedPostLike = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "like-feed-post", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { postId: feedPostId, liked } = rest;
  if (!feedPostId) return NextResponse.json({ error: "postId required" }, { status: 400 });
  if (typeof feedPostId === "number" || !UUID_RE.test(String(feedPostId))) return NextResponse.json({ success: true, demo: true });
  // Per-user dedup: track likes in muse_activity_log (existing table, type="feed_like")
  if (liked) {
    const { data: existing } = await sb.from("muse_activity_log").select("id").eq("user_id", profile.id).eq("target_id", String(feedPostId)).eq("type", "feed_like").maybeSingle();
    if (existing) return NextResponse.json({ success: true, alreadyLiked: true });
    await sb.from("muse_activity_log").insert({ user_id: profile.id, target_id: String(feedPostId), type: "feed_like" });
  } else {
    await sb.from("muse_activity_log").delete().eq("user_id", profile.id).eq("target_id", String(feedPostId)).eq("type", "feed_like");
  }
  const delta = liked ? 1 : -1;
  const { data: rpcResult, error: rpcErr } = await sb.rpc("atomic_like_count", { table_name: "muse_feed_posts", row_id: feedPostId, delta });
  let newLikes: number;
  if (!rpcErr && rpcResult !== null) {
    newLikes = Number(rpcResult);
  } else {
    const { data: feedPost } = await sb.from("muse_feed_posts").select("likes").eq("id", feedPostId).maybeSingle();
    if (!feedPost) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    newLikes = Math.max(0, (feedPost.likes || 0) + delta);
    const { error: updErr } = await sb.from("muse_feed_posts").update({ likes: newLikes }).eq("id", feedPostId);
    if (updErr) return safeServerError(updErr, "db op");
  }
  return NextResponse.json({ success: true, likes: newLikes });
};

export const feedCommentAdd = async ({ sb, profile, rest, ip }: ActionContext) => {
  // Feed comments were previously (incorrectly) posted via ACTIONS["forum"]
  // (type:"reply"), which inserts into muse_forum_replies keyed to
  // muse_forum_posts — a real feed post's id would fail that table's FK
  // constraint. This is the correct, dedicated action, inserting into
  // muse_feed_comments (which references muse_feed_posts) instead.
  if (!await checkRate(ip, "feed-comment", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { postId, text } = rest;
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });
  const cleanText = sanitizeText(String(text || ""), 2000);
  if (!cleanText) return NextResponse.json({ error: "text required" }, { status: 400 });
  const commentScreen = screenText(cleanText);
  if (commentScreen.block) {
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "feed_comment_blocked", details: { categories: commentScreen.categories } });
    return NextResponse.json({ error: "Reply blocked by safety policy", code: "SAFETY_BLOCK" }, { status: 403 });
  }
  // Demo/locally-created-only posts (numeric id, or not a real DB UUID) have no row to comment against.
  if (typeof postId === "number" || !UUID_RE.test(String(postId))) return NextResponse.json({ success: true, demo: true });
  const { error: insErr } = await sb.from("muse_feed_comments").insert({ post_id: postId, author_id: profile.id, text: cleanText });
  if (insErr) return safeServerError(insErr, "db op");
  // No dedicated RPC for a comments counter (atomic_like_count is hardcoded
  // to the `likes` column) — plain read-modify-write, same fallback shape
  // already used by like-feed-post when its RPC path is unavailable.
  const { data: feedPost } = await sb.from("muse_feed_posts").select("comments").eq("id", postId).maybeSingle();
  const newComments = (feedPost?.comments || 0) + 1;
  await sb.from("muse_feed_posts").update({ comments: newComments }).eq("id", postId);
  return NextResponse.json({ success: true, comments: newComments });
};

export const momentCreate = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "create-moment", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { text, img } = rest;
  const cleanText = sanitizeText(String(text || "").slice(0, 500));
  const resolvedImg = img && typeof img === "string" ? String(img).slice(0, 500) : "";
  if (!cleanText && !resolvedImg) return NextResponse.json({ error: "text or img required" }, { status: 400 });
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(resolvedImg);
  const { data, error } = await sb.from("muse_moments").insert({
    author_id: profile.id, text: cleanText, img: resolvedImg, type: resolvedImg ? (isVideo ? "video" : "photo") : "text",
  }).select("id, text, img, type, likes, comments, created_at, author_id(name, avatar)").single();
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, moment: data });
};

export const momentLike = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "like-moment", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { momentId, liked } = rest;
  if (!momentId) return NextResponse.json({ error: "momentId required" }, { status: 400 });
  if (typeof momentId === "number" || !UUID_RE.test(String(momentId))) return NextResponse.json({ success: true, demo: true });
  // Per-user dedup: track likes in muse_activity_log (existing table, type="moment_like")
  if (liked) {
    const { data: existing } = await sb.from("muse_activity_log").select("id").eq("user_id", profile.id).eq("target_id", String(momentId)).eq("type", "moment_like").maybeSingle();
    if (existing) return NextResponse.json({ success: true, alreadyLiked: true });
    await sb.from("muse_activity_log").insert({ user_id: profile.id, target_id: String(momentId), type: "moment_like" });
  } else {
    await sb.from("muse_activity_log").delete().eq("user_id", profile.id).eq("target_id", String(momentId)).eq("type", "moment_like");
  }
  const delta = liked ? 1 : -1;
  const { data: rpcResult, error: rpcErr } = await sb.rpc("atomic_like_count", { table_name: "muse_moments", row_id: momentId, delta });
  let newLikes: number;
  if (!rpcErr && rpcResult !== null) {
    newLikes = Number(rpcResult);
  } else {
    const { data: moment } = await sb.from("muse_moments").select("likes").eq("id", momentId).maybeSingle();
    if (!moment) return NextResponse.json({ error: "Moment not found" }, { status: 404 });
    newLikes = Math.max(0, (moment.likes || 0) + delta);
    const { error: updErr } = await sb.from("muse_moments").update({ likes: newLikes }).eq("id", momentId);
    if (updErr) return safeServerError(updErr, "db op");
  }
  return NextResponse.json({ success: true, likes: newLikes });
};

export const briefCreate = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "brief", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const vErr = validateInput(rest);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
  const { title, desc, budget, cat, tags, paid, rate } = rest;
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const cleanTitle = sanitizeText(String(title).trim(), 200);
  if (!cleanTitle) return NextResponse.json({ error: "title required" }, { status: 400 });
  const cleanDesc = sanitizeText(String(desc || ""), 2000);
  const briefScreen = screenText(`${cleanTitle} ${cleanDesc}`);
  if (briefScreen.block) {
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "brief_blocked", details: { categories: briefScreen.categories } });
    return NextResponse.json({ error: "Brief blocked by safety policy", code: "SAFETY_BLOCK" }, { status: 403 });
  }
  const { error } = await sb.from("muse_briefs").insert({ author_id: profile.id, title: cleanTitle, description: cleanDesc, budget: budget || "Negotiable", category: cat || "concept", tags: tags || [], paid: paid || false, rate: rate || "" });
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const briefApply = async ({ sb, profile, rest }: ActionContext) => {
  const { briefId } = rest;
  if (!briefId) return NextResponse.json({ error: "briefId required" }, { status: 400 });
  if (!UUID_RE.test(String(briefId))) return NextResponse.json({ success: true, demo: true });
  const { error } = await sb.from("muse_brief_applications").insert({ brief_id: briefId, user_id: profile.id });
  if (error) return safeServerError(error, "db op");
  try {
    const { data: prof } = await sb.from("muse_profiles").select("preferences").eq("id", profile.id).maybeSingle();
    const existing = Array.isArray(prof?.preferences?.appliedBriefs) ? prof.preferences.appliedBriefs : [];
    if (!existing.includes(briefId)) {
      await sb.from("muse_profiles").update({
        preferences: { ...(prof?.preferences || {}), appliedBriefs: [...existing, briefId] }
      }).eq("id", profile.id);
    }
  } catch { /* non-fatal — DB is source of truth, preferences is cache */ }
  await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "brief_apply", details: { brief_id: briefId } });
  return NextResponse.json({ success: true });
};
