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
import { NextResponse, safeServerError, type ActionContext } from "./shared";

export const profileUpdate = async ({ sb, profile, rest }: ActionContext) => {
  const ALLOWED_PROFILE_FIELDS = ["name", "bio", "styles", "loc", "city", "type", "zodiac", "chinese", "mbti", "life_path", "looking", "avatar", "audience", "media_kit_url", "travel_dates", "availability_status", "budget_range", "travel_destinations", "custom_type_pending", "custom_style_pending"];
  const updates: Record<string, unknown> = {};
  for (const k of ALLOWED_PROFILE_FIELDS) {
    if (rest[k] !== undefined) updates[k] = rest[k];
  }
  if (typeof updates.name === "string") updates.name = sanitizeText(updates.name as string, 80);
  if (typeof updates.bio === "string") updates.bio = sanitizeText(updates.bio as string, 500);
  if (typeof updates.styles === "string") updates.styles = sanitizeText(updates.styles as string, 200);
  if (typeof updates.looking === "string") updates.looking = sanitizeText(updates.looking as string, 200);
  if (typeof updates.budget_range === "string") updates.budget_range = sanitizeText(updates.budget_range as string, 100);
  if (updates.custom_type_pending !== undefined) updates.custom_type_pending = updates.custom_type_pending === true;
  if (updates.custom_style_pending !== undefined) updates.custom_style_pending = updates.custom_style_pending === true;
  if (!Array.isArray(updates.travel_dates)) delete updates.travel_dates;
  if (typeof updates.travel_destinations === "string") {
    const raw = updates.travel_destinations as string;
    updates.travel_destinations = raw.split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 20);
  }
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
