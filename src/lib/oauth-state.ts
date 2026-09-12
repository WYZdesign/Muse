import crypto from "crypto";

const SECRET = process.env.OAUTH_STATE_SECRET || process.env.STRIPE_SECRET_KEY || "fallback-state-secret-do-not-use-in-prod";

/** Sign state data as HMAC-SHA256(base64url(json)). */
export function signState(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  const payload = Buffer.from(json).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Verify and decode HMAC-signed state. Returns null if invalid/expired. */
export function verifyState(state: string, maxAgeMs = 10 * 60 * 1000): Record<string, unknown> | null {
  const dot = state.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() - data.ts > maxAgeMs) return null;
    return data;
  } catch {
    return null;
  }
}
