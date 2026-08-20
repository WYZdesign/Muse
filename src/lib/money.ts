// ═══════════════════════════════════════════════════════════════
// Muse money helpers — authoritative rate parsing.
//
// `muse_sessions.rate` is a free-text field (e.g. "$200", "150",
// "$9.99/hr"). Payment amounts must NEVER be derived client-side;
// the server parses the host's declared rate into a single canonical
// dollar amount and rejects anything ambiguous (multiple numbers) so
// a "$50-100/hr" can't silently resolve to "$50".
// ═══════════════════════════════════════════════════════════════

/**
 * Parse a free-text rate string into a canonical cents value.
 * Returns null when the string is empty, has no number, or contains
 * multiple distinct numbers (ambiguous — the host must set a clear
 * single rate).
 *
 * Handles "$200", "200", "$9.99", "150.00", "$1,200.50".
 */
export function parseRateToCents(rate: string | null | undefined): number | null {
  const s = String(rate || "").trim();
  if (!s) return null;

  // Extract all numeric tokens (allow commas + decimals). Strip "$".
  const tokens = s.replace(/[$,]/g, "").match(/\d+(?:\.\d+)?/g);
  if (!tokens || tokens.length === 0) return null;

  // Multiple distinct numbers = ambiguous (e.g. "$50-100/hr", "2 hour, $150").
  if (tokens.length > 1) return null;

  const dollars = Number(tokens[0]);
  if (!Number.isFinite(dollars) || dollars <= 0) return null;

  // Sanity cap: $1,000,000 per booking.
  if (dollars > 1_000_000) return null;

  return Math.round(dollars * 100);
}

/** Format cents back into a human dollar string (e.g. "150.00" → "$150.00"). */
export function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
