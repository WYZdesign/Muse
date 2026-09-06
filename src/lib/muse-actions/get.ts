// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — GET DISPATCHER (read-only type= switch)
// Extracted from api/muse/route.ts (monolith split). The GET handler routes on
// ?type=... to fetch read-only lists. Pure relocation — no behavior change.
// route.ts re-exports this as its GET, so the URL + frontend call sites are
// UNCHANGED.
// ══════════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { safeServerError } from "@/lib/http";
import { sanitizeText } from "@/lib/request-safety";
import { bearerTokenFromReq, isConvoParticipant, UUID_RE, isAdminEmail } from "./shared";

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

    // Real member roster for a group's detail view — admin/mod badges next to
    // names come from the actual `role` column, ordered admin/moderator first.
    if (type === "community-members") {
      const communityId = req.nextUrl.searchParams.get("communityId") || "";
      if (!UUID_RE.test(communityId)) return NextResponse.json({ members: [] });
      const { data } = await sb.from("muse_community_members")
        .select("user_id, user_name, user_avatar, role, joined_at")
        .eq("community_id", communityId)
        .order("joined_at", { ascending: true })
        .limit(200);
      const rolePriority: Record<string, number> = { admin: 0, moderator: 1, member: 2 };
      const rows = (data || []).slice().sort((a: any, b: any) => (rolePriority[a.role] ?? 2) - (rolePriority[b.role] ?? 2));
      return NextResponse.json({ members: rows });
    }

    if (type === "sessions") {
      const { data } = await sb.from("muse_sessions").select("*").order("date", { ascending: true }).limit(20);
      const rows = data || [];
      // Trust signals for the browse cards: whether the host is identity-verified
      // and how many sessions they've actually completed as a host — both real
      // counts, not derived from the session's own (self-reported) `rating`.
      const hostIds = [...new Set(rows.map((s: any) => s.host_id).filter(Boolean))];
      let verifiedByHost = new Map<string, boolean>();
      let completedByHost = new Map<string, number>();
      if (hostIds.length) {
        const { data: hosts } = await sb.from("muse_profiles").select("id, verified").in("id", hostIds);
        verifiedByHost = new Map((hosts || []).map((h: any) => [h.id, !!h.verified]));
        const { data: completed } = await sb.from("muse_bookings").select("host_id").in("host_id", hostIds).eq("status", "completed");
        for (const b of completed || []) {
          const hid = String((b as any).host_id);
          completedByHost.set(hid, (completedByHost.get(hid) || 0) + 1);
        }
      }
      return NextResponse.json({
        sessions: rows.map((s: any) => ({
          ...s,
          hostVerified: !!verifiedByHost.get(s.host_id),
          hostCompletedSessions: completedByHost.get(s.host_id) || 0,
        })),
      });
    }

    if (type === "professionals") {
      const { data } = await sb.from("muse_professionals").select("*").order("created_at", { ascending: false }).limit(50);
      // muse_professionals.user_id references auth.users, not muse_profiles — resolve
      // each professional's real profile id so the client's connect action targets
      // something the handler can actually find (was silently 400ing for real pros).
      const rows = data || [];
      const userIds = rows.map((p: any) => p.user_id).filter(Boolean);
      let profileIdByAuthId = new Map<string, string>();
      let verifiedByProfileId = new Map<string, boolean>();
      if (userIds.length) {
        const { data: profiles } = await sb.from("muse_profiles").select("id, auth_id, verified").in("auth_id", userIds);
        profileIdByAuthId = new Map((profiles || []).map((pr: any) => [pr.auth_id, pr.id]));
        verifiedByProfileId = new Map((profiles || []).map((pr: any) => [pr.id, !!pr.verified]));
      }
      // Trust line ("N★ (M reviews)") sourced from real muse_reviews rows keyed
      // by the professional's resolved profile id — never a made-up number.
      const profileIds = [...profileIdByAuthId.values()];
      const reviewStatsByProfileId = new Map<string, { rating: number; count: number }>();
      if (profileIds.length) {
        const { data: reviews } = await sb.from("muse_reviews").select("reviewee_id, rating").in("reviewee_id", profileIds);
        const sums = new Map<string, { sum: number; count: number }>();
        for (const r of reviews || []) {
          const rid = String((r as any).reviewee_id);
          const cur = sums.get(rid) || { sum: 0, count: 0 };
          cur.sum += (r as any).rating || 0;
          cur.count += 1;
          sums.set(rid, cur);
        }
        for (const [rid, s] of sums) reviewStatsByProfileId.set(rid, { rating: s.count ? Math.round((s.sum / s.count) * 10) / 10 : 0, count: s.count });
      }
      return NextResponse.json({
        professionals: rows.map((p: any) => {
          const profileId = profileIdByAuthId.get(p.user_id) || null;
          const stats = profileId ? reviewStatsByProfileId.get(profileId) : undefined;
          return {
            ...p,
            profileId,
            verified: profileId ? !!verifiedByProfileId.get(profileId) : false,
            reviewRating: stats?.rating ?? null,
            reviewCount: stats?.count ?? 0,
          };
        }),
      });
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
        .select("id, status, created_at, completed_at, session_id(id, title, type, rate, duration, img), host_id(id, name, avatar, type, verified)")
        .eq("user_id", profileId).order("created_at", { ascending: false });
      const { data: asHost } = await sb.from("muse_bookings")
        .select("id, status, created_at, completed_at, session_id(id, title, type, rate, duration, img), user_id(id, name, avatar, type, verified)")
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
