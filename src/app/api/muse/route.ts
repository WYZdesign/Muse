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
      const { data } = await sb.from("muse_profiles").select("id, name, type, avatar, bio, loc, styles, looking, zodiac, chinese, mbti, life_path, show_nsfw, photos").limit(100);
      const visible = (data || []).filter((p: any) => {
        if (profileId && String(p.id) === String(profileId)) return false;
        const hasAvatar = typeof p.avatar === "string" && p.avatar.trim().length > 0;
        const hasPhotos = Array.isArray(p.photos) && p.photos.length > 0;
        return hasAvatar || hasPhotos;
      });
      return NextResponse.json({ profiles: visible });
    }

    if (type === "matches" && profileId) {
      const { data } = await sb.from("muse_matches").select("*, target_id(*)").eq("user_id", profileId);
      return NextResponse.json({ matches: data || [] });
    }

    if (type === "messages" && profileId) {
      const matchId = req.nextUrl.searchParams.get("match_id");
      if (!matchId) return NextResponse.json({ messages: [] });
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
      const token = req.nextUrl.searchParams.get("access_token");
      if (!token) return NextResponse.json({ error: "access_token required" }, { status: 400 });
      const authSb = getServiceClient();
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
      const { data: profile } = await sb.from("muse_profiles").select("id").eq("auth_id", user.id).single();
      if (!profile) return NextResponse.json({ notifications: [] });
      const { data } = await sb.from("muse_notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(30);
      return NextResponse.json({ notifications: data || [] });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type: rawType, action: rawAction, ...rest } = body;
    const actionType = rawType || rawAction;

    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (actionType === "register") {
      const { email, password, name, type: userType, bio, loc, avatar } = rest;
      if (!email || !password || !name) return NextResponse.json({ error: "email, password, name required" }, { status: 400 });
      const sb = getServiceClient();
      const { data: authData, error: authErr } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });
      const userId = authData.user?.id;
      if (!userId) return NextResponse.json({ error: "User creation failed" }, { status: 500 });
      const { error: profileErr } = await sb.from("muse_profiles").insert({ auth_id: userId, name, type: userType || "Photographer", bio: bio || "", loc: loc || "", avatar: avatar || "" });
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });
      return NextResponse.json({ success: true, userId });
    }

    if (actionType === "login") {
      const { email, password } = rest;
      if (!email || !password) return NextResponse.json({ error: "email, password required" }, { status: 400 });
      const sb = getServiceClient();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return NextResponse.json({ error: error.message }, { status: 401 });
      const { data: profile } = await sb.from("muse_profiles").select("*").eq("auth_id", data.user.id).single();
      return NextResponse.json({ user: data.user, session: data.session, profile });
    }

    if (actionType === "session") {
      const { token } = rest;
      if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
      const sb = getServiceClient();
      const { data, error } = await sb.auth.getUser(token);
      if (error || !data.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      const { data: profile } = await sb.from("muse_profiles").select("*").eq("auth_id", data.user.id).single();
      return NextResponse.json({ user: data.user, profile });
    }

    if (actionType === "logout") {
      const sb = getServiceClient();
      await sb.auth.signOut();
      return NextResponse.json({ success: true });
    }

    if (actionType === "forgot-password") {
      const { email } = rest;
      if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
      const sb = getServiceClient();
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://wyzdesign.com"}/muse` });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "Password reset email sent. Check your inbox." });
    }

    if (actionType === "update-profile") {
      const { data: { user } } = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      const sb = getServiceClient();
      const { error } = await sb.from("muse_profiles").update(rest).eq("auth_id", user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "delete-account") {
      const { data: { user } } = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      const sb = getServiceClient();
      const { data: profile } = await sb.from("muse_profiles").select("id").eq("auth_id", user.id).single();
      if (profile) {
        await sb.from("muse_messages").delete().match({ sender_id: profile.id });
        await sb.from("muse_matches").delete().or(`user_id.eq.${profile.id},target_id.eq.${profile.id}`);
        await sb.from("muse_feed_posts").delete().eq("author_id", profile.id);
        await sb.from("muse_briefs").delete().eq("author_id", profile.id);
        await sb.from("muse_forum_posts").delete().eq("author_id", profile.id);
        await sb.from("muse_profiles").delete().eq("id", profile.id);
      }
      await sb.auth.admin.deleteUser(user.id);
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
      const { error } = await sb.from("muse_matches").insert({ user_id: profile.id, target_id: rest.target_id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "match", details: { target_id: rest.target_id } });
      return NextResponse.json({ success: true });
    }

    if (actionType === "message") {
      if (!checkRate(ip, "message", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { match_id, toId, text, image_url, img } = rest;
      if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
      if (match_id) {
        const { error } = await sb.from("muse_messages").insert({ match_id, sender_id: profile.id, receiver_id: toId || "", text: text.trim(), img: img || image_url || "" });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "message", details: { to: toId || match_id } });
      return NextResponse.json({ success: true });
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
      await sb.from("muse_communities").update({ member_count: rest.memberCount ? rest.memberCount + 1 : 1 }).eq("id", communityId);
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
      await sb.from("muse_notifications").insert({ user_id: hostId || profile.id, from_id: profile.id, type: "booking", text: `${profile.name} requested to book a session`, read: false });
      return NextResponse.json({ success: true });
    }

    if (actionType === "connect") {
      const { targetId } = rest;
      if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });
      await sb.from("muse_connections").upsert({ user_id: profile.id, target_id: targetId, status: "pending" }).select();
      await sb.from("muse_notifications").insert({ user_id: targetId, from_id: profile.id, type: "connection", text: `${profile.name} wants to connect`, read: false });
      return NextResponse.json({ success: true });
    }

    if (actionType === "save-preferences") {
      const prefs = rest;
      const { error } = await sb.from("muse_profiles").update({ preferences: prefs }).eq("id", profile.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (actionType === "sync") {
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

    return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
