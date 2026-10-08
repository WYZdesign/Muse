/**
 * Waitlist queue mechanics — referral codes, attribution lookups and the
 * queue-position formula. Kept out of the route so it can be unit-tested
 * against a fake PostgREST client without HTTP plumbing.
 */
import crypto from "crypto";
import { getMuseUrl } from "@/lib/urls";

export type WaitlistRow = { id: string; created_at: string; referral_code?: string | null };

// Crockford-ish alphabet: no 0/O, 1/I/L — codes get read off screens and
// typed into ?ref= links by hand.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function newReferralCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function shareUrl(code: string): string {
  return `${getMuseUrl()}/landing?ref=${code}`;
}

type CountBuilder = PromiseLike<{ count?: number | null }> & {
  eq: (column: string, value: unknown) => CountBuilder;
  lt: (column: string, value: unknown) => CountBuilder;
};
type CountClient = {
  from: (table: string) => { select: (cols: string, opts?: unknown) => CountBuilder };
};

const HEAD_COUNT = { count: "exact" as const, head: true as const };

function countRows(sb: unknown, filter?: (b: CountBuilder) => CountBuilder): Promise<number> {
  const client = sb as CountClient;
  let b = client.from("muse_waitlist").select("id", HEAD_COUNT);
  if (filter) b = filter(b);
  return Promise.resolve(b)
    .then((r) => (typeof r?.count === "number" ? r.count : 0))
    .catch(() => 0);
}

function pickRow(sb: unknown, column: string, value: string): Promise<WaitlistRow | null> {
  const client = sb as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (c: string, v: string) => { maybeSingle: () => PromiseLike<{ data?: WaitlistRow | null }> };
      };
    };
  };
  try {
    const q = client.from("muse_waitlist").select("id, created_at, referral_code").eq(column, value).maybeSingle();
    return Promise.resolve(q)
      .then((r) => r?.data ?? null)
      .catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

export function lookupByCode(sb: unknown, code: string): Promise<WaitlistRow | null> {
  return pickRow(sb, "referral_code", code);
}

export function lookupByEmail(sb: unknown, email: string): Promise<WaitlistRow | null> {
  return pickRow(sb, "email", email);
}

function codeExists(sb: unknown, code: string): Promise<boolean> {
  return countRows(sb, (b) => b.eq("referral_code", code)).then((n) => n > 0);
}

/**
 * The unique index is the real guard on referral_code; this check only stops
 * a rare collision from being reported to the user as "already on waitlist".
 */
export async function pickReferralCode(sb: unknown): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = newReferralCode();
    if (!(await codeExists(sb, code))) return code;
  }
  return newReferralCode();
}

/**
 * Queue position: how many signups came before you, minus one credit per
 * person you brought in, clamped to 1 — you can never fall behind your own
 * signup. Signups sharing a timestamp share a position (deliberate: a waiting
 * list is not a promise, and this keeps the query index-friendly).
 *
 * NOTE (phase 2): credits currently count *waitlist joins*. Gating them on
 * verified account activation instead is a one-line swap in this function
 * once closed-beta accounts exist — that is the anti-farming step in the GTM
 * plan, and it is intentionally not faked here.
 */
export async function queuePosition(
  sb: unknown,
  row: Pick<WaitlistRow, "id" | "created_at">,
): Promise<{ position: number; total: number; referrals: number }> {
  const [before, total, referrals] = await Promise.all([
    countRows(sb, (b) => b.lt("created_at", row.created_at)),
    countRows(sb),
    countRows(sb, (b) => b.eq("referred_by", row.id)),
  ]);
  return { position: Math.max(1, before + 1 - referrals), total, referrals };
}
