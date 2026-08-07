const RATE_LIMIT = new Map<string, number[]>();

export function checkRate(ip: string, action: string, maxPerMin: number): boolean {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const timestamps = (RATE_LIMIT.get(key) || []).filter(t => now - t < 60000);
  if (timestamps.length >= maxPerMin) return false;
  timestamps.push(now);
  RATE_LIMIT.set(key, timestamps);
  return true;
}

export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
