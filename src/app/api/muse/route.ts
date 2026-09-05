import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { safeServerError } from "@/lib/http";
import { checkRate, checkRateUser, clientIp } from "@/lib/rate-limit";
import { enforceRequestSafety, sanitizeText } from "@/lib/request-safety";
import { screenText, moderateText } from "@/lib/aiModeration";
import { sendEmail, notify } from "@/lib/email";
import { pushToProfile } from "@/lib/push";
import { bumpQuest, setQuestProgress } from "@/lib/questEngine";
import {
  UUID_RE, getAuthUser, emailProfile, STRIKE_SUSPENSION_THRESHOLD, applyStrikeAndEscalate,
  getAuthedProfile, bearerTokenFromReq, isAdminEmail, MAX_LENGTHS, validateInput, isConvoParticipant,
  type ActionContext, type ActionHandler,
} from "@/lib/muse-actions/shared";
import { questGetQuests, questTrackQuest, questClaimQuest } from "@/lib/muse-actions/quests";
import { albumCreate, albumUpdate, albumDelete, albumAddPhoto, albumRemovePhoto, albumGrantAccess, albumRevokeAccess, albumListAccess, albumView, albumLike } from "@/lib/muse-actions/albums";
import { feedbackGetNotifications, feedbackMarkAllRead, feedbackReportBug, feedbackSubmitIdea } from "@/lib/muse-actions/feedback";
import { adminResolveAppeal, adminBrain, adminReports, adminStrikes, adminSuspendUser, adminScanNsfw, adminContentScans, adminResolveIncident } from "@/lib/muse-actions/admin";
import { disclosureCreate, disclosureConfirm, disclosureGet, strikesGet, strikeAppeal } from "@/lib/muse-actions/disclosures";
import { communityJoin, communityLeave, communityCreate, eventCreate, eventRsvp, eventCancelRsvp } from "@/lib/muse-actions/communities";
import { sessionBook, sessionCreate, bookingRespond, bookingCancel, bookingComplete, reviewSubmit, checkinRespond, checkinsGet, safetyDetailsShare, safetyProfileSave, safetyProfileGet, promptsGet, promptResponseSave, promptResponsesGet } from "@/lib/muse-actions/sessions";
import { connectRequest } from "@/lib/muse-actions/connect";
import { profileUpdate } from "@/lib/muse-actions/profile";
import { matchCreate, matchDelete, profileViewTrack } from "@/lib/muse-actions/matching";
import { messageSend } from "@/lib/muse-actions/messaging";
import { feedPost, feedPostLike, feedCommentAdd, momentCreate, momentLike, briefCreate, briefApply } from "@/lib/muse-actions/feed";

// ══════════════════════════════════════════════════════════════════════════════
// ACTION HANDLER REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

const ACTIONS: Record<string, ActionHandler> = {};

// ═══ PROFILE ═══
// Handler extracted to lib/muse-actions/profile.ts (monolith split, interleaved-domain pass).

ACTIONS["profile"] = profileUpdate;

// ═══ MATCHING & DISCOVERY ═══
// Handlers extracted to lib/muse-actions/matching.ts (monolith split, interleaved-domain pass).

ACTIONS["match"] = matchCreate;
ACTIONS["unmatch"] = matchDelete;
ACTIONS["track-view"] = profileViewTrack;

// ═══ MESSAGING ═══
// Handler extracted to lib/muse-actions/messaging.ts (monolith split, interleaved-domain pass).

ACTIONS["message"] = messageSend;

// ═══ FEED & MOMENTS, BRIEFS ═══
// Handlers extracted to lib/muse-actions/feed.ts (monolith split, interleaved-domain pass).

ACTIONS["feed"] = feedPost;
ACTIONS["like-feed-post"] = feedPostLike;
ACTIONS["feed-comment"] = feedCommentAdd;
ACTIONS["create-moment"] = momentCreate;
ACTIONS["like-moment"] = momentLike;
ACTIONS["brief"] = briefCreate;
ACTIONS["brief-apply"] = briefApply;

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

// ═══ COMMUNITIES & EVENTS ═══
// Handlers extracted to lib/muse-actions/communities.ts (monolith split, interleaved-domain pass).

ACTIONS["join-community"] = communityJoin;
ACTIONS["leave-community"] = communityLeave;
ACTIONS["create-community"] = communityCreate;
ACTIONS["create-event"] = eventCreate;
ACTIONS["rsvp"] = eventRsvp;
ACTIONS["cancel-rsvp"] = eventCancelRsvp;

// ═══ SESSIONS & BOOKINGS ═══
// Handlers extracted to lib/muse-actions/sessions.ts (monolith split, interleaved-domain pass).

ACTIONS["book-session"] = sessionBook;
ACTIONS["create-session"] = sessionCreate;

// ═══ CONNECTIONS ═══
// Handler extracted to lib/muse-actions/connect.ts (monolith split, interleaved-domain pass).

ACTIONS["connect"] = connectRequest;

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
// Handlers extracted to lib/muse-actions/albums.ts (monolith decoupling, no dispatch change).

ACTIONS["create-album"] = albumCreate;
ACTIONS["update-album"] = albumUpdate;
ACTIONS["delete-album"] = albumDelete;
ACTIONS["add-album-photo"] = albumAddPhoto;
ACTIONS["remove-album-photo"] = albumRemovePhoto;
ACTIONS["grant-album-access"] = albumGrantAccess;
ACTIONS["revoke-album-access"] = albumRevokeAccess;
ACTIONS["list-album-access"] = albumListAccess;
ACTIONS["view-album"] = albumView;
ACTIONS["like-album"] = albumLike;

// ═══ DISCLOSURES & STRIKES ═══
// Handlers extracted to lib/muse-actions/disclosures.ts (monolith split, interleaved-domain pass).

ACTIONS["create-disclosure"] = disclosureCreate;
ACTIONS["confirm-disclosure"] = disclosureConfirm;
ACTIONS["get-disclosures"] = disclosureGet;
ACTIONS["get-strikes"] = strikesGet;
ACTIONS["appeal-strike"] = strikeAppeal;

// ═══ ADMIN ═══
// Handlers extracted to lib/muse-actions/admin.ts (monolith split, interleaved-domain pass).

ACTIONS["admin-resolve-appeal"] = adminResolveAppeal;

// ═══ BOOKING MANAGEMENT, CHECK-INS, SAFETY PROFILE & PROMPTS ═══
// Handlers extracted to lib/muse-actions/sessions.ts (monolith split, interleaved-domain pass).

ACTIONS["respond-booking"] = bookingRespond;
ACTIONS["cancel-booking"] = bookingCancel;
ACTIONS["complete-booking"] = bookingComplete;
ACTIONS["submit-review"] = reviewSubmit;
ACTIONS["respond-checkin"] = checkinRespond;
ACTIONS["get-checkins"] = checkinsGet;
ACTIONS["share-safety-details"] = safetyDetailsShare;
ACTIONS["save-safety-profile"] = safetyProfileSave;
ACTIONS["get-safety-profile"] = safetyProfileGet;
ACTIONS["get-prompts"] = promptsGet;
ACTIONS["save-prompt-response"] = promptResponseSave;
ACTIONS["get-prompt-responses"] = promptResponsesGet;

ACTIONS["admin-brain"] = adminBrain;

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

ACTIONS["admin-reports"] = adminReports;
ACTIONS["admin-strikes"] = adminStrikes;
ACTIONS["admin-suspend-user"] = adminSuspendUser;
ACTIONS["admin-scan-nsfw"] = adminScanNsfw;

// ═══ QUESTS ═══
// Handlers extracted to lib/muse-actions/quests.ts (monolith decoupling, no dispatch change).

ACTIONS["get-quests"] = questGetQuests;
ACTIONS["track-quest"] = questTrackQuest;
ACTIONS["claim-quest"] = questClaimQuest;

ACTIONS["admin-content-scans"] = adminContentScans;

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

ACTIONS["admin-resolve-incident"] = adminResolveIncident;

ACTIONS["get-notifications"] = feedbackGetNotifications;
ACTIONS["mark-all-notifications-read"] = feedbackMarkAllRead;
ACTIONS["report-bug"] = feedbackReportBug;
ACTIONS["submit-idea"] = feedbackSubmitIdea;

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

