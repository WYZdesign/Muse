// ══════════════════════════════════════════════════════════════════════════════
// MUSE AVAILABILITY — structured travel/availability profile columns
//
// Settings → Availability used to persist these values only inside the
// `muse_profiles.preferences` JSON blob, while Discover/search filtered on the
// real COLUMNS (misc.ts: `availability_status`, `travel_destinations`). The two
// never met, so a user's availability never powered a filter. This module is
// the single source of truth for the column shapes + sanitisation:
//
//   travel_dates          jsonb  →  TravelDateRange[]  [{ from, to }]
//   travel_destinations   text[] →  string[]           (city names)
//   availability_status   text   →  "available" | "busy" | "unavailable"
//   budget_range          text   →  bounded display string (no numeric filter)
//
// `budget_range` is deliberately a STRING: migration 0007 declares it TEXT, and
// misc.ts only ever selects it (it is never compared numerically), so a bounded
// string is the shape that matches both the column and the read path.
//
// Every sanitiser is defensive — the client is never trusted.
// ══════════════════════════════════════════════════════════════════════════════

export type AvailabilityStatus = "available" | "busy" | "unavailable";

export const AVAILABILITY_STATUSES: readonly AvailabilityStatus[] = [
  "available",
  "busy",
  "unavailable",
] as const;

export interface TravelDateRange {
  from: string;
  to: string;
}

/** Max stored date ranges per profile — keeps a single profile row bounded. */
export const MAX_TRAVEL_DATES = 12;
/** Max stored travel destinations per profile. */
export const MAX_TRAVEL_DESTINATIONS = 20;
/** Max characters per destination (a city name is far shorter). */
export const MAX_TRAVEL_DESTINATION_LEN = 60;
/** Max characters for the free-text budget display string. */
export const MAX_BUDGET_RANGE_LEN = 60;

/** The profile columns this module owns. Callers copying a loose payload should
 *  skip these and merge `availabilityColumnUpdates(...)` instead, so raw client
 *  values can never bypass sanitisation. */
export const AVAILABILITY_COLUMN_FIELDS = [
  "travel_dates",
  "travel_destinations",
  "availability_status",
  "budget_range",
] as const;

export type AvailabilityColumnField = (typeof AVAILABILITY_COLUMN_FIELDS)[number];

export interface AvailabilityColumns {
  travel_dates?: TravelDateRange[];
  travel_destinations?: string[];
  availability_status?: AvailabilityStatus;
  budget_range?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True only for a real `YYYY-MM-DD` calendar date. Rejects roll-overs like
 * `2026-02-30` that `new Date` would otherwise silently accept.
 */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Canonical `travel_dates` array. Non-array input → `[]`. Within an array,
 * entries that aren't `{ from, to }` ISO dates, or where `from > to`, are
 * dropped; the result is capped at MAX_TRAVEL_DATES.
 */
export function sanitizeTravelDates(value: unknown): TravelDateRange[] {
  if (!Array.isArray(value)) return [];
  const out: TravelDateRange[] = [];
  for (const entry of value) {
    if (out.length >= MAX_TRAVEL_DATES) break;
    if (!entry || typeof entry !== "object") continue;
    const from = (entry as { from?: unknown }).from;
    const to = (entry as { to?: unknown }).to;
    if (!isIsoDate(from) || !isIsoDate(to) || from > to) continue;
    out.push({ from, to });
  }
  return out;
}

/**
 * Canonical `travel_destinations` array. Accepts a canonical array of strings
 * or a legacy comma-separated string. Each entry is trimmed, capped in length,
 * de-duplicated case-insensitively (first spelling wins), and the list is
 * capped at MAX_TRAVEL_DESTINATIONS.
 */
export function sanitizeTravelDestinations(value: unknown): string[] {
  let items: unknown[];
  if (Array.isArray(value)) items = value;
  else if (typeof value === "string") items = value.split(",");
  else return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== "string") continue;
    const clean = item.trim().slice(0, MAX_TRAVEL_DESTINATION_LEN);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= MAX_TRAVEL_DESTINATIONS) break;
  }
  return out;
}

/** A valid status, or `undefined` for anything else (caller DROPS the field). */
export function sanitizeAvailabilityStatus(value: unknown): AvailabilityStatus | undefined {
  return typeof value === "string" && (AVAILABILITY_STATUSES as readonly string[]).includes(value)
    ? (value as AvailabilityStatus)
    : undefined;
}

/** Bounded, trimmed budget string. Non-strings return `undefined` (drop). */
export function sanitizeBudgetRange(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, MAX_BUDGET_RANGE_LEN);
}

/**
 * Map a loose client/preferences-shaped object onto the profile COLUMNS.
 *
 * Only the four availability columns are considered, and only keys whose value
 * has a shape we can accept are returned:
 *   - travel_dates: only when an ARRAY is supplied (even an empty array, so a
 *     user clearing every range really clears the column); anything else is
 *     dropped rather than wiping stored data.
 *   - travel_destinations: an array or a legacy comma-separated string.
 *   - availability_status / budget_range: only valid values, else dropped.
 *
 * An omitted key means "leave the column untouched" — never overwrite it.
 */
export function availabilityColumnUpdates(input: Record<string, unknown>): AvailabilityColumns {
  const out: AvailabilityColumns = {};
  if (Array.isArray(input.travel_dates)) out.travel_dates = sanitizeTravelDates(input.travel_dates);
  if (Array.isArray(input.travel_destinations) || typeof input.travel_destinations === "string") {
    out.travel_destinations = sanitizeTravelDestinations(input.travel_destinations);
  }
  const status = sanitizeAvailabilityStatus(input.availability_status);
  if (status !== undefined) out.availability_status = status;
  const budget = sanitizeBudgetRange(input.budget_range);
  if (budget !== undefined) out.budget_range = budget;
  return out;
}
