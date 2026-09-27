// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — PROFILE
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// One of the six highest-traffic domains wyzmind's handoff flagged to save for
// last. Handler is an exported function; the monolith's ACTIONS registry still
// dispatches it under the same action name, so the POST URL and every frontend
// call site are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { sanitizeText } from "@/lib/request-safety";
import { checkRateUser } from "@/lib/rate-limit";
import { sanitizeBirthdate } from "@/lib/muse-age";
import { availabilityColumnUpdates, AVAILABILITY_COLUMN_FIELDS } from "@/lib/muse-availability";
import { NextResponse, safeServerError, type ActionContext } from "./shared";

export const profileUpdate = async ({ sb, profile, rest }: ActionContext) => {
  const ALLOWED_PROFILE_FIELDS = ["name", "bio", "styles", "loc", "city", "type", "zodiac", "chinese", "mbti", "life_path", "looking", "avatar", "audience", "media_kit_url", "travel_dates", "availability_status", "budget_range", "travel_destinations", "custom_type_pending", "custom_style_pending", "birthdate"];
  const updates: Record<string, unknown> = {};
  for (const k of ALLOWED_PROFILE_FIELDS) {
    // Availability columns are sanitised below via the shared mapper — never
    // copy the raw client value, or an invalid one could bypass sanitisation.
    if ((AVAILABILITY_COLUMN_FIELDS as readonly string[]).includes(k)) continue;
    if (rest[k] !== undefined) updates[k] = rest[k];
  }
  // birthdate is never persisted raw — only a canonical YYYY-MM-DD that is a
  // real calendar date, not in the future, and yields an age of 18–120.
  // Anything else drops the field entirely.
  if (updates.birthdate !== undefined) {
    const clean = sanitizeBirthdate(updates.birthdate);
    if (clean === undefined) delete updates.birthdate;
    else updates.birthdate = clean;
  }
  if (typeof updates.name === "string") updates.name = sanitizeText(updates.name as string, 80);
  if (typeof updates.bio === "string") updates.bio = sanitizeText(updates.bio as string, 500);
  if (typeof updates.styles === "string") updates.styles = sanitizeText(updates.styles as string, 200);
  if (typeof updates.looking === "string") updates.looking = sanitizeText(updates.looking as string, 200);
  if (updates.custom_type_pending !== undefined) updates.custom_type_pending = updates.custom_type_pending === true;
  if (updates.custom_style_pending !== undefined) updates.custom_style_pending = updates.custom_style_pending === true;
  // Structured availability/travel columns (travel_dates, travel_destinations,
  // availability_status, budget_range) — sanitised shape mapping that also
  // powers the Discover/search filters in misc.ts.
  Object.assign(updates, availabilityColumnUpdates(rest));
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  const { error } = await sb.from("muse_profiles").update(updates).eq("id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const profileDelete = async ({ sb, profile, ip }: ActionContext) => {
  if (!await checkRateUser(profile.id, "delete-account", 1)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const requestedAt = new Date().toISOString();
  const purgeAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await sb.from("muse_profiles").update({
    suspended: true,
    suspended_at: requestedAt,
    deletion_requested_at: requestedAt,
    deletion_purge_after: purgeAt,
  }).eq("id", profile.id);
  if (error) return safeServerError(error, "schedule account deletion");
  return NextResponse.json({ success: true, deletionScheduledFor: purgeAt, message: "Account deletion scheduled." });
};
