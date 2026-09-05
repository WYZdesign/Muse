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
  await sb.from("muse_community_members").upsert(
    { community_id: data.id, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar },
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

export const eventCancelRsvp = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "cancel-rsvp", 15)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { eventId } = rest;
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });
  const isStub = !UUID_RE.test(String(eventId));
  if (isStub) return NextResponse.json({ success: true, demo: true });
  await sb.from("muse_rsvps").delete().eq("event_id", eventId).eq("user_id", profile.id);
  return NextResponse.json({ success: true });
};
