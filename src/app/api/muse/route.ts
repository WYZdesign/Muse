import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";

function getAuthUser() {
  return supabase.auth.getUser();
}

/**
 * Resolve the caller's identity from a verified session token.
 * Token is read from the Authorization: Bearer header first, then from
 * body.access_token (back-compat for existing client calls). We verify it
 * with supabase.auth.getUser(token) — never trust the client's claimed id.
 * Returns the auth user + their muse_profiles row, or nulls if unauthenticated.
 */
async function getAuthedProfile(req: NextRequest, body?: Record<string, unknown>) {
  const header = req.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const token = bearer || (body && typeof body.access_token === "string" ? body.access_token : "") || "";
  if (!token) return { user: null, profile: null };
  // Verify with the anon client (canonical token verifier). Service client
  // also works but anon is the safe, non-privileged verifier.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { user: null, profile: null };
  const authId = data.user.id;
  const sb = getServiceClient();
  const { data: profile } = await sb
    .from("muse_profiles")
    .select("id, name, avatar, email, tier")
    .eq("auth_id", authId)
    .maybeSingle();
  return { user: data.user, profile };
}

function bearerTokenFromReq(req: NextRequest, body?: Record<string, unknown>): string {
  const header = req.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return bearer;
  if (body && typeof body.access_token === "string") return body.access_token;
  return "";
}

const RATE_LIMIT = new Map<string, number[]>();
function checkRate(ip: string, action: string, maxPerMin: number): boolean {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const timestamps = (RATE_LIMIT.get(key) || []).filter(t => now - t < 60000);
  if (timestamps.length >= maxPerMin) return false;
  timestamps.push(now);
  RATE_LIMIT.set(key, timestamps);
  return true;
}

const MAX_LENGTHS: Record<string, number> = { title: 200, body: 5000, text: 2000, bio: 500, name: 50, desc: 2000 };
function validateInput(data: Record<string, unknown>): string | null {
  for (const [k, max] of Object.entries(MAX_LENGTHS)) {
    if (data[k] && typeof data[k] === "string" && (data[k] as string).length > max) return `${k} too long (max ${max})`;
  }
  return null;
}

/**
 * True when the given profile id is one of the two participants encoded in a
 * convo match_id (format: `[a,b].sort().join("__")`). Convo keys are opaque to
 * callers — reading or writing a conversation requires being a participant.
 */
function isConvoParticipant(matchId: string, profileId: string): boolean {
  if (!matchId || !profileId) return false;
  const parts = matchId.split("__");
  return parts.includes(profileId);
}

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
      const { data } = await sb.from("muse_profiles").select("id, name, type, avatar, bio, loc, styles, looking, photos").limit(100);
      const visible = (data || []).filter((p: any) => {
        if (profileId && String(p.id) === String(profileId)) return false;
        const hasAvatar = typeof p.avatar === "string" && p.avatar.trim().length > 0;
        const hasPhotos = Array.isArray(p.photos) && p.photos.length > 0;
        return hasAvatar || hasPhotos;
      });
      return NextResponse.json({ profiles: visible });
    }

    if (type === "matches" && profileId) {
      const { data } = await sb.from("muse_matches").select("id, user_id, target_id(id, name, type, avatar, bio, loc, styles, looking, zodiac, chinese, mbti, life_path)").eq("user_id", profileId);
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
      const { data } = await sb.from("muse_messages").select("*").eq("match_id", matchId).order("created_at");
      return NextResponse.json({ messages: data || [] });
    }

    if (type === "feed") {
      const { data } = await sb.from("muse_feed_posts").select("*, author_id(id, name, avatar)").order("created_at", { ascending: false }).limit(50);
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

    if (type === "admin") {
      // Require a verified session token, not just a matching email param.
      const token = bearerTokenFromReq(req);
      if (!token) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const sbAuth = supabase;
      const { data: authData, error: authErr } = await sbAuth.auth.getUser(token);
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      if (authErr || !authData.user?.email || !admins.includes(authData.user.email.toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { count: totalUsers } = await sb.from("muse_profiles").select("*", { count: "exact", head: true });
      const { count: totalMatches } = await sb.from("muse_matches").select("*", { count: "exact", head: true });
      const { count: totalMessages } = await sb.from("muse_messages").select("*", { count: "exact", head: true });
      const { count: totalFeed } = await sb.from("muse_feed_posts").select("*", { count: "exact", head: true });
      const { count: totalBriefs } = await sb.from("muse_briefs").select("*", { count: "exact", head: true });
      const { count: totalForum } = await sb.from("muse_forum_posts").select("*", { count: "exact", head: true });
      const { data: recentActivity } = await sb.from("muse_activity_log").select("*").order("created_at", { ascending: false }).limit(20);
      return NextResponse.json({
        stats: {
          users: totalUsers || 0,
          matches: totalMatches || 0,
          messages: totalMessages || 0,
          feedPosts: totalFeed || 0,
          briefs: totalBriefs || 0,
          forumPosts: totalForum || 0,
        },
        activity: recentActivity || [],
      });
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
        sb.from("muse_messages").select("*").or(`sender_id.eq.${pid},receiver_id.eq.${pid}`),
        sb.from("muse_matches").select("*").or(`user_id.eq.${pid},target_id.eq.${pid}`),
        sb.from("muse_feed_posts").select("*").eq("author_id", pid),
        sb.from("muse_briefs").select("*").eq("author_id", pid),
        sb.from("muse_forum_posts").select("*").eq("author_id", pid),
        sb.from("muse_connections").select("*").or(`user_id.eq.${pid},target_id.eq.${pid}`),
        sb.from("muse_community_members").select("*").eq("user_id", pid),
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
      }
      const isOwner = !!profileId && String(profileId) === String(targetProfileId);
      let query = sb.from("muse_albums").select("id, profile_id, title, description, cover_url, access_level, tags, position, view_count, like_count, created_at").eq("profile_id", targetProfileId).order("position");
      const { data: albums, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ photos: photos || [] });
    }

    if (type === "admin-analytics") {
      const token = bearerTokenFromReq(req);
      if (!token) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      if (authErr || !authData.user?.email || !admins.includes(authData.user.email.toLowerCase())) {
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

      return NextResponse.json({
        totals: { users: totalUsers || 0, matches: totalMatches || 0, albums: totalAlbums || 0 },
        signupsByDay,
        retention: { activeLastWeek: activeLastWeek.size, activePriorWeek: activePriorWeek.size, retainedCount: retained, retentionRatePct: retentionRate },
        featureUsage,
        recentEvents: recentEvents.data || [],
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type: rawType, action: rawAction, ...rest } = body;
    const actionType = rawType || rawAction;

    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // track-event intentionally allows unauthenticated callers (e.g. an
    // anonymous visitor viewing the auth screen before signing up) — product
    // analytics needs to capture that funnel too, not just logged-in actions.
    if (actionType === "track-event") {
      if (!checkRate(ip, "track-event", 120)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { name, props } = rest;
      if (!name || typeof name !== "string" || name.length > 100) {
        return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
      }
      const sbEvt = getServiceClient();
      const ua = req.headers.get("user-agent") || "";
      await sbEvt.from("muse_events_log").insert({ name, props: props && typeof props === "object" ? props : {}, ua: ua.slice(0, 300), ip: String(ip).slice(0, 100) });
      return NextResponse.json({ success: true });
    }

    const { user, profile } = await getAuthedProfile(req, body);
    if (!user || !profile) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const sb = getServiceClient();

    if (actionType === "profile") {
      const { error } = await sb.from("muse_profiles").update(rest).eq("id", profile.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "match") {
      if (!checkRate(ip, "match", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { error } = await sb.from("muse_matches").insert({ user_id: profile.id, target_id: rest.target_id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "match", details: { target_id: rest.target_id } });
      return NextResponse.json({ success: true });
    }

    if (actionType === "message") {
      if (!checkRate(ip, "message", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { toId, text, image_url, img, client_msg_id } = rest;
      if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
      if (!toId) return NextResponse.json({ error: "toId required" }, { status: 400 });
      // Canonical convo key derived server-side so the sender is always a
      // participant — a client-supplied match_id can't target another pair.
      const matchId = [profile.id, String(toId)].sort().join("__");
      const { error } = await sb.from("muse_messages").insert({
        match_id: matchId,
        sender_id: profile.id,
        receiver_id: String(toId),
        text: text.trim(),
        img: img || image_url || "",
        client_msg_id: typeof client_msg_id === "string" ? client_msg_id.slice(0, 120) : undefined,
      });
      // Treat duplicate client_msg_id as success (already persisted by retry).
      if (error && (error as { code?: string }).code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "message", details: { to: toId } });
      return NextResponse.json({ success: true, match_id: matchId });
    }

    if (actionType === "feed") {
      if (!checkRate(ip, "feed", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { text, image_url, image, img } = rest;
      if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
      const { error } = await sb.from("muse_feed_posts").insert({ author_id: profile.id, text: text.trim(), img: img || image_url || image || "", type: (img || image_url || image) ? "photo" : "text" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "brief") {
      if (!checkRate(ip, "brief", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { title, desc, budget, cat, tags, paid, rate } = rest;
      if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
      const { error } = await sb.from("muse_briefs").insert({ author_id: profile.id, title: title.trim(), description: desc || "", budget: budget || "Negotiable", category: cat || "concept", tags: tags || [], paid: paid || false, rate: rate || "" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "brief-apply") {
      const { briefId } = rest;
      if (!briefId) return NextResponse.json({ error: "briefId required" }, { status: 400 });
      const { error } = await sb.from("muse_brief_applications").insert({ brief_id: briefId, user_id: profile.id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "brief_apply", details: { brief_id: briefId } });
      return NextResponse.json({ success: true });
    }

    if (actionType === "forum") {
      if (!checkRate(ip, "forum", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { title, body: forumBody, text, cat, type: forumType, postId } = rest;
      if (forumType === "reply") {
        const { error } = await sb.from("muse_forum_replies").insert({ post_id: postId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar, text: text || "" });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }
      if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
      const { error } = await sb.from("muse_forum_posts").insert({ author_id: profile.id, title: title.trim(), body: forumBody || "", category: cat || "General" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "report") {
      if (!checkRate(ip, "report", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { target_id, target_type, reason, details } = rest;
      if (!target_id || !reason) return NextResponse.json({ error: "target_id and reason required" }, { status: 400 });
      const { error } = await sb.from("muse_reports").insert({ reporter_id: profile.id, target_id, target_type: target_type || "user", reason, details: details || "" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "report", details: { target_id, reason } });
      return NextResponse.json({ success: true });
    }

    if (actionType === "block") {
      const { target_id } = rest;
      if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
      await sb.from("muse_blocks").upsert({ user_id: profile.id, target_id }).select();
      return NextResponse.json({ success: true });
    }

    if (actionType === "unblock") {
      const { target_id } = rest;
      if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
      await sb.from("muse_blocks").delete().eq("user_id", profile.id).eq("target_id", target_id);
      return NextResponse.json({ success: true });
    }

    if (actionType === "get-blocks") {
      const { data: blocks } = await sb.from("muse_blocks").select("target_id").eq("user_id", profile.id);
      return NextResponse.json({ blocked: blocks?.map((b: { target_id: string }) => b.target_id) || [] });
    }

    if (actionType === "join-community") {
      const { communityId } = rest;
      if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
      await sb.from("muse_community_members").upsert({ community_id: communityId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar }).select();
      // Count server-side — never trust a client-supplied member count.
      const { count } = await sb.from("muse_community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId);
      await sb.from("muse_communities").update({ member_count: (count ?? 0) }).eq("id", communityId);
      return NextResponse.json({ success: true });
    }

    if (actionType === "leave-community") {
      const { communityId } = rest;
      if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
      await sb.from("muse_community_members").delete().eq("community_id", communityId).eq("user_id", profile.id);
      return NextResponse.json({ success: true });
    }

    if (actionType === "book-session") {
      const { sessionId, hostId } = rest;
      if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
      await sb.from("muse_bookings").insert({ session_id: sessionId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar, host_id: hostId || null, status: "pending" });
      await sb.from("muse_notifications").insert({ user_id: hostId || profile.id, from_id: profile.id, type: "booking", body: `${profile.name} requested to book a session`, read: false });
      return NextResponse.json({ success: true });
    }

    if (actionType === "connect") {
      if (!checkRate(ip, "connect", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { targetId } = rest;
      if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });
      await sb.from("muse_connections").upsert({ user_id: profile.id, target_id: targetId, status: "pending" }).select();
      await sb.from("muse_notifications").insert({ user_id: targetId, from_id: profile.id, type: "connection", body: `${profile.name} wants to connect`, read: false });
      return NextResponse.json({ success: true });
    }

    if (actionType === "save-preferences") {
      const prefs = rest;
      const { error } = await sb.from("muse_profiles").update({ preferences: prefs }).eq("id", profile.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "sync") {
      if (!checkRate(ip, "sync", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const results: string[] = [];
      if (rest.matches?.length) {
        for (const m of rest.matches) {
          await sb.from("muse_matches").upsert(
            { user_id: profile.id, target_id: m.id, matched_at: new Date().toISOString() },
            { onConflict: "user_id,target_id", ignoreDuplicates: true }
          );
        }
        results.push("matches");
      }
      if (rest.feedPosts?.length) results.push("feed");
      if (rest.forumPosts?.length) results.push("forum");
      return NextResponse.json({ success: true, synced: results });
    }

    if (actionType === "create-album") {
      if (!checkRate(ip, "create-album", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { title, description, cover_url, access_level, tags } = rest;
      if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
      const level = ["public", "private", "invite"].includes(access_level) ? access_level : "public";
      const { data, error } = await sb.from("muse_albums").insert({
        profile_id: profile.id, title: title.trim(), description: description || "",
        cover_url: cover_url || "", access_level: level, tags: Array.isArray(tags) ? tags.slice(0, 20) : [],
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, album: data });
    }

    if (actionType === "update-album") {
      const { albumId, title, description, cover_url, access_level, tags } = rest;
      if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
      const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
      if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = String(title).slice(0, 200);
      if (description !== undefined) updates.description = String(description).slice(0, 2000);
      if (cover_url !== undefined) updates.cover_url = cover_url;
      if (access_level !== undefined && ["public", "private", "invite"].includes(access_level)) updates.access_level = access_level;
      if (tags !== undefined && Array.isArray(tags)) updates.tags = tags.slice(0, 20);
      const { error } = await sb.from("muse_albums").update(updates).eq("id", albumId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "delete-album") {
      const { albumId } = rest;
      if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
      const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
      if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { error } = await sb.from("muse_albums").delete().eq("id", albumId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "add-album-photo") {
      if (!checkRate(ip, "add-album-photo", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { albumId, img_url, caption } = rest;
      if (!albumId || !img_url) return NextResponse.json({ error: "albumId and img_url required" }, { status: 400 });
      const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
      if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { count } = await sb.from("muse_album_photos").select("*", { count: "exact", head: true }).eq("album_id", albumId);
      const { data, error } = await sb.from("muse_album_photos").insert({ album_id: albumId, img_url, caption: String(caption || "").slice(0, 500), position: count ?? 0 }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, photo: data });
    }

    if (actionType === "remove-album-photo") {
      const { photoId } = rest;
      if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });
      const { data: photo } = await sb.from("muse_album_photos").select("album_id").eq("id", photoId).maybeSingle();
      if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const { data: album } = await sb.from("muse_albums").select("profile_id").eq("id", photo.album_id).maybeSingle();
      if (!album || String(album.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { error } = await sb.from("muse_album_photos").delete().eq("id", photoId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "grant-album-access") {
      const { albumId, viewerProfileId } = rest;
      if (!albumId || !viewerProfileId) return NextResponse.json({ error: "albumId and viewerProfileId required" }, { status: 400 });
      const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
      if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { error } = await sb.from("muse_album_access").upsert({ album_id: albumId, viewer_profile_id: viewerProfileId }, { onConflict: "album_id,viewer_profile_id", ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "revoke-album-access") {
      const { albumId, viewerProfileId } = rest;
      if (!albumId || !viewerProfileId) return NextResponse.json({ error: "albumId and viewerProfileId required" }, { status: 400 });
      const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
      if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await sb.from("muse_album_access").delete().eq("album_id", albumId).eq("viewer_profile_id", viewerProfileId);
      return NextResponse.json({ success: true });
    }

    if (actionType === "list-album-access") {
      const { albumId } = rest;
      if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
      const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
      if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { data } = await sb.from("muse_album_access").select("viewer_profile_id, granted_at, viewer_profile_id(id, name, avatar)").eq("album_id", albumId);
      return NextResponse.json({ access: data || [] });
    }

    if (actionType === "view-album") {
      const { albumId } = rest;
      if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
      const { data: album } = await sb.from("muse_albums").select("view_count").eq("id", albumId).maybeSingle();
      if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await sb.from("muse_albums").update({ view_count: (album.view_count || 0) + 1 }).eq("id", albumId);
      return NextResponse.json({ success: true });
    }

    if (actionType === "like-album") {
      const { albumId } = rest;
      if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
      const { data: album } = await sb.from("muse_albums").select("like_count").eq("id", albumId).maybeSingle();
      if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const { error } = await sb.from("muse_albums").update({ like_count: (album.like_count || 0) + 1 }).eq("id", albumId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
