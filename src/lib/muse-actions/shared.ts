// ══════════════════════════════════════════════════════════════════════════════
// MUSE SHARED ACTION HELPERS
// Extracted from the api/muse/route.ts monolith so every per-domain route can
// import the same auth/rate-limit/safety/notification primitives without
// duplicating them (the drift the old auth|connect|referral|verification routes
// already suffered from). Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { safeServerError } from "@/lib/http";
import { sendEmail, notify } from "@/lib/email";
import { pushToProfile } from "@/lib/push";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getAuthUser() {
  return supabase.auth.getUser();
}

/** Fetch a profile's email and send them a notification email + push (fail-open).
 *  `prefKey` gates BOTH channels on the recipient's Notifications toggles
 *  (preferences.notifications.match/message/brief/like) — previously the toggles
 *  saved but were never consulted, so opt-outs had zero effect. Omit prefKey
 *  for transactional/safety notices that must always deliver. */
export async function emailProfile(sb: ReturnType<typeof getServiceClient>, profileId: string, subject: string, title: string, body: string, ctaLabel?: string, ctaUrl?: string, prefKey?: "match" | "message" | "brief" | "like") {
  try {
    const { data } = await sb.from("muse_profiles").select("email, preferences").eq("id", profileId).maybeSingle();
    const prefs = (data as any)?.preferences?.notifications;
    const optedOut = !!prefKey && prefs && prefs[prefKey] === false;
    if (optedOut) return;
    if (data?.email) sendEmail(notify(data.email, subject, title, body, ctaLabel, ctaUrl)).catch(() => {});
    pushToProfile(profileId, title, body, ctaUrl).catch(() => {});
  } catch {
    // Fail-open on the prefs read itself — still deliver via push.
    pushToProfile(profileId, title, body, ctaUrl).catch(() => {});
  }
}

// Graduated-enforcement ladder: number of active (non-overturned) strikes
// that escalates to automatic account suspension.
export const STRIKE_SUSPENSION_THRESHOLD = 3;

/**
 * Insert a strike and enforce the unified enforcement ladder:
 *  - Any strike with severity "suspension" or "permanent_ban" immediately
 *    suspends the account (severe single incident → instant action).
 *  - Otherwise, ALL strikes are combined and weighted equally regardless of
 *    severity label — repeated violations of any kind escalate to suspension
 *    once STRIKE_SUSPENSION_THRESHOLD total active strikes is reached.
 *
 * Policy (owner decision): strikes are NOT split into separate per-severity
 * tracks. Every non-overturned strike counts the same toward the ladder.
 *
 * Returns the active strike count and whether a suspension applied.
 */
export async function applyStrikeAndEscalate(
  sb: ReturnType<typeof getServiceClient>,
  userId: string,
  strike: { reason: string; category?: string; severity?: string; details?: string; issued_by?: string },
): Promise<{ inserted: boolean; activeCount: number; suspended: boolean }> {
  const { error } = await sb.from("muse_strikes").insert({ user_id: userId, ...strike });
  if (error) return { inserted: false, activeCount: 0, suspended: false };

  // Count ALL active strikes (exclude overturned appeals), regardless of
  // severity — every violation weighs equally toward the threshold.
  const { data: active, error: countErr } = await sb.from("muse_strikes")
    .select("id")
    .eq("user_id", userId)
    .neq("appeal_status", "overturned");
  if (countErr) return { inserted: true, activeCount: 0, suspended: false };

  const activeCount = (active || []).length;
  const isHighSeverity = strike.severity === "suspension" || strike.severity === "permanent_ban";
  const shouldSuspend = isHighSeverity || activeCount >= STRIKE_SUSPENSION_THRESHOLD;

  if (shouldSuspend) {
    await sb.from("muse_profiles").update({ suspended: true, suspended_at: new Date().toISOString() }).eq("id", userId);
    await sb.from("muse_notifications").insert({
      user_id: userId,
      type: "suspension",
      body: isHighSeverity
        ? "Your account has been suspended for a severe policy violation."
        : `Your account has been suspended after ${activeCount} community guideline violations.`,
      read: false,
    });
    await emailProfile(sb, userId, "Your Muse account was suspended", "Account suspended", isHighSeverity
      ? "Your account has been suspended for a severe policy violation."
      : `Your account has been suspended after ${activeCount} community guideline violations.`, "Review guidelines", "https://muse.wyzdesign.com/muse/guidelines");
    return { inserted: true, activeCount, suspended: true };
  }

  return { inserted: true, activeCount, suspended: false };
}

/**
 * Resolve the caller's identity from a verified session token.
 * Token is read from the Authorization: Bearer header first, then from
 * body.access_token (back-compat for existing client calls). We verify it
 * with supabase.auth.getUser(token) — never trust the client's claimed id.
 * Returns the auth user + their muse_profiles row, or nulls if unauthenticated.
 */
export async function getAuthedProfile(req: NextRequest, body?: Record<string, unknown>) {
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
    .select("id, name, avatar, email, tier, suspended")
    .eq("auth_id", authId)
    .maybeSingle();
  return { user: data.user, profile };
}

export function bearerTokenFromReq(req: NextRequest, body?: Record<string, unknown>): string {
  const header = req.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return bearer;
  if (body && typeof body.access_token === "string") return body.access_token;
  return "";
}

/**
 * Admin gate — verifies the caller's email from the DB profile row, not from
 * the JWT. The JWT email is self-claimed and unverified; an attacker could
 * register with an admin email before the real admin does. The profile row
 * email is set during verified OAuth signup and is authoritative.
 */
export function isAdminEmail(profileEmail: string | null | undefined): boolean {
  if (!profileEmail) return false;
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(profileEmail.toLowerCase());
}

export const MAX_LENGTHS: Record<string, number> = { title: 200, body: 5000, text: 2000, bio: 500, name: 50, desc: 2000 };
export function validateInput(data: Record<string, unknown>): string | null {
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
export function isConvoParticipant(matchId: string, profileId: string): boolean {
  if (!matchId || !profileId) return false;
  const parts = matchId.split("__");
  return parts.includes(profileId);
}

// Typed action registry used by the monolith and every per-domain route.
export type ActionContext = {
  sb: ReturnType<typeof getServiceClient>;
  profile: { id: string; name?: string | null; email?: string | null; avatar?: string | null; [key: string]: unknown };
  rest: Record<string, any>;
  ip: string;
  req: NextRequest;
  rawType?: string;
};

export type ActionHandler = (ctx: ActionContext) => Promise<Response>;

export { safeServerError, NextResponse };
