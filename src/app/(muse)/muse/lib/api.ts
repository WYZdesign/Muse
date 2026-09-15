"use client";

import { safeGetItem, safeSetItem, getRefreshToken, setRefreshToken, clearRefreshToken } from "./safe-storage";

/**
 * fetch() with no timeout at all — which every call site in this app used
 * to be — hangs forever on a stuck connection (server accepted the socket
 * but never responds, a proxy holds it open, etc.). That's the same class
 * of bug as the MutationObserver freeze (something that should finish
 * never does, with nothing forcing it to give up), just at the network
 * layer instead of the render layer: a "Loading..." spinner stuck forever
 * instead of a frozen tab. One call site (Discover) had its own ad-hoc 30s
 * timeout added for exactly this reason — this makes that the default
 * everywhere, once, instead of relying on every future call site to
 * remember to add its own. Callers that already wrap apiFetch/authFetch in
 * try/catch (every one checked in this codebase does) get this for free:
 * a timeout rejects the fetch with an AbortError, which lands in their
 * existing catch block, same as any other network failure.
 */
function withTimeout(options: RequestInit, timeoutMs: number): { options: RequestInit; cancel: () => void } {
  if (options.signal) return { options, cancel: () => {} }; // caller supplied their own — don't override it
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { options: { ...options, signal: controller.signal }, cancel: () => clearTimeout(timer) };
}

const DEFAULT_FETCH_TIMEOUT_MS = 15000;

/**
 * Same timeout protection as authFetch, for the handful of call sites that
 * don't need auth (login/signup itself, password reset, public reads) and
 * so can't go through authFetch — routing an unauthenticated call through
 * authFetch would be harmless (it just skips setting an Authorization
 * header) but would also silently pull in the 401-refresh-and-retry dance,
 * which is misleading to read at a call site that was never authenticated
 * in the first place. This is the plain version: fetch + timeout, nothing
 * else.
 */
export async function fetchWithTimeout(url: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...rest } = options;
  const { options: opts, cancel } = withTimeout(rest, timeoutMs);
  try { return await fetch(url, opts); } finally { cancel(); }
}

export function getAccessToken(): string {
  if (typeof window === "undefined") return "";
  try { return JSON.parse(safeGetItem("muse_user") || "{}").access_token || ""; } catch { return ""; }
}

// Try to refresh the Supabase access token using the refresh token stored
// in sessionStorage. Returns the new access token on success, or "" on failure.
let _refreshPromise: Promise<string> | null = null;
async function refreshAccessToken(): Promise<string> {
  // Deduplicate concurrent refresh attempts
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return "";
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
      if (!supabaseUrl || !supabaseKey) return "";
      const { options, cancel } = withTimeout({
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabaseKey },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }, DEFAULT_FETCH_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, options);
      } finally { cancel(); }
      if (!res.ok) { clearRefreshToken(); return ""; }
      const data = await res.json();
      if (data.access_token) {
        // Persist the new session
        const raw = safeGetItem("muse_user");
        const session = raw ? JSON.parse(raw) : {};
        session.access_token = data.access_token;
        session.expires_at = data.expires_at;
        if (data.refresh_token) {
          session.refresh_token = data.refresh_token;
          setRefreshToken(data.refresh_token);
        }
        safeSetItem("muse_user", JSON.stringify(session));
        return data.access_token;
      }
      return "";
    } catch { return ""; }
  })();
  try { return await _refreshPromise; } finally { _refreshPromise = null; }
}

export async function authFetch(url: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...rest } = options;
  const token = getAccessToken();
  const headers = new Headers(rest.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Only set Content-Type for string bodies (JSON). For FormData / Blob /
  // ArrayBuffer bodies, the browser must set the multipart boundary itself —
  // forcing application/json here corrupts the request and breaks uploads.
  if (!headers.has("Content-Type") && typeof rest.body === "string") headers.set("Content-Type", "application/json");
  let attempt = withTimeout({ ...rest, headers }, timeoutMs);
  let res: Response;
  try { res = await fetch(url, attempt.options); } finally { attempt.cancel(); }

  // If 401, try refreshing the token once and retry
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken && newToken !== token) {
      headers.set("Authorization", `Bearer ${newToken}`);
      attempt = withTimeout({ ...rest, headers }, timeoutMs);
      try { res = await fetch(url, attempt.options); } finally { attempt.cancel(); }
    } else if (token) {
      // We HAD a token (the user believed they were logged in) but neither
      // the original request nor a refresh attempt worked — the session is
      // truly dead (expired access token + no usable refresh token, e.g.
      // sessionStorage lost the refresh token while localStorage kept a
      // stale access token around). Every caller up the stack was about to
      // silently show its own generic "X failed" toast with zero indication
      // that re-login is what's actually needed. Surface it once, globally,
      // instead — page.tsx listens for this and logs the user out cleanly
      // with a clear message rather than leaving them retrying a dead session.
      try { window.dispatchEvent(new CustomEvent("muse:session-expired")); } catch {}
    }
  }
  return res;
}

// Centralized Stripe subscription checkout. Returns the redirect URL on
// success, or null (and surfaces a toast) on failure. Uses authFetch so the
// token source is identical everywhere — no ad-hoc localStorage reads.
export async function startSubscriptionCheckout(plan: string, email?: string, showToast?: (msg: string) => void, promo?: string): Promise<string | null> {
  try {
    const r = await authFetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify({ type: "subscription", plan, email, ...(promo ? { promo } : {}) }),
    });
    const d = await r.json();
    if (d.url) return d.url;
    showToast?.(d.error || "Checkout unavailable, try again later");
    return null;
  } catch {
    showToast?.("Checkout unavailable, try again later");
    return null;
  }
}

// One-off boost purchase via /api/muse/connect (create-boost-checkout).
// Returns the Stripe redirect URL, or null with a toast on failure.
export async function startBoostCheckout(quantity: number, duration: string, showToast?: (msg: string) => void): Promise<string | null> {
  try {
    const r = await authFetch("/api/muse/connect", {
      method: "POST",
      body: JSON.stringify({ action: "create-boost-checkout", quantity, duration }),
    });
    const d = await r.json();
    if (d.url) return d.url;
    showToast?.(d.error || "Boost purchase unavailable, try again later");
    return null;
  } catch {
    showToast?.("Boost purchase unavailable, try again later");
    return null;
  }
}

// ═══ MFA / 2FA helpers (Supabase Auth TOTP) ═══
export async function mfaStatus(): Promise<{ enabled: boolean; factors: { id: string; status: string; friendlyName?: string }[] }> {
  const r = await authFetch("/api/muse/mfa?type=mfa-status");
  return await r.json();
}

export async function mfaEnroll(friendlyName = "Muse authenticator") {
  const r = await authFetch("/api/muse/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enroll", friendlyName }) });
  return await r.json();
}

export async function mfaVerify(factorId: string, code: string) {
  const r = await authFetch("/api/muse/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify-code", factorId, code }) });
  return await r.json();
}

export async function mfaUnenroll(factorId: string) {
  const r = await authFetch("/api/muse/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unenroll", factorId }) });
  return await r.json();
}
