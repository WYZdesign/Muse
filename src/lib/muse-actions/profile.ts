// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — PROFILE
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// One of the six highest-traffic domains wyzmind's handoff flagged to save for
// last. Handler is an exported function; the monolith's ACTIONS registry still
// dispatches it under the same action name, so the POST URL and every frontend
// call site are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { sanitizeText } from "@/lib/request-safety";
import { NextResponse, safeServerError, type ActionContext } from "./shared";

export const profileUpdate = async ({ sb, profile, rest }: ActionContext) => {
  const ALLOWED_PROFILE_FIELDS = ["name", "bio", "styles", "loc", "city", "type", "zodiac", "chinese", "mbti", "life_path", "looking", "avatar", "audience", "media_kit_url"];
  const updates: Record<string, unknown> = {};
  for (const k of ALLOWED_PROFILE_FIELDS) {
    if (rest[k] !== undefined) updates[k] = rest[k];
  }
  if (typeof updates.name === "string") updates.name = sanitizeText(updates.name as string, 80);
  if (typeof updates.bio === "string") updates.bio = sanitizeText(updates.bio as string, 500);
  if (typeof updates.styles === "string") updates.styles = sanitizeText(updates.styles as string, 200);
  if (typeof updates.looking === "string") updates.looking = sanitizeText(updates.looking as string, 200);
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  const { error } = await sb.from("muse_profiles").update(updates).eq("id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};
