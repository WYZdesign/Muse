// ═══════════════════════════════════════════════════════════════
// Muse rate limiting — durable, serverless-safe.
//
// The original implementation was an in-memory Map, which resets on
// every Vercel cold start and is per-instance — no real protection
// against distributed/bursty traffic. This version is backed by a
// Postgres counter (muse_rate_limits + check_rate() RPC), so limits
// hold across instances and cold starts.
//
// Requires the migration `sql/MUSE_RATE_LIMIT_20260819.sql` to be
// applied. Until then, the function fails-open (returns true) so a
// missing table never blocks traffic — the in-memory Map remains as
// a cheap first-line backstop within a single warm instance.
// ═══════════════════════════════════════════════════════════════

import { getServiceClient } from "@/lib/supabase";

// In-memory backstop (best-effort within one warm instance).
const MEM_RATE = new Map<string, number[]>();

function memCheck(key: string, maxPerMin: number): boolean {
  const now = Date.now();
  const timestamps = (MEM_RATE.get(key) || []).filter(t => now - t < 60000);
  if (timestamps.length >= maxPerMin) return false;
  timestamps.push(now);
  MEM_RATE.set(key, timestamps);
  return true;
}

export async function checkRate(ip: string, action: string, maxPerMin: number): Promise<boolean> {
  const key = `${ip}:${action}`;

  // First-line: in-memory (synchronous fast path).
  if (!memCheck(key, maxPerMin)) return false;

  // Durable: Postgres atomic counter. Fails-open (returns true) if the
  // table/RPC isn't available yet or the DB errors.
  try {
    const sb = getServiceClient();
    const { data, error } = await sb.rpc("check_rate", { p_key: key, p_limit: maxPerMin });
    if (error) return true;
    return data === true || data === null || data === undefined ? true : Boolean(data);
  } catch {
    return true;
  }
}

export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
