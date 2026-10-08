/**
 * Musa password policy — SINGLE SOURCE OF TRUTH.
 *
 * Enforced server-side in /api/muse/auth (register + update-password) and
 * mirrored verbatim in the client forms (reset-password page, Settings
 * change-password) so the user is told the same rule the server applies.
 * The login form deliberately never calls this: accounts created before this
 * baseline (or via OAuth) must still be able to sign in.
 *
 * Baseline (MUSES_PASSWORD_SECURITY_DECISION_2026-10-03.md, no-spend path —
 * Supabase's HIBP leaked-password check is Pro-only):
 *   1. at least 12 characters
 *   2. at least three of lowercase / uppercase / digit / symbol
 *   3. no whitespace-only input, no well-known placeholder passwords
 */

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 200;

/** One-line rule shown above password fields. */
export const PASSWORD_RULES_LABEL =
  `Must be ${MIN_PASSWORD_LENGTH}+ characters and use at least 3 of: lowercase, uppercase, number, symbol.`;

const CLASS_PATTERNS: Array<[label: string, re: RegExp]> = [
  ["lowercase", /[a-z]/],
  ["uppercase", /[A-Z]/],
  ["number", /[0-9]/],
  // Symbols only: spaces deliberately do NOT count as the symbol class.
  ["symbol", /[^A-Za-z0-9\s]/],
];

/**
 * Well-known placeholder passwords, compared after normalising (lowercase,
 * strip every non-alphanumeric). Kept short on purpose: the length + 3-of-4
 * rules already kill the long tail, this only catches the classics.
 */
const COMMON_PASSWORDS = new Set([
  "password", "passw0rd", "p@ssword", "p@ssw0rd", "password1", "password12",
  "password123", "password1234", "passwordpassword", "qwerty", "qwertyuiop",
  "qwertyuiop123", "123456789012", "1234567890123", "000000000000",
  "abcdefghijkl", "letmein", "letmein123", "iloveyou", "welcome", "welcome123",
  "adminadmin", "administrator", "abc123abc123", "abcd1234abcd", "changeme",
  "trustno1", "sunshine", "princess", "football", "monkey", "dragon",
  "musemusemuse", "muse123muse", "wyzwyzwyzwyz",
]);

/** Classes present, in CLASS_PATTERNS order. */
export function passwordClasses(pw: string): string[] {
  return CLASS_PATTERNS.filter(([, re]) => re.test(pw)).map(([label]) => label);
}

function isPlaceholder(pw: string): boolean {
  const norm = pw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!norm) return true; // punctuation/space only
  if (COMMON_PASSWORDS.has(norm)) return true;
  // Single repeated character: aaaaaaaaaaaa
  return /^(.)\1*$/.test(norm);
}

/**
 * Returns null when the password satisfies the policy, otherwise a
 * user-facing reason. Generic language on purpose: it never echoes the
 * submitted value and never distinguishes "unknown account" from "weak
 * password" at the route level.
 */
export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length === 0) return "Password required";
  if (pw.length > MAX_PASSWORD_LENGTH) return "Password too long";
  if (pw.trim().length === 0) return "Password can't be only spaces";
  if (pw.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (isPlaceholder(pw)) return "That password is too common. Pick something unique.";
  if (passwordClasses(pw).length < 3) {
    return "Password needs at least 3 of: lowercase, uppercase, number, symbol";
  }
  return null;
}
