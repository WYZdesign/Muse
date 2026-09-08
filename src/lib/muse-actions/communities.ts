// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — COMMUNITIES & EVENTS
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// Handlers are exported functions; the monolith's ACTIONS registry still
// dispatches them under the same action names, so the POST URL and every
// frontend call site are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { checkRate } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/request-safety";
import { UUID_RE, NextResponse, safeServerError, type ActionContext } from "./shared";

export const communityJoin = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId } = rest;
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
  const isStub = !UUID_RE.test(String(communityId));
  if (isStub) return NextResponse.json({ success: true, demo: true });
  const { data: community } = await sb.from("muse_communities").select("id, is_private").eq("id", communityId).maybeSingle();
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 400 });
  const { data: ban } = await sb.from("muse_community_bans").select("id").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (ban) return NextResponse.json({ error: "You are banned from this community" }, { status: 403 });
  if ((community as any).is_private) {
    const { data: existing } = await sb.from("muse_community_join_requests")
      .select("id, status").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
    if (existing && existing.status === "pending") return NextResponse.json({ success: true, pending: true });
    if (existing && existing.status === "approved") {
      await sb.from("muse_community_members").upsert(
        { community_id: communityId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar },
        { onConflict: "community_id,user_id", ignoreDuplicates: true }
      );
      const { count } = await sb.from("muse_community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId);
      await sb.from("muse_communities").update({ member_count: (count ?? 0) }).eq("id", communityId);
      return NextResponse.json({ success: true });
    }
    if (existing && existing.status === "denied") return NextResponse.json({ error: "Your request was denied" }, { status: 403 });
    const { error } = await sb.from("muse_community_join_requests").insert({
      community_id: communityId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar,
    });
    if (error) return safeServerError(error, "db op");
    return NextResponse.json({ success: true, pending: true });
  }
  await sb.from("muse_community_members").upsert(
    { community_id: communityId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar },
    { onConflict: "community_id,user_id", ignoreDuplicates: true }
  );
  const { count } = await sb.from("muse_community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId);
  await sb.from("muse_communities").update({ member_count: (count ?? 0) }).eq("id", communityId);
  return NextResponse.json({ success: true });
};

export const communityLeave = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId } = rest;
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
  const isStub = !UUID_RE.test(String(communityId));
  if (isStub) return NextResponse.json({ success: true, demo: true });
  const { data: community } = await sb.from("muse_communities").select("id").eq("id", communityId).maybeSingle();
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 400 });
  await sb.from("muse_community_members").delete().eq("community_id", communityId).eq("user_id", profile.id);
  return NextResponse.json({ success: true });
};

export const communityCreate = async ({ sb, profile, rest, ip }: ActionContext) => {
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
  // The creator is seeded as the group's admin — the real role source for the
  // admin/mod badges shown in the member list, not a hardcoded label.
  await sb.from("muse_community_members").upsert(
    { community_id: data.id, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar, role: "admin" },
    { onConflict: "community_id,user_id", ignoreDuplicates: true }
  );
  return NextResponse.json({ success: true, community: data });
};

export const eventCreate = async ({ sb, profile, rest, ip }: ActionContext) => {
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

export const eventRsvp = async ({ sb, profile, rest, ip }: ActionContext) => {
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

export const communityUpdateRules = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId, rules } = rest;
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
  if (!Array.isArray(rules)) return NextResponse.json({ error: "rules must be an array" }, { status: 400 });
  // Verify requester is admin of this community
  const { data: membership } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!membership || membership.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const cleaned = rules.map((r: any) => ({
    title: sanitizeText(String(r.title || ""), 100),
    body: sanitizeText(String(r.body || ""), 500),
  })).filter((r: any) => r.title);
  const { error } = await sb.from("muse_communities").update({ rules: cleaned }).eq("id", communityId);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const communityKick = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId, targetUserId } = rest;
  if (!communityId || !targetUserId) return NextResponse.json({ error: "communityId and targetUserId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || (requester.role !== "admin" && requester.role !== "moderator")) {
    return NextResponse.json({ error: "Admin or moderator only" }, { status: 403 });
  }
  const { data: target } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", targetUserId).maybeSingle();
  if (target?.role === "admin") return NextResponse.json({ error: "Cannot kick admin" }, { status: 403 });
  await sb.from("muse_community_members").delete().eq("community_id", communityId).eq("user_id", targetUserId);
  const { count } = await sb.from("muse_community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId);
  await sb.from("muse_communities").update({ member_count: count ?? 0 }).eq("id", communityId);
  return NextResponse.json({ success: true });
};

export const communityBan = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId, targetUserId, reason } = rest;
  if (!communityId || !targetUserId) return NextResponse.json({ error: "communityId and targetUserId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || (requester.role !== "admin" && requester.role !== "moderator")) {
    return NextResponse.json({ error: "Admin or moderator only" }, { status: 403 });
  }
  const { data: target } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", targetUserId).maybeSingle();
  if (target?.role === "admin") return NextResponse.json({ error: "Cannot ban admin" }, { status: 403 });
  await sb.from("muse_community_bans").upsert(
    { community_id: communityId, user_id: targetUserId, banned_by: profile.id, reason: sanitizeText(String(reason || ""), 200) },
    { onConflict: "community_id,user_id", ignoreDuplicates: true }
  );
  await sb.from("muse_community_members").delete().eq("community_id", communityId).eq("user_id", targetUserId);
  const { count } = await sb.from("muse_community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId);
  await sb.from("muse_communities").update({ member_count: count ?? 0 }).eq("id", communityId);
  return NextResponse.json({ success: true });
};

export const communityUnban = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId, targetUserId } = rest;
  if (!communityId || !targetUserId) return NextResponse.json({ error: "communityId and targetUserId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || requester.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  await sb.from("muse_community_bans").delete().eq("community_id", communityId).eq("user_id", targetUserId);
  return NextResponse.json({ success: true });
};

export const communitySetRole = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId, targetUserId, role } = rest;
  if (!communityId || !targetUserId || !role) return NextResponse.json({ error: "communityId, targetUserId, and role required" }, { status: 400 });
  if (!["admin", "moderator", "member"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || requester.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { error } = await sb.from("muse_community_members").update({ role }).eq("community_id", communityId).eq("user_id", targetUserId);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const communityGetBans = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId } = rest;
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || (requester.role !== "admin" && requester.role !== "moderator")) {
    return NextResponse.json({ bans: [] });
  }
  const { data: bans } = await sb.from("muse_community_bans")
    .select("user_id, reason, created_at").eq("community_id", communityId);
  return NextResponse.json({ bans: bans || [] });
};

export const eventCancelRsvp = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "cancel-rsvp", 15)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { eventId } = rest;
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });
  const isStub = !UUID_RE.test(String(eventId));
  if (isStub) return NextResponse.json({ success: true, demo: true });
  await sb.from("muse_rsvps").delete().eq("event_id", eventId).eq("user_id", profile.id);
  return NextResponse.json({ success: true });
};

export const communityMute = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId, targetUserId, duration } = rest;
  if (!communityId || !targetUserId) return NextResponse.json({ error: "communityId and targetUserId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || (requester.role !== "admin" && requester.role !== "moderator")) {
    return NextResponse.json({ error: "Admin or moderator only" }, { status: 403 });
  }
  const expiresAt = duration ? new Date(Date.now() + duration * 60 * 1000).toISOString() : null;
  const { error } = await sb.from("muse_community_mutes").upsert(
    { community_id: communityId, user_id: targetUserId, muted_by: profile.id, expires_at: expiresAt },
    { onConflict: "community_id,user_id", ignoreDuplicates: true }
  );
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const communityUnmute = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId, targetUserId } = rest;
  if (!communityId || !targetUserId) return NextResponse.json({ error: "communityId and targetUserId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || requester.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  await sb.from("muse_community_mutes").delete().eq("community_id", communityId).eq("user_id", targetUserId);
  return NextResponse.json({ success: true });
};

export const communityGetMutes = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId } = rest;
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || (requester.role !== "admin" && requester.role !== "moderator")) {
    return NextResponse.json({ mutes: [] });
  }
  const { data: mutes } = await sb.from("muse_community_mutes")
    .select("user_id, expires_at, created_at").eq("community_id", communityId);
  return NextResponse.json({ mutes: mutes || [] });
};

export const communityGetJoinRequests = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId } = rest;
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || (requester.role !== "admin" && requester.role !== "moderator")) {
    return NextResponse.json({ requests: [] });
  }
  const { data: requests } = await sb.from("muse_community_join_requests")
    .select("id, user_id, user_name, user_avatar, status, created_at")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });
  return NextResponse.json({ requests: requests || [] });
};

export const communityApproveJoinRequest = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId, requestId } = rest;
  if (!communityId || !requestId) return NextResponse.json({ error: "communityId and requestId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || (requester.role !== "admin" && requester.role !== "moderator")) {
    return NextResponse.json({ error: "Admin or moderator only" }, { status: 403 });
  }
  const { data: req } = await sb.from("muse_community_join_requests")
    .select("id, user_id, user_name, user_avatar, status").eq("id", requestId).maybeSingle();
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if ((req as any).status !== "pending") return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  await sb.from("muse_community_join_requests").update({
    status: "approved", reviewed_by: profile.id, reviewed_at: new Date().toISOString(),
  }).eq("id", requestId);
  await sb.from("muse_community_members").upsert(
    { community_id: communityId, user_id: (req as any).user_id, user_name: (req as any).user_name, user_avatar: (req as any).user_avatar },
    { onConflict: "community_id,user_id", ignoreDuplicates: true }
  );
  const { count } = await sb.from("muse_community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId);
  await sb.from("muse_communities").update({ member_count: (count ?? 0) }).eq("id", communityId);
  return NextResponse.json({ success: true });
};

export const communityDenyJoinRequest = async ({ sb, profile, rest }: ActionContext) => {
  const { communityId, requestId } = rest;
  if (!communityId || !requestId) return NextResponse.json({ error: "communityId and requestId required" }, { status: 400 });
  const { data: requester } = await sb.from("muse_community_members")
    .select("role").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
  if (!requester || (requester.role !== "admin" && requester.role !== "moderator")) {
    return NextResponse.json({ error: "Admin or moderator only" }, { status: 403 });
  }
  await sb.from("muse_community_join_requests").update({
    status: "denied", reviewed_by: profile.id, reviewed_at: new Date().toISOString(),
  }).eq("id", requestId);
  return NextResponse.json({ success: true });
};
