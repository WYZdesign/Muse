import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { safeServerError } from "@/lib/http";
import { checkRate, checkRateUser, clientIp } from "@/lib/rate-limit";
import { enforceRequestSafety, sanitizeText } from "@/lib/request-safety";
import { askMuseAI } from "@/lib/aiDocs";
import { screenText, moderateText } from "@/lib/aiModeration";
import { parseRateToCents } from "@/lib/money";
import { sendEmail, notify } from "@/lib/email";
import { pushToProfile } from "@/lib/push";
import { scanWithRekognition, logScan } from "@/lib/contentScan";
import { bumpQuest, questPeriodKey, awardQuestXp, setQuestProgress, refreshMetaQuest, bumpLoginStreak } from "@/lib/questEngine";
import Stripe from "stripe";
import {
  UUID_RE, getAuthUser, emailProfile, STRIKE_SUSPENSION_THRESHOLD, applyStrikeAndEscalate,
  getAuthedProfile, bearerTokenFromReq, isAdminEmail, MAX_LENGTHS, validateInput, isConvoParticipant,
  type ActionContext, type ActionHandler,
} from "@/lib/muse-actions/shared";

// ══════════════════════════════════════════════════════════════════════════════
// ACTION HANDLER REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

const ACTIONS: Record<string, ActionHandler> = {};

// ═══ PROFILE ═══

ACTIONS["profile"] = async ({ sb, profile, rest }) => {
  const ALLOWED_PROFILE_FIELDS = ["name", "bio", "styles", "loc", "city", "type", "zodiac", "chinese", "mbti", "life_path", "looking", "avatar", "audience"];
  const updates: Record<string, unknown> = {};
  for (const k of ALLOWED_PROFILE_FIELDS) {
    if (rest[k] !== undefined) updates[k] = rest[k];
  }
  if (typeof updates.name === "string") updates.name = sanitizeText(updates.name as string, 80);
  if (typeof updates.bio === "string") updates.bio = sanitizeText(updates.bio as string, 500);
  if (typeof updates.styles === "string") updates.styles = sanitizeText(updates.styles as string, 200);
  if (typeof updates.looking === "string") updates.looking = sanitizeText(updates.looking as string, 200);
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  const { error } = await sb.from("muse_profiles").update(updates).eq("id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

// ═══ MATCHING & DISCOVERY ═══

ACTIONS["match"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "match", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { target_id } = rest;
  if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
  if (target_id === profile.id) return NextResponse.json({ error: "Cannot match yourself" }, { status: 400 });
  if (!UUID_RE.test(String(target_id))) {
    await sb.from("muse_notifications").insert({ user_id: profile.id, type: "match", body: "You matched with a new creative!", read: false });
    return NextResponse.json({ success: true, demo: true });
  }
  const { data: target } = await sb.from("muse_profiles").select("id, suspended").eq("id", target_id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 400 });
  if (target.suspended) return NextResponse.json({ error: "Unable to match with this user" }, { status: 403 });
  const { data: matchBlock } = await sb.from("muse_blocks").select("id").or(`and(user_id.eq.${profile.id},target_id.eq.${target_id}),and(user_id.eq.${target_id},target_id.eq.${profile.id})`).limit(1).maybeSingle();
  if (matchBlock) return NextResponse.json({ error: "Unable to match with this user" }, { status: 403 });
  const { error } = await sb.from("muse_matches").upsert(
    { user_id: profile.id, target_id },
    { onConflict: "user_id,target_id", ignoreDuplicates: true }
  );
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "match", details: { target_id } });
  await sb.from("muse_notifications").insert({ user_id: target_id, from_id: profile.id, type: "match", body: `${profile.name} matched with you!`, read: false });
  await emailProfile(sb, target_id, "Someone matched with you ✦", "New match on Muse", `${profile.name} matched with you. Open Muse to say hi.`, "See who it is", "https://muse.wyzdesign.com/muse", "match");
  await bumpQuest(sb, profile.id, "match");
  return NextResponse.json({ success: true });
};

ACTIONS["unmatch"] = async ({ sb, profile, rest }) => {
  const { target_id } = rest;
  if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
  if (UUID_RE.test(String(target_id))) {
    await sb.from("muse_matches").delete().eq("user_id", profile.id).eq("target_id", target_id);
    await sb.from("muse_matches").delete().eq("user_id", target_id).eq("target_id", profile.id);
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "unmatch", details: { target_id } });
  }
  return NextResponse.json({ success: true });
};

ACTIONS["track-view"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRateUser(profile.id, "track-view", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { target_id } = rest;
  if (!target_id || target_id === profile.id) return NextResponse.json({ success: true });
  if (!UUID_RE.test(String(target_id))) return NextResponse.json({ success: true, demo: true });
  const { data: cur } = await sb.from("muse_profiles").select("views_count").eq("id", target_id).maybeSingle();
  const next = ((cur as any)?.views_count || 0) + 1;
  const { error } = await sb.from("muse_profiles").update({ views_count: next }).eq("id", target_id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

// ═══ MESSAGING ═══

ACTIONS["message"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRateUser(profile.id, "message", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const vErr = validateInput(rest);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
  const { toId, text, image_url, img, client_msg_id } = rest;
  const imageUrl = image_url || img;
  if (!text?.trim() && !imageUrl) return NextResponse.json({ error: "text or image required" }, { status: 400 });
  if (!toId) return NextResponse.json({ error: "toId required" }, { status: 400 });
  if (UUID_RE.test(String(toId))) {
    const { data: msgBlock } = await sb.from("muse_blocks").select("id").or(`and(user_id.eq.${profile.id},target_id.eq.${toId}),and(user_id.eq.${toId},target_id.eq.${profile.id})`).limit(1).maybeSingle();
    if (msgBlock) return NextResponse.json({ error: "Unable to message this user" }, { status: 403 });
  }
  const [userA, userB] = [String(profile.id), String(toId)].sort();
  const { data: mutualMatch } = await sb.from("muse_matches")
    .select("id").eq("user_id", profile.id).eq("target_id", toId).maybeSingle();
  const { data: reverseMatch } = await sb.from("muse_matches")
    .select("id").eq("user_id", toId).eq("target_id", profile.id).maybeSingle();
  const hasMatch = !!mutualMatch && !!reverseMatch;

  let sameCommunity = false;
  if (!hasMatch) {
    const { data: myCommunities } = await sb.from("muse_community_members")
      .select("community_id").eq("user_id", profile.id);
    const { data: theirCommunities } = await sb.from("muse_community_members")
      .select("community_id").eq("user_id", toId);
    if (myCommunities?.length && theirCommunities?.length) {
      const myIds = new Set(myCommunities.map(c => c.community_id));
      sameCommunity = theirCommunities.some(c => myIds.has(c.community_id));
    }
  }

  if (!hasMatch && !sameCommunity) {
    return NextResponse.json({ error: "You need to match with this person before messaging, or join a shared community." }, { status: 403 });
  }
  const cleanText = sanitizeText(String(text || "").trim());
  if (!cleanText && !imageUrl) return NextResponse.json({ error: "text or image required" }, { status: 400 });
  const screen = cleanText ? screenText(cleanText) : { block: false, categories: [] as string[] };
  if (screen.block) {
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "message_blocked", details: { categories: screen.categories } });
    return NextResponse.json({ error: "Message blocked by safety policy", code: "SAFETY_BLOCK" }, { status: 403 });
  }
  const lower = cleanText.toLowerCase();
  const hasPayment = /\$[\d]+|\bpay\b|\bcompensation\b|\brate\b|\bbudget\b|\bfee\b|\bcharged?\b/i.test(lower);
  const hasNsfw = /\bnude\b|\bnudity\b|\bnsfw\b|\bnsf[ww]\b|\bexplicit\b|\bboudoir\b|\bpenetrat\b|\bsexual\b|\berotic\b|\btopless\b|\bundressed\b|\bintimate\b|\bsensual\b|\badult\b/i.test(lower);
  if (hasPayment && hasNsfw) {
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "disclosure_required", details: { to: toId } });
    return NextResponse.json({ error: "Disclosure required before discussing paid NSFW shoots", code: "DISCLOSURE_REQUIRED" }, { status: 409 });
  }
  const matchId = [profile.id, String(toId)].sort().join("__");
  const { error } = await sb.from("muse_messages").insert({
    match_id: matchId,
    sender_id: profile.id,
    receiver_id: String(toId),
    text: cleanText,
    img: img || image_url || "",
    client_msg_id: typeof client_msg_id === "string" ? client_msg_id.slice(0, 120) : undefined,
  });
  if (error && (error as { code?: string }).code !== "23505") return safeServerError(error, "message insert");
  await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "message", details: { to: toId } });
  if (UUID_RE.test(String(toId))) {
    await sb.from("muse_notifications").insert({ user_id: String(toId), from_id: profile.id, type: "message", body: `${profile.name} sent you a message`, read: false });
  }
  await emailProfile(sb, String(toId), "New message on Muse ✦", "You have a new message", `${profile.name} sent you a message.`, "Read it", "https://muse.wyzdesign.com/muse", "message");
  return NextResponse.json({ success: true, match_id: matchId });
};

// ═══ FEED & MOMENTS ═══

ACTIONS["feed"] = async ({ sb, profile, rest, ip }) => {
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

ACTIONS["like-feed-post"] = async ({ sb, profile, rest, ip }) => {
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

ACTIONS["feed-comment"] = async ({ sb, profile, rest, ip }) => {
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

ACTIONS["create-moment"] = async ({ sb, profile, rest, ip }) => {
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

ACTIONS["like-moment"] = async ({ sb, profile, rest, ip }) => {
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

// ═══ BRIEFS ═══

ACTIONS["brief"] = async ({ sb, profile, rest, ip }) => {
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

ACTIONS["brief-apply"] = async ({ sb, profile, rest }) => {
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

// ═══ FORUM ═══

ACTIONS["forum"] = async ({ sb, profile, rest, ip, rawType }) => {
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

// ═══ SAFETY & MODERATION ═══

ACTIONS["report"] = async ({ sb, profile, rest, ip }) => {
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

ACTIONS["block"] = async ({ sb, profile, rest }) => {
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

ACTIONS["unblock"] = async ({ sb, profile, rest }) => {
  const { target_id } = rest;
  if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
  await sb.from("muse_blocks").delete().eq("user_id", profile.id).eq("target_id", target_id);
  return NextResponse.json({ success: true });
};

ACTIONS["get-blocks"] = async ({ sb, profile }) => {
  const { data: blocks } = await sb.from("muse_blocks").select("target_id").eq("user_id", profile.id);
  return NextResponse.json({ blocked: blocks?.map((b: { target_id: string }) => b.target_id) || [] });
};

// ═══ COMMUNITIES ═══

ACTIONS["join-community"] = async ({ sb, profile, rest }) => {
  const { communityId } = rest;
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
  const isStub = !UUID_RE.test(String(communityId));
  if (isStub) return NextResponse.json({ success: true, demo: true });
  const { data: community } = await sb.from("muse_communities").select("id").eq("id", communityId).maybeSingle();
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 400 });
  await sb.from("muse_community_members").upsert(
    { community_id: communityId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar },
    { onConflict: "community_id,user_id", ignoreDuplicates: true }
  );
  const { count } = await sb.from("muse_community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId);
  await sb.from("muse_communities").update({ member_count: (count ?? 0) }).eq("id", communityId);
  return NextResponse.json({ success: true });
};

ACTIONS["leave-community"] = async ({ sb, profile, rest }) => {
  const { communityId } = rest;
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
  const isStub = !UUID_RE.test(String(communityId));
  if (isStub) return NextResponse.json({ success: true, demo: true });
  const { data: community } = await sb.from("muse_communities").select("id").eq("id", communityId).maybeSingle();
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 400 });
  await sb.from("muse_community_members").delete().eq("community_id", communityId).eq("user_id", profile.id);
  return NextResponse.json({ success: true });
};

ACTIONS["create-community"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "create-community", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { name, description, category, isNsfw } = rest;
  const cleanName = sanitizeText(String(name || "").trim(), 80);
  if (!cleanName) return NextResponse.json({ error: "name required" }, { status: 400 });
  const cleanDesc = sanitizeText(String(description || ""), 500);
  const { data, error } = await sb.from("muse_communities").insert({
    name: cleanName,
    description: cleanDesc,
    img: sanitizeText(String(rest.img || ""), 500),
    category: sanitizeText(String(category || "general"), 40),
    is_nsfw: Boolean(isNsfw),
    member_count: 1,
    created_by: profile.id,
  }).select().single();
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_community_members").upsert(
    { community_id: data.id, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar },
    { onConflict: "community_id,user_id", ignoreDuplicates: true }
  );
  return NextResponse.json({ success: true, community: data });
};

// ═══ EVENTS & RSVP ═══

ACTIONS["create-event"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "create-event", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { title, description, date, location, category } = rest;
  const cleanTitle = sanitizeText(String(title || "").trim(), 120);
  if (!cleanTitle) return NextResponse.json({ error: "title required" }, { status: 400 });
  const { data, error } = await sb.from("muse_events").insert({
    title: cleanTitle,
    description: sanitizeText(String(description || ""), 500),
    date: sanitizeText(String(date || ""), 100),
    location: sanitizeText(String(location || ""), 200),
    category: sanitizeText(String(category || "General"), 40),
    img: sanitizeText(String(rest.img || ""), 500),
    created_by: profile.id,
    attendees: 0,
  }).select().single();
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, event: data });
};

ACTIONS["rsvp"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "rsvp", 15)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { eventId } = rest;
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });
  const isStub = !UUID_RE.test(String(eventId));
  if (isStub) return NextResponse.json({ success: true, demo: true });
  const { data: existing } = await sb.from("muse_rsvps").select("id").eq("event_id", eventId).eq("user_id", profile.id).maybeSingle();
  if (existing) return NextResponse.json({ success: true, alreadyRsvpd: true });
  const { error } = await sb.from("muse_rsvps").insert({ event_id: eventId, user_id: profile.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
};

ACTIONS["cancel-rsvp"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "cancel-rsvp", 15)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { eventId } = rest;
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });
  const isStub = !UUID_RE.test(String(eventId));
  if (isStub) return NextResponse.json({ success: true, demo: true });
  await sb.from("muse_rsvps").delete().eq("event_id", eventId).eq("user_id", profile.id);
  return NextResponse.json({ success: true });
};

// ═══ SESSIONS & BOOKINGS ═══

ACTIONS["book-session"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRateUser(profile.id, "book-session", 15)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { sessionId, hostId } = rest;
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  const { data: booker } = await sb.from("muse_profiles").select("age_verified").eq("id", profile.id).maybeSingle();
  if (!booker?.age_verified) {
    return NextResponse.json({ error: "Identity verification required", code: "VERIFICATION_REQUIRED" }, { status: 403 });
  }
  if (!UUID_RE.test(String(sessionId))) return NextResponse.json({ success: true, demo: true });
  const { data: session } = await sb.from("muse_sessions").select("id, host_id").eq("id", sessionId).maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 400 });
  // Use the session's own host_id — never trust client-supplied hostId
  const effectiveHostId = (session as any).host_id || null;
  if (effectiveHostId) {
    const { data: host } = await sb.from("muse_profiles").select("id").eq("id", effectiveHostId).maybeSingle();
    if (!host) return NextResponse.json({ error: "Host not found" }, { status: 400 });
  }
  await sb.from("muse_bookings").upsert(
    { session_id: sessionId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar, host_id: effectiveHostId, status: "pending" },
    { onConflict: "session_id,user_id", ignoreDuplicates: true }
  );
  await sb.from("muse_notifications").insert({ user_id: effectiveHostId || profile.id, from_id: profile.id, type: "booking", body: `${profile.name} requested to book a session`, read: false });
  if (effectiveHostId) await emailProfile(sb, effectiveHostId, "New booking request ✦", "Someone wants to book you", `${profile.name} requested to book one of your sessions.`, "Review booking", "https://muse.wyzdesign.com/muse");
  await bumpQuest(sb, profile.id, "book_session");
  return NextResponse.json({ success: true });
};

ACTIONS["create-session"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "create-session", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { title, description, type, rate, duration, skills, date, location, img } = rest;
  if (!title || !String(title).trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const rawRate = String(rate || "").trim();
  if (rawRate && parseRateToCents(rawRate) === null) {
    return NextResponse.json({ error: "Rate must be a single dollar amount (e.g. \"$150\" or \"150\"). Remove ranges or extra text." }, { status: 400 });
  }
  const { data, error } = await sb.from("muse_sessions").insert({
    host_id: profile.id,
    title: sanitizeText(String(title).trim(), 200),
    description: sanitizeText(String(description || ""), 1000),
    type: sanitizeText(String(type || "Photoshoot"), 50),
    rate: sanitizeText(rawRate, 50),
    duration: sanitizeText(String(duration || "60 min"), 50),
    skills: Array.isArray(skills) ? skills.slice(0, 20).map((s: unknown) => sanitizeText(String(s), 50)) : [],
    date: sanitizeText(String(date || ""), 100),
    location: sanitizeText(String(location || ""), 200),
    img: sanitizeText(String(img || ""), 500),
    available: true,
  }).select().single();
  if (error) return safeServerError(error, "db op");
  await bumpQuest(sb, profile.id, "host_session");
  return NextResponse.json({ success: true, session: data });
};

// ═══ CONNECTIONS ═══

ACTIONS["connect"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "connect", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { targetId } = rest;
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });
  if (targetId === profile.id) return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 });
  if (!UUID_RE.test(String(targetId))) return NextResponse.json({ success: true, demo: true });
  const { data: target } = await sb.from("muse_profiles").select("id").eq("id", targetId).maybeSingle();
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 400 });
  await sb.from("muse_connections").upsert({ user_id: profile.id, target_id: targetId, status: "pending" }, { onConflict: "user_id,target_id", ignoreDuplicates: true }).select();
  await sb.from("muse_notifications").insert({ user_id: targetId, from_id: profile.id, type: "connection", body: `${profile.name} wants to connect`, read: false });
  await emailProfile(sb, targetId, "New connection request ✦", "Someone wants to connect", `${profile.name} sent you a connection request.`, "View request", "https://muse.wyzdesign.com/muse");
  return NextResponse.json({ success: true });
};

// ═══ PREFERENCES & SYNC ═══

ACTIONS["save-preferences"] = async ({ sb, profile, rest }) => {
  const ALLOWED_PREFS = new Set([
    "nsfw", "showOnline", "showDistance", "notifications", "emailNotifications",
    "pushNotifications", "soundEffects", "darkMode", "distance", "ageRange",
    "openToTravel", "autoReply", "privacy", "visibility", "tags",
    "ageMin", "ageMax", "gender",
    "onboardingStep",
    "filterStyles", "filterScore",
    "savedBriefs",
    "appliedBriefs",
  ]);
  const source = (rest.preferences && typeof rest.preferences === "object") ? rest.preferences : rest;
  const prefs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
    if (ALLOWED_PREFS.has(k)) prefs[k] = v;
  }
  if (Object.keys(prefs).length === 0) return NextResponse.json({ error: "No valid preferences provided" }, { status: 400 });
  const { data: existing } = await sb.from("muse_profiles").select("preferences").eq("id", profile.id).maybeSingle();
  const merged = { ...(existing?.preferences || {}), ...prefs };
  const { error } = await sb.from("muse_profiles").update({ preferences: merged }).eq("id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

ACTIONS["apply-promo"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRateUser(profile.id, "apply-promo", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const code = String(rest.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Promo code required" }, { status: 400 });
  if (!isAdminEmail(profile.email)) return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
  if (code !== "MUSEBETA") return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
  const { error } = await sb.from("muse_profiles").update({ tier: "muse_pro" }).eq("id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, tier: "muse_pro" });
};

ACTIONS["mark-read"] = async ({ sb, profile, rest }) => {
  const { notificationIds } = rest;
  if (Array.isArray(notificationIds) && notificationIds.length > 0) {
    const ids = notificationIds.slice(0, 100).filter((x: unknown) => typeof x === "string" && UUID_RE.test(String(x)));
    if (ids.length > 0) {
      await sb.from("muse_notifications").update({ read: true }).in("id", ids).eq("user_id", profile.id);
    }
  }
  return NextResponse.json({ success: true });
};

ACTIONS["sync"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "sync", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const results: string[] = [];
  if (rest.matches?.length) {
    for (const m of rest.matches as any[]) {
      await sb.from("muse_matches").upsert(
        { user_id: profile.id, target_id: m.id, matched_at: new Date().toISOString() },
        { onConflict: "user_id,target_id", ignoreDuplicates: true }
      );
    }
    results.push("matches");
  }
  if (rest.stats && typeof rest.stats === "object") {
    const allowedStatKeys = ["likes", "superLikes", "passes", "bookingsCompleted", "matchesReceived", "messagesSent"];
    const cleanStats: Record<string, number> = {};
    for (const k of allowedStatKeys) {
      const v = (rest.stats as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) cleanStats[k] = Math.min(Math.floor(v), 100000);
    }
    if (Object.keys(cleanStats).length > 0) {
      const { data: existing } = await sb.from("muse_profiles").select("stats").eq("id", profile.id).maybeSingle();
      const merged = { ...(existing?.stats || {}), ...cleanStats };
      await sb.from("muse_profiles").update({ stats: merged }).eq("id", profile.id);
      results.push("stats");
    }
  }
  return NextResponse.json({ success: true, synced: results });
};

// ═══ ALBUMS ═══

ACTIONS["create-album"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "create-album", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const vErr = validateInput(rest);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
  const { title, description, cover_url, access_level, tags } = rest;
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const level = ["public", "private", "invite"].includes(access_level as string) ? access_level : "public";
  const { data, error } = await sb.from("muse_albums").insert({
    profile_id: profile.id, title: (title as string).trim(), description: description || "",
    cover_url: cover_url || "", access_level: level, tags: Array.isArray(tags) ? tags.slice(0, 20) : [],
  }).select().single();
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, album: data });
};

ACTIONS["update-album"] = async ({ sb, profile, rest }) => {
  const { albumId, title, description, cover_url, access_level, tags } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = String(title).slice(0, 200);
  if (description !== undefined) updates.description = String(description).slice(0, 2000);
  if (cover_url !== undefined) updates.cover_url = cover_url;
  if (access_level !== undefined && ["public", "private", "invite"].includes(access_level as string)) updates.access_level = access_level;
  if (tags !== undefined && Array.isArray(tags)) updates.tags = tags.slice(0, 20);
  const { error } = await sb.from("muse_albums").update(updates).eq("id", albumId);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

ACTIONS["delete-album"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "delete-album", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { error } = await sb.from("muse_albums").delete().eq("id", albumId);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

ACTIONS["add-album-photo"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "add-album-photo", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId, img_url, caption } = rest;
  if (!albumId || !img_url) return NextResponse.json({ error: "albumId and img_url required" }, { status: 400 });
  const storageHost = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/^https?:\/\//, "").split("/")[0];
  if (storageHost && !String(img_url).includes(storageHost)) {
    return NextResponse.json({ error: "Images must be uploaded through Muse" }, { status: 400 });
  }
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { count } = await sb.from("muse_album_photos").select("*", { count: "exact", head: true }).eq("album_id", albumId);
  const { data, error } = await sb.from("muse_album_photos").insert({ album_id: albumId, img_url, caption: String(caption || "").slice(0, 500), position: count ?? 0 }).select().single();
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, photo: data });
};

ACTIONS["remove-album-photo"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "remove-album-photo", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { photoId } = rest;
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });
  const { data: photo } = await sb.from("muse_album_photos").select("album_id").eq("id", photoId).maybeSingle();
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: album } = await sb.from("muse_albums").select("profile_id").eq("id", photo.album_id).maybeSingle();
  if (!album || String(album.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { error } = await sb.from("muse_album_photos").delete().eq("id", photoId);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

ACTIONS["grant-album-access"] = async ({ sb, profile, rest }) => {
  const { albumId, viewerProfileId } = rest;
  if (!albumId || !viewerProfileId) return NextResponse.json({ error: "albumId and viewerProfileId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { error } = await sb.from("muse_album_access").upsert({ album_id: albumId, viewer_profile_id: viewerProfileId }, { onConflict: "album_id,viewer_profile_id", ignoreDuplicates: true });
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

ACTIONS["revoke-album-access"] = async ({ sb, profile, rest }) => {
  const { albumId, viewerProfileId } = rest;
  if (!albumId || !viewerProfileId) return NextResponse.json({ error: "albumId and viewerProfileId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await sb.from("muse_album_access").delete().eq("album_id", albumId).eq("viewer_profile_id", viewerProfileId);
  return NextResponse.json({ success: true });
};

ACTIONS["list-album-access"] = async ({ sb, profile, rest }) => {
  const { albumId } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data } = await sb.from("muse_album_access").select("viewer_profile_id, granted_at, viewer_profile_id(id, name, avatar)").eq("album_id", albumId);
  return NextResponse.json({ access: data || [] });
};

ACTIONS["view-album"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "view-album", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: album } = await sb.from("muse_albums").select("view_count, access_level, profile_id").eq("id", albumId).maybeSingle();
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (album.access_level === "private") return NextResponse.json({ error: "Album is private" }, { status: 403 });
  if (album.access_level === "invite") {
    const { data: access } = await sb.from("muse_album_access").select("id").eq("album_id", albumId).eq("viewer_profile_id", profile.id).limit(1);
    if (!access || access.length === 0) return NextResponse.json({ error: "Album is invite-only" }, { status: 403 });
  }
  await sb.from("muse_albums").update({ view_count: (album.view_count || 0) + 1 }).eq("id", albumId);
  return NextResponse.json({ success: true });
};

ACTIONS["like-album"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "like-album", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: album } = await sb.from("muse_albums").select("like_count, access_level, profile_id").eq("id", albumId).maybeSingle();
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (album.access_level === "private" && String(album.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Album is private" }, { status: 403 });
  if (album.access_level === "invite") {
    const { data: access } = await sb.from("muse_album_access").select("id").eq("album_id", albumId).eq("viewer_profile_id", profile.id).maybeSingle();
    if (!access && String(album.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Album is invite-only" }, { status: 403 });
  }
  const { data: existingLike } = await sb.from("muse_album_likes").select("id").eq("album_id", albumId).eq("user_id", profile.id).maybeSingle();
  if (existingLike) return NextResponse.json({ success: true, alreadyLiked: true });
  await sb.from("muse_album_likes").insert({ album_id: albumId, user_id: profile.id });
  const { count } = await sb.from("muse_album_likes").select("*", { count: "exact", head: true }).eq("album_id", albumId);
  await sb.from("muse_albums").update({ like_count: (count ?? 0) }).eq("id", albumId);
  return NextResponse.json({ success: true });
};

// ═══ DISCLOSURES ═══

ACTIONS["create-disclosure"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "create-disclosure", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const {
    responderId, bookingId,
    compensationAmount, compensationTiming, compensationMethod,
    contentTypeNudity, contentTypeArtisticNude, contentTypeBoudoir, contentTypePortrait,
    contentTypeFashion, contentTypeEditorial, contentTypeCommercial, contentTypeConceptual,
    contentTypeOther, contentTypeOtherDesc,
    boundaryFullNudity, boundaryImpliedNudity, boundaryPartials, boundaryNoPartials,
    boundaryExplicitActs, boundaryPenetration, boundaryNoPenetration,
    boundaryTouchingSelf, boundaryTouchingOther, boundaryNoTouching,
    locationType, locationAddress, locationPublic,
    othersPresent, othersCount, othersDesc,
    usageRights, usageCustomDesc, editApprovalRequired, ndaRequired, modelReleaseRequired
  } = rest;

  if (!responderId) return NextResponse.json({ error: "responderId required" }, { status: 400 });

  const hasNsfw = contentTypeNudity || contentTypeArtisticNude || boundaryExplicitActs || boundaryPenetration;
  const hasPayment = compensationAmount && compensationAmount !== "0" && compensationAmount !== "Free";
  if (hasNsfw && hasPayment) {
    await sb.from("muse_disclosures").insert({
      proposer_id: profile.id, responder_id: responderId, booking_id: bookingId || null,
      status: "blocked", blocked_reason: "NSFW content with payment — violates Muse terms",
      compensation_amount: compensationAmount || "",
      content_type_nudity: !!contentTypeNudity,
      content_type_artistic_nude: !!contentTypeArtisticNude,
      boundary_explicit_acts: !!boundaryExplicitActs,
      boundary_penetration: !!boundaryPenetration,
    });
    await applyStrikeAndEscalate(sb, profile.id, {
      category: "high_severity", severity: "suspension",
      reason: "Attempted to arrange paid explicit sexual content",
      details: "Disclosure was hard-blocked: NSFW content + payment combination",
    });
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "disclosure_blocked", details: { responder_id: responderId } });
    return NextResponse.json({ error: "This request violates Muse terms and has been blocked.", blocked: true }, { status: 403 });
  }

  const { data, error } = await sb.from("muse_disclosures").insert({
    proposer_id: profile.id, responder_id: responderId, booking_id: bookingId || null,
    compensation_amount: sanitizeText(String(compensationAmount || ""), 50),
    compensation_timing: sanitizeText(String(compensationTiming || ""), 50),
    compensation_method: sanitizeText(String(compensationMethod || ""), 50),
    content_type_nudity: !!contentTypeNudity,
    content_type_artistic_nudity: !!contentTypeArtisticNude,
    content_type_boudoir: !!contentTypeBoudoir,
    content_type_portrait: !!contentTypePortrait,
    content_type_fashion: !!contentTypeFashion,
    content_type_editorial: !!contentTypeEditorial,
    content_type_commercial: !!contentTypeCommercial,
    content_type_conceptual: !!contentTypeConceptual,
    content_type_other: !!contentTypeOther,
    content_type_other_desc: sanitizeText(String(contentTypeOtherDesc || ""), 500),
    boundary_full_nudity: !!boundaryFullNudity,
    boundary_implied_nudity: !!boundaryImpliedNudity,
    boundary_partials: !!boundaryPartials,
    boundary_no_partials: !!boundaryNoPartials,
    boundary_explicit_acts: !!boundaryExplicitActs,
    boundary_penetration: !!boundaryPenetration,
    boundary_no_penetration: !!boundaryNoPenetration,
    boundary_touching_self: !!boundaryTouchingSelf,
    boundary_touching_other: !!boundaryTouchingOther,
    boundary_no_touching: !!boundaryNoTouching,
    location_type: String(locationType || ""),
    location_address: sanitizeText(String(locationAddress || ""), 500),
    location_public: locationPublic !== false,
    others_present: !!othersPresent,
    others_count: parseInt(othersCount as string) || 0,
    others_desc: sanitizeText(String(othersDesc || ""), 500),
    usage_rights: String(usageRights || ""),
    usage_custom_desc: sanitizeText(String(usageCustomDesc || ""), 500),
    edit_approval_required: !!editApprovalRequired,
    nda_required: !!ndaRequired,
    model_release_required: !!modelReleaseRequired,
    status: "pending_responder",
  }).select().single();

  if (error) return safeServerError(error, "db op");
  await sb.from("muse_notifications").insert({
    user_id: responderId, from_id: profile.id, type: "disclosure",
    body: `${profile.name} sent a shoot disclosure for your review`, read: false
  });
  return NextResponse.json({ success: true, disclosure: data });
};

ACTIONS["confirm-disclosure"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRateUser(profile.id, "confirm-disclosure", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { disclosureId } = rest;
  if (!disclosureId) return NextResponse.json({ error: "disclosureId required" }, { status: 400 });
  const { data: disc } = await sb.from("muse_disclosures").select("*").eq("id", disclosureId).maybeSingle();
  if (!disc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isProposer = String(disc.proposer_id) === String(profile.id);
  const isResponder = String(disc.responder_id) === String(profile.id);
  if (!isProposer && !isResponder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, unknown> = {};
  if (isProposer && disc.status === "pending_proposer") {
    updates.status = "pending_responder";
    updates.proposer_confirmed_at = new Date().toISOString();
  } else if (isResponder && disc.status === "pending_responder") {
    updates.status = "confirmed";
    updates.responder_confirmed_at = new Date().toISOString();
  } else {
    return NextResponse.json({ error: "Cannot confirm in current state" }, { status: 400 });
  }

  const { error } = await sb.from("muse_disclosures").update(updates).eq("id", disclosureId);
  if (error) return safeServerError(error, "db op");

  if (updates.status === "confirmed") {
    const otherUserId = isProposer ? disc.responder_id : disc.proposer_id;
    await sb.from("muse_notifications").insert({
      user_id: otherUserId, from_id: profile.id, type: "disclosure_confirmed",
      body: `${profile.name} confirmed the shoot disclosure`, read: false
    });
    if (otherUserId) await emailProfile(sb, otherUserId, "Disclosure confirmed ✦", "Shoot disclosure confirmed", `${profile.name} confirmed the shoot disclosure. You're all set.`, "View details", "https://muse.wyzdesign.com/muse");
  }
  return NextResponse.json({ success: true });
};

ACTIONS["get-disclosures"] = async ({ sb, profile }) => {
  const { data } = await sb.from("muse_disclosures").select("*, proposer_id(id, name, avatar), responder_id(id, name, avatar)")
    .or(`proposer_id.eq.${profile.id},responder_id.eq.${profile.id}`)
    .order("created_at", { ascending: false }).limit(20);
  return NextResponse.json({ disclosures: data || [] });
};

// ═══ STRIKES & ENFORCEMENT ═══

ACTIONS["get-strikes"] = async ({ sb, profile }) => {
  const { data } = await sb.from("muse_strikes").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
  return NextResponse.json({ strikes: data || [] });
};

ACTIONS["appeal-strike"] = async ({ sb, profile, rest }) => {
  const { strikeId, appealText } = rest;
  if (!strikeId || !appealText) return NextResponse.json({ error: "strikeId and appealText required" }, { status: 400 });
  const { error } = await sb.from("muse_strikes").update({
    appeal_status: "pending", appeal_text: String(appealText).slice(0, 2000)
  }).eq("id", strikeId).eq("user_id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

ACTIONS["admin-resolve-appeal"] = async ({ sb, profile, rest }) => {
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { strikeId, resolution } = rest;
  if (!strikeId || !["upheld", "overturned"].includes(resolution as string)) {
    return NextResponse.json({ error: "strikeId and valid resolution required" }, { status: 400 });
  }
  const updates: Record<string, unknown> = {
    appeal_status: resolution,
    appeal_resolved_at: new Date().toISOString(),
    appeal_resolved_by: profile.id,
  };
  if (resolution === "overturned") {
    updates.severity = "warning";
  }
  const { error } = await sb.from("muse_strikes").update(updates).eq("id", strikeId);
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_admin_audit_log").insert({ admin_user_id: profile.id, query_text: `resolve_appeal:${strikeId}:${resolution}` });
  return NextResponse.json({ success: true });
};

// ═══ BOOKING MANAGEMENT ═══

ACTIONS["respond-booking"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "respond-booking", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { bookingId, response } = rest;
  if (!bookingId || !response) return NextResponse.json({ error: "bookingId and response required" }, { status: 400 });
  if (!["accept", "decline", "reschedule"].includes(response)) return NextResponse.json({ error: "response must be accept, decline, or reschedule" }, { status: 400 });
  const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(booking.host_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (response === "accept") {
    updates.status = "confirmed";
    updates.confirmed_at = new Date().toISOString();
    await sb.from("muse_safety_checkins").insert({
      booking_id: bookingId, user_id: booking.user_id, checkin_type: "pre_shoot_24h", status: "pending"
    });
    await sb.from("muse_safety_checkins").insert({
      booking_id: bookingId, user_id: profile.id, checkin_type: "pre_shoot_24h", status: "pending"
    });
  } else if (response === "decline") {
    updates.status = "cancelled";
    updates.cancelled_at = new Date().toISOString();
    updates.cancel_reason = "Host declined";
  } else if (response === "reschedule") {
    updates.status = "pending";
    updates.reschedule_date = rest.newDate || "";
  }

  const { error } = await sb.from("muse_bookings").update(updates).eq("id", bookingId);
  if (error) return safeServerError(error, "db op");

  await sb.from("muse_notifications").insert({
    user_id: booking.user_id, from_id: profile.id, type: "booking_update",
    body: `${profile.name} ${response === "accept" ? "accepted" : response === "decline" ? "declined" : "wants to reschedule"} your booking`, read: false
  });
  if (booking.user_id) await emailProfile(sb, booking.user_id, "Booking update ✦", "Your booking was updated", `${profile.name} ${response === "accept" ? "accepted" : response === "decline" ? "declined" : "wants to reschedule"} your booking.`, "View booking", "https://muse.wyzdesign.com/muse");
  return NextResponse.json({ success: true });
};

ACTIONS["cancel-booking"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "cancel-booking", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { bookingId, reason } = rest;
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isParty = String(booking.user_id) === String(profile.id) || String(booking.host_id) === String(profile.id);
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: cancelPayment } = await sb.from("muse_booking_payments")
    .select("id, stripe_payment_intent, status").eq("booking_id", bookingId).maybeSingle();
  if (cancelPayment?.stripe_payment_intent && cancelPayment.status !== "succeeded") {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      await stripe.paymentIntents.cancel(cancelPayment.stripe_payment_intent);
      await sb.from("muse_booking_payments").update({ status: "cancelled" }).eq("id", cancelPayment.id);
    } catch (e: unknown) {
      console.error("[cancel-booking] Stripe paymentIntent cancel failed:", e instanceof Error ? e.message : e);
      // Still proceed — booking is cancelled either way, but log for monitoring
    }
  }

  const { error } = await sb.from("muse_bookings").update({
    status: "cancelled", cancelled_at: new Date().toISOString(),
    cancel_reason: String(reason || "Cancelled by user"),
    updated_at: new Date().toISOString()
  }).eq("id", bookingId);
  if (error) return safeServerError(error, "db op");

  const otherUserId = String(booking.user_id) === String(profile.id) ? booking.host_id : booking.user_id;
  if (otherUserId) {
    await sb.from("muse_notifications").insert({
      user_id: otherUserId, from_id: profile.id, type: "booking_cancelled",
      body: `${profile.name} cancelled the booking${reason ? `: ${reason}` : ""}`, read: false
    });
  }
  return NextResponse.json({ success: true });
};

ACTIONS["complete-booking"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "complete-booking", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { bookingId } = rest;
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isParty = String(booking.user_id) === String(profile.id) || String(booking.host_id) === String(profile.id);
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (booking.status !== "confirmed") return NextResponse.json({ error: "Only confirmed bookings can be completed" }, { status: 400 });

  const { data: payments } = await sb.from("muse_booking_payments")
    .select("id, stripe_payment_intent, status").eq("booking_id", bookingId)
    .order("created_at", { ascending: false }).limit(1);
  const payment = payments?.[0];
  let captureSucceeded = payment?.status === "succeeded";
  if (payment?.stripe_payment_intent && payment.status !== "succeeded") {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      await stripe.paymentIntents.capture(payment.stripe_payment_intent);
      await sb.from("muse_booking_payments").update({ status: "succeeded" }).eq("id", payment.id);
      captureSucceeded = true;
    } catch (e: unknown) {
      console.error("[complete-booking] capture failed:", e);
      return NextResponse.json({ error: "Payment capture failed. The booking cannot be completed until payment is resolved." }, { status: 402 });
    }
  }
  if (!payment || captureSucceeded) {
    await sb.from("muse_bookings").update({
      status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", bookingId);
  } else {
    return NextResponse.json({ error: "Payment capture failed. The booking cannot be completed until payment is resolved." }, { status: 402 });
  }

  const otherId = String(booking.user_id) === String(profile.id) ? booking.host_id : booking.user_id;
  if (otherId) {
    await sb.from("muse_notifications").insert({
      user_id: otherId, from_id: profile.id, type: "booking_completed",
      body: `${profile.name} marked the shoot as complete — leave a review`, read: false
    });
  }
  await bumpQuest(sb, String(booking.user_id), "complete_session");
  if (booking.host_id) await bumpQuest(sb, String(booking.host_id), "complete_host");
  return NextResponse.json({ success: true });
};

ACTIONS["submit-review"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "submit-review", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { bookingId, rating, body } = rest;
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) return NextResponse.json({ error: "rating must be an integer 1-5" }, { status: 400 });
  const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status !== "completed") return NextResponse.json({ error: "Only completed bookings can be reviewed" }, { status: 400 });
  const isParty = String(booking.user_id) === String(profile.id) || String(booking.host_id) === String(profile.id);
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const revieweeId = String(booking.user_id) === String(profile.id) ? booking.host_id : booking.user_id;
  if (!revieweeId) return NextResponse.json({ error: "No other party to review" }, { status: 400 });
  const { data, error } = await sb.from("muse_reviews").upsert({
    booking_id: bookingId, reviewer_id: profile.id, reviewee_id: revieweeId,
    rating: r, body: String(body || "").slice(0, 1000),
  }, { onConflict: "booking_id,reviewer_id" }).select().single();
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, review: data });
};

// ═══ CHECK-INS & SAFETY SHARES ═══

ACTIONS["respond-checkin"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRateUser(profile.id, "respond-checkin", 15)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { checkinId, response, sharedWithContact } = rest;
  if (!checkinId || !response) return NextResponse.json({ error: "checkinId and response required" }, { status: 400 });
  const { data: checkin } = await sb.from("muse_safety_checkins").select("*").eq("id", checkinId).maybeSingle();
  if (!checkin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(checkin.user_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, unknown> = {
    status: response, responded_at: new Date().toISOString(),
    shared_with_contact: !!sharedWithContact
  };
  if (response === "cancelled") {
    updates.cancelled_at = new Date().toISOString();
    updates.cancel_reason = rest.reason || "Cancelled during check-in";
  }
  const { error } = await sb.from("muse_safety_checkins").update(updates).eq("id", checkinId);
  if (error) return safeServerError(error, "db op");

  if (response === "cancelled" && checkin.booking_id) {
    await sb.from("muse_bookings").update({
      status: "cancelled", cancelled_at: new Date().toISOString(),
      cancel_reason: updates.cancel_reason as string, updated_at: new Date().toISOString()
    }).eq("id", checkin.booking_id);
  }
  return NextResponse.json({ success: true });
};

ACTIONS["get-checkins"] = async ({ sb, profile }) => {
  const { data } = await sb.from("muse_safety_checkins").select("*, booking_id(id, session_id, status)")
    .eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20);
  return NextResponse.json({ checkins: data || [] });
};

ACTIONS["share-safety-details"] = async ({ sb, profile, rest }) => {
  const { bookingId, disclosureId, recipientName, recipientPhone, recipientEmail, shareMethod } = rest;
  // Verify caller is a party to the booking (if bookingId provided)
  if (bookingId && UUID_RE.test(String(bookingId))) {
    const { data: bk } = await sb.from("muse_bookings").select("user_id, host_id").eq("id", bookingId).maybeSingle();
    if (bk) {
      const isParty = String(bk.user_id) === String(profile.id) || String(bk.host_id) === String(profile.id);
      if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const { error } = await sb.from("muse_safety_shares").insert({
    user_id: profile.id, booking_id: bookingId || null, disclosure_id: disclosureId || null,
    recipient_name: String(recipientName || ""),
    recipient_phone: String(recipientPhone || ""),
    recipient_email: String(recipientEmail || ""),
    share_method: String(shareMethod || "sms"),
  });
  if (error) return safeServerError(error, "db op");

  let sessionInfo = "";
  if (bookingId) {
    const { data: bk } = await sb.from("muse_bookings")
      .select("session_id, host_id, user_id")
      .eq("id", bookingId).maybeSingle();
    if (bk) {
      const ids = [bk.host_id, bk.user_id].filter(Boolean);
      const { data: profiles } = await sb.from("muse_profiles").select("id,name").in("id", ids);
      const nameMap = new Map((profiles || []).map((p: { id: string; name: string }) => [p.id, p.name]));
      const hostName = nameMap.get(bk.host_id) || "Unknown";
      const clientName = nameMap.get(bk.user_id) || "Unknown";
      const { data: session } = await sb.from("muse_sessions").select("title,location,date,time").eq("id", bk.session_id).maybeSingle();
      if (session) {
        sessionInfo = `Shoot: ${session.title || "Untitled"} at ${session.location || "TBD"} on ${session.date || "?"} ${session.time || "?"} with ${hostName} (host) and ${clientName} (client).`;
      }
    }
  }

  const safetyBody = `A safety disclosure has been shared by ${profile.name}.\n\nRecipient: ${recipientName || "Not specified"}\nMethod: ${shareMethod || "email"}\n${recipientEmail ? `Email: ${recipientEmail}` : ""}${recipientPhone ? `Phone: ${recipientPhone}` : ""}\n\n${sessionInfo}\n\nThis is an automated safety notification from Muse.`;

  if (recipientEmail) {
    sendEmail(notify(
      recipientEmail,
      `Safety disclosure from ${profile.name}`,
      "Muse Safety Notification",
      safetyBody
    )).catch((e: unknown) => console.error("[share-safety] email dispatch failed:", e));
  }

  if (bookingId) {
    const { data: bk2 } = await sb.from("muse_bookings")
      .select("user_id, host_id").eq("id", bookingId).maybeSingle();
    if (bk2) {
      const otherId = String(bk2.user_id) === String(profile.id) ? bk2.host_id : bk2.user_id;
      if (otherId && String(otherId) !== String(profile.id)) {
        try {
          await sb.from("muse_notifications").insert({
            user_id: otherId, from_id: profile.id, type: "safety_share",
            body: `${profile.name} shared safety details with a trusted contact for this shoot.`, read: false
          });
        } catch { /* non-fatal */ }
      }
    }
  }

  return NextResponse.json({ success: true });
};

// ═══ SAFETY PROFILE ═══

ACTIONS["save-safety-profile"] = async ({ sb, profile, rest }) => {
  const { emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    trustedFriendName, trustedFriendPhone, trustedFriendEmail, autoShareEnabled } = rest;
  const { error } = await sb.from("muse_safety_profiles").upsert({
    user_id: profile.id,
    emergency_contact_name: String(emergencyContactName || ""),
    emergency_contact_phone: String(emergencyContactPhone || ""),
    emergency_contact_relation: String(emergencyContactRelation || ""),
    trusted_friend_name: String(trustedFriendName || ""),
    trusted_friend_phone: String(trustedFriendPhone || ""),
    trusted_friend_email: String(trustedFriendEmail || ""),
    auto_share_enabled: !!autoShareEnabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_profiles").update({ emergency_contact_added: true }).eq("id", profile.id);
  return NextResponse.json({ success: true });
};

ACTIONS["get-safety-profile"] = async ({ sb, profile }) => {
  const { data } = await sb.from("muse_safety_profiles").select("*").eq("user_id", profile.id).maybeSingle();
  return NextResponse.json({ safety: data || null });
};

// ═══ PROMPTS ═══

ACTIONS["get-prompts"] = async ({ sb, rest }) => {
  const { category } = rest;
  let query = sb.from("muse_prompt_bank").select("*").eq("active", true).order("display_order");
  if (category) query = query.eq("category", category);
  const { data } = await query.limit(100);
  return NextResponse.json({ prompts: data || [] });
};

ACTIONS["save-prompt-response"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "save-prompt-response", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { promptId, responseText, responseChoices } = rest;
  if (!promptId) return NextResponse.json({ error: "promptId required" }, { status: 400 });
  const { error } = await sb.from("muse_prompt_responses").upsert({
    user_id: profile.id, prompt_id: promptId,
    response_text: String(responseText || ""),
    response_choices: Array.isArray(responseChoices) ? responseChoices : [],
  }, { onConflict: "user_id,prompt_id" });
  if (error) return safeServerError(error, "db op");
  const { count } = await sb.from("muse_prompt_responses").select("*", { count: "exact", head: true }).eq("user_id", profile.id);
  const { count: total } = await sb.from("muse_prompt_bank").select("*", { count: "exact", head: true }).eq("active", true);
  const pct = total && total > 0 ? Math.round(((count || 0) / total) * 100) : 0;
  await sb.from("muse_profiles").update({ profile_completion_pct: pct, prompt_completed_at: new Date().toISOString() }).eq("id", profile.id);

  if (responseText && typeof responseText === "string" && responseText.trim()) {
    const embedText = `${responseText}`.trim();
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/muse/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "embed-text", text: embedText, userId: profile.id, meta: { embedding_type: "prompt_response", prompt_id: promptId } }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, completionPct: pct });
};

ACTIONS["get-prompt-responses"] = async ({ sb, profile }) => {
  const { data } = await sb.from("muse_prompt_responses").select("*, prompt_id(id, prompt_text, category)").eq("user_id", profile.id);
  return NextResponse.json({ responses: data || [] });
};

// ═══ ADMIN BRAIN ═══

ACTIONS["admin-brain"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "admin-brain", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { query: userQuery } = rest;
  if (!userQuery || typeof userQuery !== "string") {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
    const q = userQuery.toLowerCase();
    let result: Record<string, unknown> = {};

    if (q.includes("user") && (q.includes("count") || q.includes("total") || q.includes("how many"))) {
      const { count } = await sb.from("muse_profiles").select("*", { count: "exact", head: true });
      result = { answer: `Total registered users: ${count || 0}`, data: { count: count || 0 } };
    } else if (q.includes("match") && (q.includes("count") || q.includes("total"))) {
      const { count } = await sb.from("muse_matches").select("*", { count: "exact", head: true });
      result = { answer: `Total matches: ${count || 0}`, data: { count: count || 0 } };
    } else if (q.includes("report") || q.includes("flag")) {
      const { data: reports } = await sb.from("muse_reports").select("*, reporter_id(id, name), target_id(id, name)").order("created_at", { ascending: false }).limit(20);
      const { count } = await sb.from("muse_reports").select("*", { count: "exact", head: true });
      result = { answer: `Total reports: ${count || 0}. Showing most recent.`, data: { reports: reports || [], count: count || 0 } };
    } else if (q.includes("strike") || q.includes("suspension") || q.includes("ban")) {
      const { data: strikes } = await sb.from("muse_strikes").select("*, user_id(id, name, avatar)").order("created_at", { ascending: false }).limit(20);
      const { count } = await sb.from("muse_strikes").select("*", { count: "exact", head: true });
      const suspended = (strikes || []).filter((s: any) => s.severity === "suspension" && (!s.suspension_ends_at || new Date(s.suspension_ends_at) > new Date()));
      result = { answer: `Total strikes: ${count || 0}. Currently suspended: ${suspended.length}.`, data: { strikes: strikes || [], suspendedCount: suspended.length } };
    } else if (q.includes("disclosure")) {
      const { data: disclosures } = await sb.from("muse_disclosures").select("*, proposer_id(id, name), responder_id(id, name)").order("created_at", { ascending: false }).limit(20);
      const blocked = (disclosures || []).filter((d: any) => d.status === "blocked");
      result = { answer: `Total disclosures: ${(disclosures || []).length}. Blocked: ${blocked.length}.`, data: { disclosures: disclosures || [], blockedCount: blocked.length } };
    } else if (q.includes("active") || q.includes("retention") || q.includes("engagement")) {
      const since7d = new Date(Date.now() - 7 * 86400000).toISOString();
      const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
      const [active7d, active30d, newUsers30d] = await Promise.all([
        sb.from("muse_activity_log").select("user_id").gte("created_at", since7d),
        sb.from("muse_activity_log").select("user_id").gte("created_at", since30d),
        sb.from("muse_profiles").select("id").gte("created_at", since30d),
      ]);
      const activeUsers7d = new Set((active7d.data || []).map((r: any) => r.user_id).filter(Boolean)).size;
      const activeUsers30d = new Set((active30d.data || []).map((r: any) => r.user_id).filter(Boolean)).size;
      result = { answer: `Active users (7d): ${activeUsers7d}, Active (30d): ${activeUsers30d}, New signups (30d): ${(newUsers30d.data || []).length}`, data: { active7d: activeUsers7d, active30d: activeUsers30d, newUsers30d: (newUsers30d.data || []).length } };
    } else if (q.includes("safety") || q.includes("checkin")) {
      const { data: checkins } = await sb.from("muse_safety_checkins").select("*, user_id(id, name)").order("created_at", { ascending: false }).limit(20);
      const pending = (checkins || []).filter((c: any) => c.status === "pending");
      const cancelled = (checkins || []).filter((c: any) => c.status === "cancelled");
      result = { answer: `Safety check-ins: ${(checkins || []).length} total. Pending: ${pending.length}. Cancelled: ${cancelled.length}.`, data: { checkins: checkins || [], pendingCount: pending.length, cancelledCount: cancelled.length } };
    } else if (q.includes("user") && (q.includes("detail") || q.includes("profile") || q.includes("info") || q.includes("lookup"))) {
      const searchTerm = q.replace(/.*(?:detail|profile|info|lookup)\s+(?:user\s*)?/i, "").trim();
      if (!searchTerm) return NextResponse.json({ error: "Provide a name or email to look up", data: {} });
      const isEmail = searchTerm.includes("@");
      const { data: users } = await sb.from("muse_profiles").select("id, auth_id, name, email, type, avatar, bio, loc, looking, styles, photos, nsfw, tier, pro_expires_at, created_at, profile_completion_pct, suspended, stats, referrals, age_verified").ilike(isEmail ? "email" : "name", `%${searchTerm}%`).limit(5);
      if (!users || users.length === 0) return NextResponse.json({ answer: `No user found matching "${searchTerm}".`, data: {} });
      const user = users[0];
      const [activityRes, matchesRes, reportsRes, strikesRes, bookingsRes] = await Promise.all([
        sb.from("muse_activity_log").select("id, type, target_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        sb.from("muse_matches").select("id, created_at").or(`user_id.eq.${user.id},target_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(10),
        sb.from("muse_reports").select("id, reason, target_type, status, created_at").eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(10),
        sb.from("muse_strikes").select("id, reason, severity, suspension_ends_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        sb.from("muse_booking_payments").select("id, amount, status, created_at").or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(10),
      ]);
      const { count: reportsAgainst } = await sb.from("muse_reports").select("*", { count: "exact", head: true }).eq("target_id", user.id);
      const activeStrikes = (strikesRes.data || []).filter((s: any) => s.severity === "suspension" && (!s.suspension_ends_at || new Date(s.suspension_ends_at) > new Date()));
      const answer = [
        `👤 ${user.name} (${user.email}) — ${user.type || "N/A"} · ${user.tier || "free"} tier`,
        user.suspended ? "⚠️ SUSPENDED" : "Active",
        `Joined: ${new Date(user.created_at).toLocaleDateString()} · Profile: ${user.profile_completion_pct || 0}%`,
        `Bio: ${(user.bio || "none").slice(0, 120)} · Location: ${user.loc || "unset"}`,
        `Looking: ${(user.looking || []).join(", ") || "unset"} · NSFW: ${user.nsfw ? "yes" : "no"}`,
        `Stats: ${JSON.stringify(user.stats || {})}`,
        `Activity: ${(activityRes.data || []).length} recent events · Matches: ${(matchesRes.data || []).length} · Reports filed: ${(reportsRes.data || []).length} · Reports against: ${reportsAgainst || 0}`,
        `Strikes: ${(strikesRes.data || []).length} total, ${activeStrikes.length} active suspensions`,
        `Payments: ${(bookingsRes.data || []).length} recent`,
      ].join("\n");
      result = { answer, data: { profile: user, activity: activityRes.data || [], matches: matchesRes.data || [], reportsFiled: reportsRes.data || [], reportsAgainst: reportsAgainst || 0, strikes: strikesRes.data || [], activeStrikes: activeStrikes.length, payments: bookingsRes.data || [] } };
    } else if (q.includes("user") && (q.includes("find") || q.includes("search") || q.includes("name"))) {
      const searchTerm = q.replace(/.*(?:find|search|name)\s+(?:user\s*)?/i, "").trim();
      const { data: users } = await sb.from("muse_profiles").select("id, name, email, type, avatar, tier, suspended, created_at, profile_completion_pct").ilike("name", `%${searchTerm}%`).limit(10);
      result = { answer: `Found ${(users || []).length} users matching "${searchTerm}".`, data: { users: users || [] } };
    } else if (q.includes("prompt") && (q.includes("response") || q.includes("answer"))) {
      const { count } = await sb.from("muse_prompt_responses").select("*", { count: "exact", head: true });
      const { count: totalPrompts } = await sb.from("muse_prompt_bank").select("*", { count: "exact", head: true }).eq("active", true);
      result = { answer: `Prompt responses: ${count || 0} across ${totalPrompts || 0} active prompts.`, data: { responseCount: count || 0, promptCount: totalPrompts || 0 } };
    } else {
      const counts = await Promise.all([
        sb.from("muse_profiles").select("*", { count: "exact", head: true }),
        sb.from("muse_matches").select("*", { count: "exact", head: true }),
        sb.from("muse_reports").select("*", { count: "exact", head: true }),
        sb.from("muse_strikes").select("*", { count: "exact", head: true }),
        sb.from("muse_disclosures").select("*", { count: "exact", head: true }),
      ]);
      result = {
        answer: `Muse Overview: ${counts[0].count || 0} users, ${counts[1].count || 0} matches, ${counts[2].count || 0} reports, ${counts[3].count || 0} strikes, ${counts[4].count || 0} disclosures.`,
        data: { users: counts[0].count || 0, matches: counts[1].count || 0, reports: counts[2].count || 0, strikes: counts[3].count || 0, disclosures: counts[4].count || 0 }
      };
    }

    let answer = String(result.answer || "");
    let aiSources: string[] = [];
    try {
      const enriched = await askMuseAI(
        `Question: ${userQuery}\n\nLive metrics (from database): ${JSON.stringify((result as any).data || {})}`,
        { forAdmin: true }
      );
      if (enriched) {
        answer = enriched.answer;
        aiSources = enriched.sources;
      }
    } catch { /* AI is best-effort; keep rule-based answer */ }

    await sb.from("muse_admin_audit_log").insert({
      admin_user_id: profile.id, query_text: userQuery.slice(0, 1000),
      query_result_summary: answer.slice(0, 500),
      result_row_count: Array.isArray((result as any).data?.users) ? (result as any).data.users.length : 0,
    });

    return NextResponse.json({ answer, data: (result as any).data, sources: aiSources, ai: aiSources.length > 0 });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Query failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
};

// ═══ PAYMENTS ═══

ACTIONS["get-payments"] = async ({ sb, profile }) => {
  const { data: asPayee } = await sb.from("muse_booking_payments").select("*, payer_id(name, avatar), payee_id(name, avatar), booking_id(session_id, status)")
    .eq("payee_id", profile.id).order("created_at", { ascending: false }).limit(50);
  const { data: asPayer } = await sb.from("muse_booking_payments").select("*, payer_id(name, avatar), payee_id(name, avatar), booking_id(session_id, status)")
    .eq("payer_id", profile.id).order("created_at", { ascending: false }).limit(50);
  const all = [...(asPayee || []), ...(asPayer || [])];
  const deduped = Array.from(new Map(all.map((p: any) => [p.id, p])).values());
  deduped.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json({ payments: deduped });
};

// ═══ ADMIN — MODERATION ═══

ACTIONS["admin-reports"] = async ({ sb, profile }) => {
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: reports } = await sb.from("muse_reports").select("*, reporter_id(id, name, avatar), target_id(id, name, avatar)")
    .order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ reports: reports || [] });
};

ACTIONS["admin-strikes"] = async ({ sb, profile }) => {
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: strikes } = await sb.from("muse_strikes").select("*, user_id(id, name, avatar)")
    .order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ strikes: strikes || [] });
};

ACTIONS["admin-suspend-user"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "admin-suspend-user", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { targetUserId, reason, durationDays } = rest;
  if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  if (targetUserId === profile.id) return NextResponse.json({ error: "Cannot suspend yourself" }, { status: 400 });
  const suspensionEnd = durationDays ? new Date(Date.now() + (durationDays as number) * 86400000).toISOString() : null;
  const { error } = await sb.from("muse_strikes").insert({
    user_id: targetUserId, issued_by: profile.id,
    reason: String(reason || "Suspended by admin"),
    category: "high_severity",
    severity: suspensionEnd ? "suspension" : "permanent_ban",
    suspension_ends_at: suspensionEnd,
  });
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_profiles").update({ suspended: true, suspended_at: new Date().toISOString() }).eq("id", targetUserId);
  await sb.from("muse_notifications").insert({
    user_id: targetUserId, from_id: profile.id, type: "suspension",
    body: suspensionEnd ? `Your account has been suspended until ${new Date(suspensionEnd).toLocaleDateString()}` : "Your account has been permanently banned",
    read: false
  });
  await sb.from("muse_admin_audit_log").insert({ admin_user_id: profile.id, query_text: `suspend_user:${targetUserId}:${suspensionEnd ? "until " + suspensionEnd : "permanent"}:${String(reason || "").slice(0, 300)}` });
  return NextResponse.json({ success: true });
};

ACTIONS["admin-scan-nsfw"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "admin-scan-nsfw", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, all } = rest;

  let profilesToScan: { id: string; avatar: string; name: string }[] = [];
  if (all) {
    const { data } = await sb.from("muse_profiles").select("id, avatar, name").eq("nsfw", false).not("avatar", "eq", "").limit(100);
    profilesToScan = data || [];
  } else if (userId) {
    const { data } = await sb.from("muse_profiles").select("id, avatar, name").eq("id", userId).maybeSingle();
    if (data) profilesToScan = [data];
  } else {
    return NextResponse.json({ error: "Provide userId or all:true" }, { status: 400 });
  }

  let scanned = 0, flagged = 0, errors = 0;
  for (const p of profilesToScan) {
    if (!p.avatar || p.avatar.startsWith("/")) { continue; }
    let avatarUrl: URL;
    try { avatarUrl = new URL(p.avatar); } catch { errors++; continue; }
    const allowedHosts = ["supabase.co", "supabase.in", "vercel.app", "vercel.storage", "cloudinary.com", "amazonaws.com"];
    const hostOk = allowedHosts.some(h => avatarUrl.hostname.endsWith(`.${h}`) || avatarUrl.hostname === h);
    if (!hostOk || avatarUrl.protocol !== "https:") { errors++; continue; }

    try {
      const resp = await fetch(avatarUrl.toString(), { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) { errors++; continue; }
      const buf = Buffer.from(await resp.arrayBuffer());
      const result = await scanWithRekognition(buf);
      await logScan({ userId: p.id, fileName: "avatar-scan", fileType: "image/jpeg", fileSize: buf.length, context: "admin-scan", result });
      scanned++;
      if (result.scanned && result.flaggedCategories.some(c => /^suggestive/i.test(c))) {
        await sb.from("muse_profiles").update({ nsfw: true }).eq("id", p.id);
        flagged++;
      }
    } catch { errors++; }
  }
  await sb.from("muse_admin_audit_log").insert({ admin_user_id: profile.id, query_text: `scan_nsfw:${all ? "all" : String(userId)}:scanned=${scanned}:flagged=${flagged}:errors=${errors}` });
  return NextResponse.json({ success: true, scanned, flagged, errors, total: profilesToScan.length });
};

// ═══ QUESTS ═══

ACTIONS["get-quests"] = async ({ sb, profile }) => {
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
};

ACTIONS["track-quest"] = async ({ sb, profile, rest, ip }) => {
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
};

ACTIONS["claim-quest"] = async ({ sb, profile, rest, ip }) => {
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
};

// ═══ ADMIN — CONTENT SCANS ═══

ACTIONS["admin-content-scans"] = async ({ sb, profile }) => {
  if (!isAdminEmail(profile.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [scans, incidents] = await Promise.all([
    sb.from("muse_content_scans")
      .select("id, user_id, file_name, file_type, context, safe, flagged_categories, confidence, should_block, should_report, is_csam, scanned_at")
      .order("scanned_at", { ascending: false }).limit(100),
    sb.from("muse_safety_incidents")
      .select("id, user_id, type, severity, details, status, created_at")
      .in("status", ["pending_review", "pending_ncmec"])
      .order("created_at", { ascending: false }).limit(100),
  ]);
  return NextResponse.json({ scans: scans.data || [], incidents: incidents.data || [] });
};

ACTIONS["search"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRate(ip, "search", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { query, type = "all", limit = 20, cursor } = rest;
  if (!query || query.trim().length < 2) return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  const q = query.trim();
  const results: any = { users: [], briefs: [], communities: [] };

  if (type === "all" || type === "users") {
    const { data: users } = await sb.from("muse_profiles")
      .select("id, name, type, avatar, loc, bio, styles, looking, verified, tier")
      .or(`name.ilike.%${q}%,bio.ilike.%${q}%,loc.ilike.%${q}%`)
      .limit(limit);
    results.users = users || [];
  }

  if (type === "all" || type === "briefs") {
    const { data: briefs } = await sb.from("muse_briefs")
      .select("id, title, description, type, budget, status, creator_id(name, avatar)")
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .eq("status", "open")
      .limit(limit);
    results.briefs = briefs || [];
  }

  if (type === "all" || type === "communities") {
    const { data: communities } = await sb.from("muse_communities")
      .select("id, name, description, cat, members, nsfw, img")
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,cat.ilike.%${q}%`)
      .limit(limit);
    results.communities = communities || [];
  }

  return NextResponse.json({ success: true, results });
};

ACTIONS["admin-resolve-incident"] = async ({ sb, profile, rest }) => {
  if (!isAdminEmail(profile.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { incidentId } = rest;
  if (!incidentId || !UUID_RE.test(String(incidentId))) return NextResponse.json({ error: "incidentId required" }, { status: 400 });
  const { error } = await sb.from("muse_safety_incidents").update({ status: "reviewed" }).eq("id", incidentId);
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_admin_audit_log").insert({ admin_user_id: profile.id, query_text: `resolve_incident:${incidentId}` });
  return NextResponse.json({ success: true });
};

ACTIONS["get-notifications"] = async ({ sb, profile, rest }) => {
  const { limit = 50, offset = 0, unreadOnly = false, type } = rest;
  let query = sb.from("muse_notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (unreadOnly) query = query.eq("read", false);
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) return safeServerError(error, "notifications fetch");
  return NextResponse.json({ success: true, notifications: data || [] });
};

ACTIONS["mark-all-notifications-read"] = async ({ sb, profile }) => {
  const { error } = await sb.from("muse_notifications").update({ read: true }).eq("user_id", profile.id).eq("read", false);
  if (error) return safeServerError(error, "mark all read");
  return NextResponse.json({ success: true });
};

ACTIONS["report-bug"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRateUser(profile.id, "report-bug", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { category, description, steps, expected, actual } = rest;
  if (!category || !description) return NextResponse.json({ error: "category and description required" }, { status: 400 });
  const safeCategory = sanitizeText(String(category), 50);
  const safeDesc = sanitizeText(String(description), 2000);
  const safeSteps = sanitizeText(String(steps || ""), 2000);
  const safeExpected = sanitizeText(String(expected || ""), 1000);
  const safeActual = sanitizeText(String(actual || ""), 1000);
  const { error } = await sb.from("muse_activity_log").insert({
    user_id: profile.id,
    action: "bug-report",
    details: { category: safeCategory, description: safeDesc, steps: safeSteps, expected: safeExpected, actual: safeActual },
  });
  if (error) return safeServerError(error, "log bug report");
  const ADMIN_EMAIL = "info@wyzdesign.com";
  const subject = `[Muse Bug] ${safeCategory}`;
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#FF69B4">Bug Report</h2>
    <p><strong>From:</strong> ${profile.name || "Unknown"} (${profile.id})</p>
    <p><strong>Category:</strong> ${safeCategory}</p>
    <p><strong>Description:</strong></p><p>${safeDesc.replace(/\n/g, "<br>")}</p>
    ${safeSteps ? `<p><strong>Steps to reproduce:</strong></p><p>${safeSteps.replace(/\n/g, "<br>")}</p>` : ""}
    ${safeExpected ? `<p><strong>Expected:</strong> ${safeExpected}</p>` : ""}
    ${safeActual ? `<p><strong>Actual:</strong> ${safeActual}</p>` : ""}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#999;font-size:12px">Muse Bug Report System</p>
  </div>`;
  sendEmail({ to: ADMIN_EMAIL, subject, html }).catch(() => {});
  return NextResponse.json({ success: true });
};

ACTIONS["submit-idea"] = async ({ sb, profile, rest, ip }) => {
  if (!await checkRateUser(profile.id, "submit-idea", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { title, description, category } = rest;
  if (!title || !description) return NextResponse.json({ error: "title and description required" }, { status: 400 });
  const safeTitle = sanitizeText(String(title), 200);
  const safeDesc = sanitizeText(String(description), 2000);
  const safeCategory = sanitizeText(String(category || "general"), 50);
  const { error } = await sb.from("muse_activity_log").insert({
    user_id: profile.id,
    action: "idea-submission",
    details: { title: safeTitle, description: safeDesc, category: safeCategory },
  });
  if (error) return safeServerError(error, "log idea submission");
  const ADMIN_EMAIL = "info@wyzdesign.com";
  const subject = `[Muse Idea] ${safeTitle}`;
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#FFD700">Feature Idea</h2>
    <p><strong>From:</strong> ${profile.name || "Unknown"} (${profile.id})</p>
    <p><strong>Category:</strong> ${safeCategory}</p>
    <p><strong>Title:</strong> ${safeTitle}</p>
    <p><strong>Description:</strong></p><p>${safeDesc.replace(/\n/g, "<br>")}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#999;font-size:12px">Muse Feature Idea System</p>
  </div>`;
  sendEmail({ to: ADMIN_EMAIL, subject, html }).catch(() => {});
  return NextResponse.json({ success: true });
};

export async function GET(req: NextRequest) {
  try {
    const sb = getServiceClient();
    const type = req.nextUrl.searchParams.get("type") || "profiles";
    const token = bearerTokenFromReq(req);
    let user: { id: string } | null = null;
    let profileId: string | null = null;
    if (token) {
      const { data: authData } = await supabase.auth.getUser(token);
      if (authData.user) {
        user = { id: authData.user.id };
        const { data: prof } = await sb.from("muse_profiles").select("id").eq("auth_id", authData.user.id).maybeSingle();
        profileId = prof?.id ?? null;
      }
    }

    if (type === "profiles") {
      // NSFW gating: only surface nsfw profiles/photos if the requesting user
      // has passed age verification. Enforced server-side (the client blur is
      // cosmetic, not a control). Default deny unless the viewer is verified.
      let viewerVerified = false;
      if (profileId) {
        const { data: vp } = await sb.from("muse_profiles").select("age_verified").eq("id", profileId).maybeSingle();
        viewerVerified = !!(vp && (vp as any).age_verified);
      }
      const { data } = await sb.from("muse_profiles").select("id, name, type, avatar, bio, loc, styles, looking, photos, suspended, nsfw").limit(100);
      // Blocks were write-only until now — muse_blocks was never consulted
      // anywhere, so a blocked user could still show up in Discover, match,
      // and message the person who blocked them. Filter both directions:
      // people I've blocked, and people who've blocked me.
      let blockedIds = new Set<string>();
      if (profileId) {
        const { data: blocks } = await sb.from("muse_blocks").select("user_id, target_id").or(`user_id.eq.${profileId},target_id.eq.${profileId}`);
        blockedIds = new Set((blocks || []).map((b: any) => (String(b.user_id) === String(profileId) ? String(b.target_id) : String(b.user_id))));
      }
      const visible = (data || []).filter((p: any) => {
        if (profileId && String(p.id) === String(profileId)) return false;
        if (blockedIds.has(String(p.id))) return false;
        if (p.suspended) return false;
        if (p.nsfw && !viewerVerified) return false;
        const hasAvatar = typeof p.avatar === "string" && p.avatar.trim().length > 0;
        const hasPhotos = Array.isArray(p.photos) && p.photos.length > 0;
        return hasAvatar || hasPhotos;
      }).map((p: any) => {
        // Strip NSFW photos entirely unless the viewer is verified.
        if (p.nsfw && !viewerVerified) return { ...p, photos: undefined, avatar: undefined };
        return p;
      });
      return NextResponse.json({ profiles: visible });
    }

    if (type === "matches" && profileId) {
      const { data } = await sb.from("muse_matches").select("id, user_id, target_id(id, name, type, avatar, bio, loc, styles, looking, zodiac, chinese, mbti, life_path, last_seen_at)").eq("user_id", profileId);
      return NextResponse.json({ matches: data || [] });
    }

    if (type === "messages" && profileId) {
      const matchId = req.nextUrl.searchParams.get("match_id");
      if (!matchId) return NextResponse.json({ messages: [] });
      // Participant-only reads: the convo key embeds both profile ids, so an
      // arbitrary match_id can only be queried by one of the two people in it.
      if (!isConvoParticipant(matchId, profileId)) {
        return NextResponse.json({ error: "Not a conversation participant" }, { status: 403 });
      }
      const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "200", 10) || 200, 500);
      const before = req.nextUrl.searchParams.get("before") || undefined;
      // Oldest-first (correct chat display order) so clients can render raw without reversing.
      let query = sb.from("muse_messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true }).limit(limit);
      if (before) query = query.lt("created_at", before);
      const { data } = await query;
      return NextResponse.json({ messages: data || [] });
    }

    if (type === "feed") {
      // last_seen_at joined so the client can render an online indicator on
      // each post's author, same presence signal already used for matches
      // (see useDiscoveryData.ts's `online` computation).
      const { data } = await sb.from("muse_feed_posts").select("*, author_id(id, name, avatar, last_seen_at)").order("created_at", { ascending: false }).limit(50);
      return NextResponse.json({ posts: data || [] });
    }

    if (type === "briefs") {
      const { data } = await sb.from("muse_briefs").select("*, author_id(id, name, avatar)").order("created_at", { ascending: false }).limit(50);
      return NextResponse.json({ briefs: data || [] });
    }

    if (type === "forum") {
      const { data } = await sb.from("muse_forum_posts").select("*, author_id(id, name, avatar)").order("created_at", { ascending: false }).limit(50);
      return NextResponse.json({ posts: data || [] });
    }

    if (type === "events") {
      const { data } = await sb.from("muse_events").select("*").limit(50);
      return NextResponse.json({ events: data || [] });
    }

    if (type === "rsvps") {
      if (!profileId) return NextResponse.json({ rsvps: [] });
      const { data } = await sb.from("muse_rsvps").select("event_id").eq("user_id", profileId);
      return NextResponse.json({ rsvps: (data || []).map((r: any) => r.event_id) });
    }

    if (type === "export") {
      const authSb = getServiceClient();
      const header = req.headers.get("authorization") || "";
      const bearer = header.replace(/^Bearer\s+/i, "").trim();
      const token = bearer;
      if (!token) return NextResponse.json({ error: "Authorization header required" }, { status: 400 });
      const { data: authUser, error: authErr } = await authSb.auth.getUser(token);
      if (authErr || !authUser.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

      const { data: profile } = await sb.from("muse_profiles").select("*").eq("auth_id", authUser.user.id).single();
      if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      const pid = profile.id;

      const [messages, matches, feed, briefs, forum, connections, communityMembers, bookings, notifications] = await Promise.all([
        sb.from("muse_messages").select("*").or(`sender_id.eq.${pid},receiver_id.eq.${pid}`).limit(5000),
        sb.from("muse_matches").select("*").or(`user_id.eq.${pid},target_id.eq.${pid}`).limit(5000),
        sb.from("muse_feed_posts").select("*").eq("author_id", pid).limit(2000),
        sb.from("muse_briefs").select("*").eq("author_id", pid).limit(2000),
        sb.from("muse_forum_posts").select("*").eq("author_id", pid).limit(2000),
        sb.from("muse_connections").select("*").or(`user_id.eq.${pid},target_id.eq.${pid}`).limit(5000),
        sb.from("muse_community_members").select("*").eq("user_id", pid).limit(2000),
        sb.from("muse_bookings").select("*").eq("user_id", pid),
        sb.from("muse_notifications").select("*").or(`user_id.eq.${pid},from_id.eq.${pid}`),
      ]);

      return NextResponse.json({
        exportedAt: new Date().toISOString(),
        auth: { id: authUser.user.id, email: authUser.user.email },
        muse_profiles: profile,
        muse_messages: messages.data || [],
        muse_matches: matches.data || [],
        muse_feed_posts: feed.data || [],
        muse_briefs: briefs.data || [],
        muse_forum_posts: forum.data || [],
        muse_connections: connections.data || [],
        muse_community_members: communityMembers.data || [],
        muse_bookings: bookings.data || [],
        muse_notifications: notifications.data || [],
      });
    }

    if (type === "communities") {
      const { data } = await sb.from("muse_communities").select("*").order("member_count", { ascending: false }).limit(20);
      return NextResponse.json({ communities: data || [] });
    }

    if (type === "sessions") {
      const { data } = await sb.from("muse_sessions").select("*").order("date", { ascending: true }).limit(20);
      return NextResponse.json({ sessions: data || [] });
    }

    if (type === "professionals") {
      const { data } = await sb.from("muse_professionals").select("*").order("created_at", { ascending: false }).limit(50);
      // muse_professionals.user_id references auth.users, not muse_profiles — resolve
      // each professional's real profile id so the client's connect action targets
      // something the handler can actually find (was silently 400ing for real pros).
      const rows = data || [];
      const userIds = rows.map((p: any) => p.user_id).filter(Boolean);
      let profileIdByAuthId = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await sb.from("muse_profiles").select("id, auth_id").in("auth_id", userIds);
        profileIdByAuthId = new Map((profiles || []).map((pr: any) => [pr.auth_id, pr.id]));
      }
      return NextResponse.json({ professionals: rows.map((p: any) => ({ ...p, profileId: profileIdByAuthId.get(p.user_id) || null })) });
    }

    if (type === "reviews") {
      const targetProfileId = req.nextUrl.searchParams.get("profile_id") || (profileId || "");
      if (!targetProfileId) return NextResponse.json({ error: "profile_id required" }, { status: 400 });
      if (!UUID_RE.test(targetProfileId)) return NextResponse.json({ reviews: [] });
      const { data } = await sb.from("muse_reviews")
        .select("id, rating, body, created_at, reviewer_id(name, avatar, type)")
        .eq("reviewee_id", targetProfileId)
        .order("created_at", { ascending: false })
        .limit(50);
      return NextResponse.json({ reviews: data || [] });
    }

    if (type === "moments") {
      const { data } = await sb.from("muse_moments")
        .select("id, text, img, type, likes, comments, created_at, author_id(name, avatar)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      return NextResponse.json({ moments: data || [] });
    }

    if (type === "bookings") {
      if (!profileId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      const { data: asBooker } = await sb.from("muse_bookings")
        .select("id, status, created_at, completed_at, session_id(id, title, type, rate, duration, img), host_id(id, name, avatar, type)")
        .eq("user_id", profileId).order("created_at", { ascending: false });
      const { data: asHost } = await sb.from("muse_bookings")
        .select("id, status, created_at, completed_at, session_id(id, title, type, rate, duration, img), user_id(id, name, avatar, type)")
        .eq("host_id", profileId).order("created_at", { ascending: false });
      // The "Pay" button (client) needs to know whether a booking has already
      // been paid for (held in escrow or fully captured) so it can hide once
      // paid, rather than staying visible forever since a booking's own
      // `status` tracks session confirmation, not payment.
      const bookingIds = [...(asBooker || []), ...(asHost || [])].map((b: any) => b.id);
      let paymentStatusByBooking: Record<string, string> = {};
      if (bookingIds.length) {
        const { data: payments } = await sb.from("muse_booking_payments").select("booking_id, status").in("booking_id", bookingIds);
        for (const p of payments || []) paymentStatusByBooking[String((p as any).booking_id)] = (p as any).status;
      }
      const withPaymentStatus = (rows: any[] | null) => (rows || []).map(b => ({ ...b, payment_status: paymentStatusByBooking[String(b.id)] || null }));
      return NextResponse.json({ asBooker: withPaymentStatus(asBooker), asHost: withPaymentStatus(asHost) });
    }

    if (type === "my-reports" && user) {
      const { data: myReports } = await sb.from("muse_reports")
        .select("id, target_type, reason, status, created_at")
        .eq("reporter_id", profileId)
        .order("created_at", { ascending: false })
        .limit(50);
      return NextResponse.json({ reports: myReports || [] });
    }

    if (type === "my-stats" && user) {
      const { count: likesReceived } = await sb.from("muse_matches")
        .select("*", { count: "exact", head: true })
        .eq("target_id", profileId);
      const { data: me } = await sb.from("muse_profiles").select("views_count").eq("id", profileId).maybeSingle();
      return NextResponse.json({ views: (me as any)?.views_count || 0, likesReceived: likesReceived || 0 });
    }

    if (type === "my-analytics" && user) {
      // Profile views over time (last 30 days from activity log)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: viewsLog } = await sb.from("muse_activity_log")
        .select("created_at")
        .eq("user_id", profileId)
        .eq("type", "profile_view")
        .gte("created_at", thirtyDaysAgo);

      // Matches received
      const { count: matchesReceived } = await sb.from("muse_matches")
        .select("*", { count: "exact", head: true })
        .eq("target_id", profileId);

      // Messages sent
      const { count: messagesSent } = await sb.from("muse_messages")
        .select("*", { count: "exact", head: true })
        .eq("from_id", profileId);

      // Brief applications
      const { count: briefApplications } = await sb.from("muse_brief_applications")
        .select("*", { count: "exact", head: true })
        .eq("applicant_id", profileId);

      // Bookings as host
      const { count: bookingsAsHost } = await sb.from("muse_bookings")
        .select("*", { count: "exact", head: true })
        .eq("host_id", profileId);

      // Bookings as booker
      const { count: bookingsAsBooker } = await sb.from("muse_bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profileId);

      // Earnings (completed bookings as host)
      const { data: completedBookings } = await sb.from("muse_bookings")
        .select("id")
        .eq("host_id", profileId)
        .eq("status", "completed");
      const bookingIds = (completedBookings || []).map(b => b.id);
      let totalEarnings = 0;
      if (bookingIds.length) {
        const { data: payments } = await sb.from("muse_booking_payments")
          .select("amount_cents, status")
          .in("booking_id", bookingIds)
          .eq("status", "succeeded");
        totalEarnings = (payments || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);
      }

      // Profile views (current total)
      const { data: me } = await sb.from("muse_profiles").select("views_count").eq("id", profileId).maybeSingle();

      return NextResponse.json({
        views: (me as any)?.views_count || 0,
        viewsLast30Days: viewsLog?.length || 0,
        matchesReceived: matchesReceived || 0,
        messagesSent: messagesSent || 0,
        briefApplications: briefApplications || 0,
        bookingsAsHost: bookingsAsHost || 0,
        bookingsAsBooker: bookingsAsBooker || 0,
        totalEarningsCents: totalEarnings,
        totalEarningsUsd: (totalEarnings / 100).toFixed(2),
      });
    }

    if (type === "notifications" && user) {
      const { data: profile } = await sb.from("muse_profiles").select("id").eq("auth_id", user.id).maybeSingle();
      if (!profile) return NextResponse.json({ notifications: [] });
      const { data } = await sb.from("muse_notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(30);
      return NextResponse.json({ notifications: data || [] });
    }

    // Albums: visibility is enforced here in application code, not by Postgres
    // RLS, because this route reads with the service-role client (bypasses
    // RLS by design). The RLS policies on muse_albums/muse_album_photos still
    // exist as defense-in-depth for any future direct client-side query.
    if (type === "albums") {
      let targetProfileId = req.nextUrl.searchParams.get("profile_id");
      if (!targetProfileId) return NextResponse.json({ error: "profile_id required" }, { status: 400 });
      if (targetProfileId === "me") {
        if (!profileId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        targetProfileId = profileId;
      } else if (!UUID_RE.test(targetProfileId)) {
        return NextResponse.json({ albums: [] });
      }
      const isOwner = !!profileId && String(profileId) === String(targetProfileId);
      let query = sb.from("muse_albums").select("id, profile_id, title, description, cover_url, access_level, tags, position, view_count, like_count, created_at").eq("profile_id", targetProfileId).order("position");
      const { data: albums, error } = await query;
      if (error) return safeServerError(error, "db op");
      let visible = albums || [];
      if (!isOwner) {
        const inviteAlbumIds = (albums || []).filter((a: any) => a.access_level === "invite").map((a: any) => a.id);
        let grantedIds = new Set<string>();
        if (profileId && inviteAlbumIds.length) {
          const { data: grants } = await sb.from("muse_album_access").select("album_id").eq("viewer_profile_id", profileId).in("album_id", inviteAlbumIds);
          grantedIds = new Set((grants || []).map((g: any) => g.album_id));
        }
        visible = (albums || []).filter((a: any) => a.access_level === "public" || (a.access_level === "invite" && grantedIds.has(a.id)));
      }
      // Attach photo counts without exposing photo rows for albums the viewer can't open.
      const albumIds = visible.map((a: any) => a.id);
      let counts: Record<string, number> = {};
      if (albumIds.length) {
        const { data: photoRows } = await sb.from("muse_album_photos").select("album_id").in("album_id", albumIds);
        for (const row of photoRows || []) counts[row.album_id] = (counts[row.album_id] || 0) + 1;
      }
      return NextResponse.json({ albums: visible.map((a: any) => ({ ...a, photo_count: counts[a.id] || 0 })) });
    }

    if (type === "album-photos") {
      const albumId = req.nextUrl.searchParams.get("album_id");
      if (!albumId) return NextResponse.json({ error: "album_id required" }, { status: 400 });
      if (!UUID_RE.test(albumId)) return NextResponse.json({ photos: [] });
      const { data: album } = await sb.from("muse_albums").select("id, profile_id, access_level").eq("id", albumId).maybeSingle();
      if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const isOwner = !!profileId && String(profileId) === String(album.profile_id);
      if (!isOwner && album.access_level === "private") {
        return NextResponse.json({ error: "This album is private" }, { status: 403 });
      }
      if (!isOwner && album.access_level === "invite") {
        const hasGrant = profileId ? !!(await sb.from("muse_album_access").select("id").eq("album_id", albumId).eq("viewer_profile_id", profileId).maybeSingle()).data : false;
        if (!hasGrant) return NextResponse.json({ error: "You don't have access to this album" }, { status: 403 });
      }
      const { data: photos, error } = await sb.from("muse_album_photos").select("id, img_url, caption, position, created_at").eq("album_id", albumId).order("position");
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ photos: photos || [] });
    }

    if (type === "admin-analytics") {
      const token = bearerTokenFromReq(req);
      if (!token) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authData.user) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { data: adminProfile } = await sb.from("muse_profiles").select("email").eq("auth_id", authData.user.id).maybeSingle();
      if (!isAdminEmail(adminProfile?.email)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7d = new Date(Date.now() - 7 * 86400000).toISOString();
      const since14d = new Date(Date.now() - 14 * 86400000).toISOString();

      const [signups30d, activity7d, activity14dPrior, eventCounts, recentEvents] = await Promise.all([
        sb.from("muse_profiles").select("created_at").gte("created_at", since30d),
        sb.from("muse_activity_log").select("user_id").gte("created_at", since7d),
        sb.from("muse_activity_log").select("user_id").gte("created_at", since14d).lt("created_at", since7d),
        sb.from("muse_events_log").select("name").gte("created_at", since30d).limit(5000),
        sb.from("muse_events_log").select("name, props, created_at").order("created_at", { ascending: false }).limit(50),
      ]);

      // Daily signup buckets for the last 30 days
      const signupsByDay: Record<string, number> = {};
      for (const row of signups30d.data || []) {
        const day = String(row.created_at).slice(0, 10);
        signupsByDay[day] = (signupsByDay[day] || 0) + 1;
      }

      // Simple week-over-week retention: users active in the prior 7-14 day
      // window who were also active in the most recent 7 days.
      const activeLastWeek = new Set((activity7d.data || []).map((r: any) => r.user_id).filter(Boolean));
      const activePriorWeek = new Set((activity14dPrior.data || []).map((r: any) => r.user_id).filter(Boolean));
      let retained = 0;
      activePriorWeek.forEach((id: any) => { if (activeLastWeek.has(id)) retained++; });
      const retentionRate = activePriorWeek.size > 0 ? Math.round((retained / activePriorWeek.size) * 100) : null;

      // Feature usage breakdown by event name
      const featureUsage: Record<string, number> = {};
      for (const row of eventCounts.data || []) {
        featureUsage[row.name] = (featureUsage[row.name] || 0) + 1;
      }

      const { count: totalUsers } = await sb.from("muse_profiles").select("*", { count: "exact", head: true });
      const { count: totalMatches } = await sb.from("muse_matches").select("*", { count: "exact", head: true });
      const { count: totalAlbums } = await sb.from("muse_albums").select("*", { count: "exact", head: true });

      // Referral stats (safe to query even if tables don't exist yet)
      let referrals = undefined;
      try {
        const { count: refTotal } = await sb.from("muse_referrals").select("*", { count: "exact", head: true });
        const { count: refSignedUp } = await sb.from("muse_referrals").select("*", { count: "exact", head: true }).neq("status", "pending");
        const { count: refRewarded } = await sb.from("muse_referrals").select("*", { count: "exact", head: true }).eq("status", "reward_issued");
        referrals = { total: refTotal || 0, signedUp: refSignedUp || 0, rewarded: refRewarded || 0 };
      } catch { /* table may not exist yet */ }

      // Payment stats
      let payments = undefined;
      let connectedAccounts = 0;
      try {
        const { data: payData } = await sb.from("muse_booking_payments").select("amount_cents, commission_cents, status");
        const succeeded = (payData || []).filter((p: any) => p.status === "succeeded");
        payments = {
          total: (payData || []).length,
          succeeded: succeeded.length,
          totalVolume: succeeded.reduce((s: number, p: any) => s + (p.amount_cents || 0), 0),
          totalCommission: succeeded.reduce((s: number, p: any) => s + (p.commission_cents || 0), 0),
        };
        const { count } = await sb.from("muse_stripe_connect").select("*", { count: "exact", head: true });
        connectedAccounts = count || 0;
      } catch { /* tables may not exist yet */ }

      // Audit log: recent 50 admin queries
      let auditLog: any[] = [];
      try {
        const { data: auditEntries } = await sb.from("muse_admin_audit_log")
          .select("*").order("created_at", { ascending: false }).limit(50);
        auditLog = auditEntries || [];
      } catch { /* table may not exist yet */ }

      return NextResponse.json({
        totals: { users: totalUsers || 0, matches: totalMatches || 0, albums: totalAlbums || 0 },
        signupsByDay,
        retention: { activeLastWeek: activeLastWeek.size, activePriorWeek: activePriorWeek.size, retainedCount: retained, retentionRatePct: retentionRate },
        featureUsage,
        recentEvents: recentEvents.data || [],
        referrals,
        payments,
        connectedAccounts,
        auditLog,
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e: unknown) {
    console.error("[GET /api/muse] Unhandled error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const safetyErr = await enforceRequestSafety(req);
    if (safetyErr) return safetyErr;

    const body = await req.json();
    const { type: rawType, action: rawAction, ...rest } = body;
    // `action` takes priority over `type` when both are present. The forum
    // sub-actions (get-replies/reply/vote) send both — {action:"forum",
    // type:"<verb>"} — expecting "forum" to route here and "<verb>" to be
    // read as the sub-verb below. The reverse priority made actionType
    // resolve to "reply"/"vote"/"get-replies" directly, matching no
    // top-level branch ("Unknown action type" on every forum reply/vote).
    // Every other call site sends exactly one of the two fields.
    const actionType = rawAction || rawType;

    const ip = clientIp(req);

    // Blanket write-rate ceiling per IP. Per-action limits below are tighter;
    // this catches any action that doesn't have its own check (and throttles
    // brute-force / scripted abuse across the whole write surface).
    if (actionType !== "track-event" && !await checkRate(ip, "write", 120)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    // track-event intentionally allows unauthenticated callers (e.g. an
    // anonymous visitor viewing the auth screen before signing up) — product
    // analytics needs to capture that funnel too, not just logged-in actions.
    if (actionType === "track-event") {
      if (!await checkRate(ip, "track-event", 120)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { name, props } = rest;
      if (!name || typeof name !== "string" || name.length > 100) {
        return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
      }
      const sbEvt = getServiceClient();
      const ua = req.headers.get("user-agent") || "";
      await sbEvt.from("muse_events_log").insert({ name, props: props && typeof props === "object" ? props : {}, ua: ua.slice(0, 300), ip: String(ip).slice(0, 100) });
      return NextResponse.json({ success: true });
    }

    if (actionType === "track-error") {
      if (!await checkRate(ip, "track-error", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { name, params, time } = rest;
      const sbErr = getServiceClient();
      await sbErr.from("muse_events_log").insert({
        name: `error:${name || "unknown"}`,
        props: { params: params || {}, time: time || new Date().toISOString(), ua: (req.headers.get("user-agent") || "").slice(0, 300) },
      });
      return NextResponse.json({ success: true });
    }

    const { user, profile } = await getAuthedProfile(req, body);
    if (!user || !profile) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Enforcement: suspended accounts are locked out of all mutating actions.
    if ((profile as any).suspended) {
      return NextResponse.json({ error: "Account suspended", code: "ACCOUNT_SUSPENDED" }, { status: 403 });
    }

    const sb = getServiceClient();
    const handler = ACTIONS[actionType];
    if (!handler) return NextResponse.json({ error: "Unknown action type" }, { status: 400 });

    return await handler({ sb, profile: profile as ActionContext["profile"], rest, ip, req, rawType });
  } catch (e: unknown) {
    return safeServerError(e, "muse route");
  }
}

