// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — DISCLOSURES
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// Handlers are exported functions; the monolith's ACTIONS registry still
// dispatches them under the same action names, so the POST URL and every
// frontend call site are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { checkRate, checkRateUser } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/request-safety";
import { applyStrikeAndEscalate, emailProfile, NextResponse, safeServerError, type ActionContext } from "./shared";

export const disclosureCreate = async ({ sb, profile, rest, ip }: ActionContext) => {
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

export const disclosureConfirm = async ({ sb, profile, rest, ip }: ActionContext) => {
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

export const disclosureGet = async ({ sb, profile }: ActionContext) => {
  const { data } = await sb.from("muse_disclosures").select("*, proposer_id(id, name, avatar), responder_id(id, name, avatar)")
    .or(`proposer_id.eq.${profile.id},responder_id.eq.${profile.id}`)
    .order("created_at", { ascending: false }).limit(20);
  return NextResponse.json({ disclosures: data || [] });
};

export const strikesGet = async ({ sb, profile }: ActionContext) => {
  const { data } = await sb.from("muse_strikes").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
  return NextResponse.json({ strikes: data || [] });
};

export const strikeAppeal = async ({ sb, profile, rest }: ActionContext) => {
  const { strikeId, appealText } = rest;
  if (!strikeId || !appealText) return NextResponse.json({ error: "strikeId and appealText required" }, { status: 400 });
  const { error } = await sb.from("muse_strikes").update({
    appeal_status: "pending", appeal_text: String(appealText).slice(0, 2000)
  }).eq("id", strikeId).eq("user_id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};
