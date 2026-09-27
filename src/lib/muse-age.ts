// ══════════════════════════════════════════════════════════════════════════════
// MUSE AGE — birthdate validation + derived, privacy-gated age
//
// `muse_profiles.birthdate` (migration 0030) is the source of truth. It must
// never be exposed to another user directly: public payloads carry only a
// derived whole-year `age`, and only when the owner's `preferences.showAge`
// preference allows it (mirrors the showDistance/showZodiac gating in
// app/api/muse/match/route.ts).
// ══════════════════════════════════════════════════════════════════════════════

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a `YYYY-MM-DD` string into a UTC Date, or null if it isn't a real
 * calendar date (rejects e.g. 1990-02-30 and 1990-13-01, which `new Date`
 * would otherwise silently roll over).
 */
export function parseBirthdate(value: unknown): Date | null {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/**
 * Whole-year age for a `YYYY-MM-DD` birthdate as of `now`, or null when the
 * birthdate is invalid. UTC-based so the result is deterministic across hosts.
 */
export function ageFromBirthdate(value: unknown, now: Date = new Date()): number | null {
  const bd = parseBirthdate(value);
  if (!bd) return null;
  let age = now.getUTCFullYear() - bd.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - bd.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < bd.getUTCDate())) age--;
  return age;
}

/**
 * Canonical birthdate for storage: accepts only a real `YYYY-MM-DD` date whose
 * derived age is 18–120 and which isn't in the future. Anything else returns
 * `undefined` so the caller can DROP the field rather than persist junk.
 */
export function sanitizeBirthdate(value: unknown, now: Date = new Date()): string | undefined {
  const bd = parseBirthdate(value);
  if (!bd) return undefined;
  if (bd.getTime() > now.getTime()) return undefined;
  const age = ageFromBirthdate(value, now);
  if (age === null || age < 18 || age > 120) return undefined;
  const month = String(bd.getUTCMonth() + 1).padStart(2, "0");
  const day = String(bd.getUTCDate()).padStart(2, "0");
  return `${bd.getUTCFullYear()}-${month}-${day}`;
}

/**
 * Age to attach to a public payload — undefined unless a valid birthdate exists
 * AND the profile owner's `showAge` preference is not explicitly false. Never
 * returns the raw birthdate.
 */
export function publicAge(
  row: { birthdate?: unknown; preferences?: { showAge?: boolean } | null } | null | undefined,
  now: Date = new Date(),
): number | undefined {
  if (!row || row.preferences?.showAge === false) return undefined;
  const age = ageFromBirthdate(row.birthdate, now);
  return age === null ? undefined : age;
}
