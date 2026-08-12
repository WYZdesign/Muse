import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { safeServerError } from "@/lib/http";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { enforceRequestSafety, sanitizeText } from "@/lib/request-safety";

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
      const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "200", 10) || 200, 500);
      const before = req.nextUrl.searchParams.get("before") || undefined;
      let query = sb.from("muse_messages").select("*").eq("match_id", matchId).order("created_at", { ascending: false }).limit(limit);
      if (before) query = query.lt("created_at", before);
      const { data } = await query;
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
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const safetyErr = await enforceRequestSafety(req);
    if (safetyErr) return safetyErr;

    const body = await req.json();
    const { type: rawType, action: rawAction, ...rest } = body;
    const actionType = rawType || rawAction;

    const ip = clientIp(req);

    // Blanket write-rate ceiling per IP. Per-action limits below are tighter;
    // this catches any action that doesn't have its own check (and throttles
    // brute-force / scripted abuse across the whole write surface).
    if (actionType !== "track-event" && !checkRate(ip, "write", 120)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

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

    if (actionType === "track-error") {
      if (!checkRate(ip, "track-error", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
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

    const sb = getServiceClient();

    if (actionType === "profile") {
      const updates: Record<string, unknown> = { ...rest };
      if (typeof updates.name === "string") updates.name = sanitizeText(updates.name as string, 80);
      if (typeof updates.bio === "string") updates.bio = sanitizeText(updates.bio as string, 500);
      if (typeof updates.styles === "string") updates.styles = sanitizeText(updates.styles as string, 200);
      const { error } = await sb.from("muse_profiles").update(updates).eq("id", profile.id);
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    if (actionType === "match") {
      if (!checkRate(ip, "match", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { target_id } = rest;
      if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
      if (target_id === profile.id) return NextResponse.json({ error: "Cannot match yourself" }, { status: 400 });
      const { data: target } = await sb.from("muse_profiles").select("id").eq("id", target_id).maybeSingle();
      if (!target) return NextResponse.json({ error: "Target not found" }, { status: 400 });
      const { error } = await sb.from("muse_matches").upsert(
        { user_id: profile.id, target_id },
        { onConflict: "user_id,target_id", ignoreDuplicates: true }
      );
      if (error) return safeServerError(error, "db op");
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "match", details: { target_id } });
      return NextResponse.json({ success: true });
    }

    if (actionType === "message") {
      if (!checkRate(ip, "message", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { toId, text, image_url, img, client_msg_id } = rest;
      if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
      if (!toId) return NextResponse.json({ error: "toId required" }, { status: 400 });
      const cleanText = sanitizeText(String(text).trim());
      if (!cleanText) return NextResponse.json({ error: "text required" }, { status: 400 });
      // Canonical convo key derived server-side so the sender is always a
      // participant — a client-supplied match_id can't target another pair.
      const matchId = [profile.id, String(toId)].sort().join("__");
      const { error } = await sb.from("muse_messages").insert({
        match_id: matchId,
        sender_id: profile.id,
        receiver_id: String(toId),
        text: cleanText,
        img: img || image_url || "",
        client_msg_id: typeof client_msg_id === "string" ? client_msg_id.slice(0, 120) : undefined,
      });
      // Treat duplicate client_msg_id as success (already persisted by retry).
      if (error && (error as { code?: string }).code !== "23505") return safeServerError(error, "message insert");
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "message", details: { to: toId } });
      return NextResponse.json({ success: true, match_id: matchId });
    }

    if (actionType === "feed") {
      if (!checkRate(ip, "feed", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { text, image_url, image, img } = rest;
      if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
      const cleanText = sanitizeText(String(text).trim());
      if (!cleanText) return NextResponse.json({ error: "text required" }, { status: 400 });
      const { error } = await sb.from("muse_feed_posts").insert({ author_id: profile.id, text: cleanText, img: img || image_url || image || "", type: (img || image_url || image) ? "photo" : "text" });
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    if (actionType === "brief") {
      if (!checkRate(ip, "brief", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { title, desc, budget, cat, tags, paid, rate } = rest;
      if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
      const cleanTitle = sanitizeText(String(title).trim(), 200);
      if (!cleanTitle) return NextResponse.json({ error: "title required" }, { status: 400 });
      const { error } = await sb.from("muse_briefs").insert({ author_id: profile.id, title: cleanTitle, description: sanitizeText(String(desc || ""), 2000), budget: budget || "Negotiable", category: cat || "concept", tags: tags || [], paid: paid || false, rate: rate || "" });
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    if (actionType === "brief-apply") {
      const { briefId } = rest;
      if (!briefId) return NextResponse.json({ error: "briefId required" }, { status: 400 });
      const { error } = await sb.from("muse_brief_applications").insert({ brief_id: briefId, user_id: profile.id });
      if (error) return safeServerError(error, "db op");
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "brief_apply", details: { brief_id: briefId } });
      return NextResponse.json({ success: true });
    }

    if (actionType === "forum") {
      if (!checkRate(ip, "forum", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const vErr = validateInput(rest);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const { title, body: forumBody, text, cat, type: forumType, postId } = rest;
      if (forumType === "reply") {
        const cleanText = sanitizeText(String(text || ""), 2000);
        const { error } = await sb.from("muse_forum_replies").insert({ post_id: postId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar, text: cleanText });
        if (error) return safeServerError(error, "db op");
        return NextResponse.json({ success: true });
      }
      if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
      const cleanTitle = sanitizeText(String(title).trim(), 200);
      if (!cleanTitle) return NextResponse.json({ error: "title required" }, { status: 400 });
      const { error } = await sb.from("muse_forum_posts").insert({ author_id: profile.id, title: cleanTitle, body: sanitizeText(String(forumBody || ""), 5000), category: cat || "General" });
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    if (actionType === "report") {
      if (!checkRate(ip, "report", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { target_id, target_type, reason, details } = rest;
      if (!target_id || !reason) return NextResponse.json({ error: "target_id and reason required" }, { status: 400 });
      if (target_id === profile.id) return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
      const { data: targetProfile } = await sb.from("muse_profiles").select("id").eq("id", target_id).maybeSingle();
      if (!targetProfile) return NextResponse.json({ error: "Target not found" }, { status: 400 });
      const { error } = await sb.from("muse_reports").insert({ reporter_id: profile.id, target_id, target_type: target_type || "user", reason, details: details || "" });
      if (error) return safeServerError(error, "db op");
      await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "report", details: { target_id, reason } });
      return NextResponse.json({ success: true });
    }

    if (actionType === "block") {
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
      const { data: community } = await sb.from("muse_communities").select("id").eq("id", communityId).maybeSingle();
      if (!community) return NextResponse.json({ error: "Community not found" }, { status: 400 });
      await sb.from("muse_community_members").upsert(
        { community_id: communityId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar },
        { onConflict: "community_id,user_id", ignoreDuplicates: true }
      );
      // Count server-side — never trust a client-supplied member count.
      const { count } = await sb.from("muse_community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId);
      await sb.from("muse_communities").update({ member_count: (count ?? 0) }).eq("id", communityId);
      return NextResponse.json({ success: true });
    }

    if (actionType === "leave-community") {
      const { communityId } = rest;
      if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
      const { data: community } = await sb.from("muse_communities").select("id").eq("id", communityId).maybeSingle();
      if (!community) return NextResponse.json({ error: "Community not found" }, { status: 400 });
      await sb.from("muse_community_members").delete().eq("community_id", communityId).eq("user_id", profile.id);
      return NextResponse.json({ success: true });
    }

    if (actionType === "book-session") {
      const { sessionId, hostId } = rest;
      if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
      const { data: session } = await sb.from("muse_sessions").select("id").eq("id", sessionId).maybeSingle();
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 400 });
      if (hostId) {
        const { data: host } = await sb.from("muse_profiles").select("id").eq("id", hostId).maybeSingle();
        if (!host) return NextResponse.json({ error: "Host not found" }, { status: 400 });
      }
      await sb.from("muse_bookings").upsert(
        { session_id: sessionId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar, host_id: hostId || null, status: "pending" },
        { onConflict: "session_id,user_id", ignoreDuplicates: true }
      );
      await sb.from("muse_notifications").insert({ user_id: hostId || profile.id, from_id: profile.id, type: "booking", body: `${profile.name} requested to book a session`, read: false });
      return NextResponse.json({ success: true });
    }

    if (actionType === "connect") {
      if (!checkRate(ip, "connect", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { targetId } = rest;
      if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });
      if (targetId === profile.id) return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 });
      const { data: target } = await sb.from("muse_profiles").select("id").eq("id", targetId).maybeSingle();
      if (!target) return NextResponse.json({ error: "Target not found" }, { status: 400 });
      await sb.from("muse_connections").upsert({ user_id: profile.id, target_id: targetId, status: "pending" }, { onConflict: "user_id,target_id", ignoreDuplicates: true }).select();
      await sb.from("muse_notifications").insert({ user_id: targetId, from_id: profile.id, type: "connection", body: `${profile.name} wants to connect`, read: false });
      return NextResponse.json({ success: true });
    }

    if (actionType === "save-preferences") {
      const prefs = rest;
      const { error } = await sb.from("muse_profiles").update({ preferences: prefs }).eq("id", profile.id);
      if (error) return safeServerError(error, "db op");
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
      if (error) return safeServerError(error, "db op");
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
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    if (actionType === "delete-album") {
      if (!checkRate(ip, "delete-album", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { albumId } = rest;
      if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
      const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
      if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { error } = await sb.from("muse_albums").delete().eq("id", albumId);
      if (error) return safeServerError(error, "db op");
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
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true, photo: data });
    }

    if (actionType === "remove-album-photo") {
      if (!checkRate(ip, "remove-album-photo", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { photoId } = rest;
      if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });
      const { data: photo } = await sb.from("muse_album_photos").select("album_id").eq("id", photoId).maybeSingle();
      if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const { data: album } = await sb.from("muse_albums").select("profile_id").eq("id", photo.album_id).maybeSingle();
      if (!album || String(album.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { error } = await sb.from("muse_album_photos").delete().eq("id", photoId);
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    if (actionType === "grant-album-access") {
      const { albumId, viewerProfileId } = rest;
      if (!albumId || !viewerProfileId) return NextResponse.json({ error: "albumId and viewerProfileId required" }, { status: 400 });
      const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
      if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { error } = await sb.from("muse_album_access").upsert({ album_id: albumId, viewer_profile_id: viewerProfileId }, { onConflict: "album_id,viewer_profile_id", ignoreDuplicates: true });
      if (error) return safeServerError(error, "db op");
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
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    // ════════════════════════════════════════════════════════════════
    // DISCLOSURE SYSTEM — structured booking agreements
    // ════════════════════════════════════════════════════════════════

    if (actionType === "create-disclosure") {
      if (!checkRate(ip, "create-disclosure", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
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

      // HARD BLOCK: NSFW + payment combo → never proceed to disclosure
      const hasNsfw = contentTypeNudity || contentTypeArtisticNude || boundaryExplicitActs || boundaryPenetration;
      const hasPayment = compensationAmount && compensationAmount !== "0" && compensationAmount !== "Free";
      if (hasNsfw && hasPayment) {
        // Create a blocked disclosure record for audit trail
        await sb.from("muse_disclosures").insert({
          proposer_id: profile.id, responder_id: responderId, booking_id: bookingId || null,
          status: "blocked", blocked_reason: "NSFW content with payment — violates Muse terms",
          compensation_amount: compensationAmount || "",
          content_type_nudity: !!contentTypeNudity,
          content_type_artistic_nude: !!contentTypeArtisticNude,
          boundary_explicit_acts: !!boundaryExplicitActs,
          boundary_penetration: !!boundaryPenetration,
        });
        // Auto-strike the user (high-severity)
        await sb.from("muse_strikes").insert({
          user_id: profile.id, category: "high_severity", severity: "suspension",
          reason: "Attempted to arrange paid explicit sexual content",
          details: "Disclosure was hard-blocked: NSFW content + payment combination",
        });
        await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "disclosure_blocked", details: { responder_id: responderId } });
        return NextResponse.json({ error: "This request violates Muse terms and has been blocked.", blocked: true }, { status: 403 });
      }

      const { data, error } = await sb.from("muse_disclosures").insert({
        proposer_id: profile.id, responder_id: responderId, booking_id: bookingId || null,
        compensation_amount: String(compensationAmount || ""),
        compensation_timing: String(compensationTiming || ""),
        compensation_method: String(compensationMethod || ""),
        content_type_nudity: !!contentTypeNudity,
        content_type_artistic_nudity: !!contentTypeArtisticNude,
        content_type_boudoir: !!contentTypeBoudoir,
        content_type_portrait: !!contentTypePortrait,
        content_type_fashion: !!contentTypeFashion,
        content_type_editorial: !!contentTypeEditorial,
        content_type_commercial: !!contentTypeCommercial,
        content_type_conceptual: !!contentTypeConceptual,
        content_type_other: !!contentTypeOther,
        content_type_other_desc: String(contentTypeOtherDesc || ""),
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
        location_address: String(locationAddress || ""),
        location_public: locationPublic !== false,
        others_present: !!othersPresent,
        others_count: parseInt(othersCount) || 0,
        others_desc: String(othersDesc || ""),
        usage_rights: String(usageRights || ""),
        usage_custom_desc: String(usageCustomDesc || ""),
        edit_approval_required: !!editApprovalRequired,
        nda_required: !!ndaRequired,
        model_release_required: !!modelReleaseRequired,
        status: "pending_responder",
      }).select().single();

      if (error) return safeServerError(error, "db op");
      // Notify responder
      await sb.from("muse_notifications").insert({
        user_id: responderId, from_id: profile.id, type: "disclosure",
        body: `${profile.name} sent a shoot disclosure for your review`, read: false
      });
      return NextResponse.json({ success: true, disclosure: data });
    }

    if (actionType === "confirm-disclosure") {
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
      }
      return NextResponse.json({ success: true });
    }

    if (actionType === "get-disclosures") {
      const { data } = await sb.from("muse_disclosures").select("*, proposer_id(id, name, avatar), responder_id(id, name, avatar)")
        .or(`proposer_id.eq.${profile.id},responder_id.eq.${profile.id}`)
        .order("created_at", { ascending: false }).limit(20);
      return NextResponse.json({ disclosures: data || [] });
    }

    // ════════════════════════════════════════════════════════════════
    // STRIKE / ENFORCEMENT SYSTEM
    // ════════════════════════════════════════════════════════════════

    if (actionType === "get-strikes") {
      const { data } = await sb.from("muse_strikes").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
      return NextResponse.json({ strikes: data || [] });
    }

    if (actionType === "appeal-strike") {
      const { strikeId, appealText } = rest;
      if (!strikeId || !appealText) return NextResponse.json({ error: "strikeId and appealText required" }, { status: 400 });
      const { error } = await sb.from("muse_strikes").update({
        appeal_status: "pending", appeal_text: String(appealText).slice(0, 2000)
      }).eq("id", strikeId).eq("user_id", profile.id);
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    if (actionType === "admin-resolve-appeal") {
      // Admin only — resolve an appeal
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      if (!user.email || !admins.includes(user.email.toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { strikeId, resolution } = rest; // resolution: 'upheld' | 'overturned'
      if (!strikeId || !["upheld", "overturned"].includes(resolution)) {
        return NextResponse.json({ error: "strikeId and valid resolution required" }, { status: 400 });
      }
      const updates: Record<string, unknown> = {
        appeal_status: resolution,
        appeal_resolved_at: new Date().toISOString(),
        appeal_resolved_by: profile.id,
      };
      if (resolution === "overturned") {
        updates.severity = "warning"; // downgrade on overturn
      }
      const { error } = await sb.from("muse_strikes").update(updates).eq("id", strikeId);
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    // ════════════════════════════════════════════════════════════════
    // BOOKING MANAGEMENT — enhanced with status flow
    // ════════════════════════════════════════════════════════════════

    if (actionType === "respond-booking") {
      const { bookingId, response } = rest; // response: 'accept' | 'decline' | 'reschedule'
      if (!bookingId || !response) return NextResponse.json({ error: "bookingId and response required" }, { status: 400 });
      const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
      if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (String(booking.host_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (response === "accept") {
        updates.status = "confirmed";
        updates.confirmed_at = new Date().toISOString();
        // Create pre-shoot check-in for 24h reminder
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
      return NextResponse.json({ success: true });
    }

    if (actionType === "cancel-booking") {
      const { bookingId, reason } = rest;
      if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
      const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
      if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const isParty = String(booking.user_id) === String(profile.id) || String(booking.host_id) === String(profile.id);
      if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    }

    // ════════════════════════════════════════════════════════════════
    // PRE-SHOOT CHECK-IN
    // ════════════════════════════════════════════════════════════════

    if (actionType === "respond-checkin") {
      const { checkinId, response, sharedWithContact } = rest; // response: 'confirmed' | 'cancelled'
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
    }

    if (actionType === "get-checkins") {
      const { data } = await sb.from("muse_safety_checkins").select("*, booking_id(id, session_id, status)")
        .eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20);
      return NextResponse.json({ checkins: data || [] });
    }

    if (actionType === "share-safety-details") {
      const { bookingId, disclosureId, recipientName, recipientPhone, recipientEmail, shareMethod } = rest;
      const { error } = await sb.from("muse_safety_shares").insert({
        user_id: profile.id, booking_id: bookingId || null, disclosure_id: disclosureId || null,
        recipient_name: String(recipientName || ""),
        recipient_phone: String(recipientPhone || ""),
        recipient_email: String(recipientEmail || ""),
        share_method: String(shareMethod || "sms"),
      });
      if (error) return safeServerError(error, "db op");
      return NextResponse.json({ success: true });
    }

    // ════════════════════════════════════════════════════════════════
    // SAFETY PROFILE — emergency contacts & trusted friends
    // ════════════════════════════════════════════════════════════════

    if (actionType === "save-safety-profile") {
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
      // Mark profile as having emergency contact
      await sb.from("muse_profiles").update({ emergency_contact_added: true }).eq("id", profile.id);
      return NextResponse.json({ success: true });
    }

    if (actionType === "get-safety-profile") {
      const { data } = await sb.from("muse_safety_profiles").select("*").eq("user_id", profile.id).maybeSingle();
      return NextResponse.json({ safety: data || null });
    }

    // ════════════════════════════════════════════════════════════════
    // PROMPT BANK — curated onboarding prompts
    // ════════════════════════════════════════════════════════════════

    if (actionType === "get-prompts") {
      const { category } = rest;
      let query = sb.from("muse_prompt_bank").select("*").eq("active", true).order("display_order");
      if (category) query = query.eq("category", category);
      const { data } = await query.limit(100);
      return NextResponse.json({ prompts: data || [] });
    }

    if (actionType === "save-prompt-response") {
      if (!checkRate(ip, "save-prompt-response", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { promptId, responseText, responseChoices } = rest;
      if (!promptId) return NextResponse.json({ error: "promptId required" }, { status: 400 });
      const { error } = await sb.from("muse_prompt_responses").upsert({
        user_id: profile.id, prompt_id: promptId,
        response_text: String(responseText || ""),
        response_choices: Array.isArray(responseChoices) ? responseChoices : [],
      }, { onConflict: "user_id,prompt_id" });
      if (error) return safeServerError(error, "db op");
      // Update completion percentage
      const { count } = await sb.from("muse_prompt_responses").select("*", { count: "exact", head: true }).eq("user_id", profile.id);
      const { count: total } = await sb.from("muse_prompt_bank").select("*", { count: "exact", head: true }).eq("active", true);
      const pct = total && total > 0 ? Math.round(((count || 0) / total) * 100) : 0;
      await sb.from("muse_profiles").update({ profile_completion_pct: pct, prompt_completed_at: new Date().toISOString() }).eq("id", profile.id);

      // Fire-and-forget: embed prompt response in background (don't block response)
      if (responseText && typeof responseText === "string" && responseText.trim()) {
        const embedText = `${responseText}`.trim();
        const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
        const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
        fetch(`${OLLAMA_URL}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "nomic-embed-text", prompt: embedText }),
        }).then(async r => r.ok ? r.json() : null).then(async data => {
          if (!data?.embedding?.length) return;
          const pointId = hashToUint64(`response:${profile.id}:${promptId}`);
          await fetch(`${QDRANT_URL}/collections/muse_embeddings/points`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ points: [{ id: pointId, vector: data.embedding, payload: { user_id: profile.id, embedding_type: "prompt_response", prompt_id: promptId, text_source: embedText.slice(0, 2000), updated_at: new Date().toISOString() } }] }),
          });
        }).catch(() => {}); // silent fail — non-critical background task
      }

      return NextResponse.json({ success: true, completionPct: pct });
    }

    if (actionType === "get-prompt-responses") {
      const { data } = await sb.from("muse_prompt_responses").select("*, prompt_id(id, prompt_text, category)").eq("user_id", profile.id);
      return NextResponse.json({ responses: data || [] });
    }

    // ════════════════════════════════════════════════════════════════
    // ADMIN BRAIN — AI-powered analytics (founder-only)
    // ════════════════════════════════════════════════════════════════

    if (actionType === "admin-brain") {
      if (!checkRate(ip, "admin-brain", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      if (!user.email || !admins.includes(user.email.toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { query: userQuery } = rest;
      if (!userQuery || typeof userQuery !== "string") {
        return NextResponse.json({ error: "query required" }, { status: 400 });
      }

      try {
        const q = userQuery.toLowerCase();
        let result: Record<string, unknown> = {};

        // Parse intent from natural language query
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
        } else if (q.includes("user") && (q.includes("find") || q.includes("search") || q.includes("name"))) {
          const searchTerm = q.replace(/.*(?:find|search|name)\s+(?:user\s*)?/i, "").trim();
          const { data: users } = await sb.from("muse_profiles").select("id, name, email, type, created_at, profile_completion_pct").ilike("name", `%${searchTerm}%`).limit(10);
          result = { answer: `Found ${(users || []).length} users matching "${searchTerm}".`, data: { users: users || [] } };
        } else if (q.includes("prompt") && (q.includes("response") || q.includes("answer"))) {
          const { count } = await sb.from("muse_prompt_responses").select("*", { count: "exact", head: true });
          const { count: totalPrompts } = await sb.from("muse_prompt_bank").select("*", { count: "exact", head: true }).eq("active", true);
          result = { answer: `Prompt responses: ${count || 0} across ${totalPrompts || 0} active prompts.`, data: { responseCount: count || 0, promptCount: totalPrompts || 0 } };
        } else {
          // Generic: return overview stats
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

        // Log the admin query for audit trail
        await sb.from("muse_admin_audit_log").insert({
          admin_user_id: profile.id, query_text: userQuery.slice(0, 1000),
          query_result_summary: String(result.answer || "").slice(0, 500),
          result_row_count: Array.isArray((result as any).data?.users) ? (result as any).data.users.length : 0,
        });

        return NextResponse.json(result);
      } catch (err: unknown) {
        return NextResponse.json({ error: "Query failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // PAYMENT HISTORY — bookings where user is payer or payee
    // ════════════════════════════════════════════════════════════════

    if (actionType === "get-payments") {
      const { data: asPayee } = await sb.from("muse_booking_payments").select("*, payer_id(name, avatar), payee_id(name, avatar), booking_id(session_id, status)")
        .eq("payee_id", profile.id).order("created_at", { ascending: false }).limit(50);
      const { data: asPayer } = await sb.from("muse_booking_payments").select("*, payer_id(name, avatar), payee_id(name, avatar), booking_id(session_id, status)")
        .eq("payer_id", profile.id).order("created_at", { ascending: false }).limit(50);
      // Merge and dedupe
      const all = [...(asPayee || []), ...(asPayer || [])];
      const deduped = Array.from(new Map(all.map((p: any) => [p.id, p])).values());
      deduped.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return NextResponse.json({ payments: deduped });
    }

    // ════════════════════════════════════════════════════════════════
    // ADMIN — suspension
    // ════════════════════════════════════════════════════════════════

    if (actionType === "admin-reports") {
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      if (!user.email || !admins.includes(user.email.toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { data: reports } = await sb.from("muse_reports").select("*, reporter_id(id, name, avatar), target_id(id, name, avatar)")
        .order("created_at", { ascending: false }).limit(50);
      return NextResponse.json({ reports: reports || [] });
    }

    if (actionType === "admin-strikes") {
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      if (!user.email || !admins.includes(user.email.toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { data: strikes } = await sb.from("muse_strikes").select("*, user_id(id, name, avatar)")
        .order("created_at", { ascending: false }).limit(50);
      return NextResponse.json({ strikes: strikes || [] });
    }

    if (actionType === "admin-suspend-user") {
      if (!checkRate(ip, "admin-suspend-user", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      if (!user.email || !admins.includes(user.email.toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { targetUserId, reason, durationDays } = rest;
      if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
      const suspensionEnd = durationDays ? new Date(Date.now() + durationDays * 86400000).toISOString() : null;
      const { error } = await sb.from("muse_strikes").insert({
        user_id: targetUserId, issued_by: profile.id,
        reason: String(reason || "Suspended by admin"),
        category: "high_severity",
        severity: suspensionEnd ? "suspension" : "permanent_ban",
        suspension_ends_at: suspensionEnd,
      });
      if (error) return safeServerError(error, "db op");
      await sb.from("muse_notifications").insert({
        user_id: targetUserId, from_id: profile.id, type: "suspension",
        body: suspensionEnd ? `Your account has been suspended until ${new Date(suspensionEnd).toLocaleDateString()}` : "Your account has been permanently banned",
        read: false
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
  } catch (e: unknown) {
    return safeServerError(e, "muse route");
  }
}

function hashToUint64(str: string): number {
  let hash = BigInt("0xcbf29ce484222325");
  const prime = BigInt("0x100000001b3");
  const mask = BigInt("0xffffffffffffffff");
  const positiveMask = BigInt("0x7fffffffffffffff");
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return Number(hash & positiveMask);
}
