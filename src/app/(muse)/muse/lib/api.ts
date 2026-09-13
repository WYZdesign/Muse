"use client";

import { safeGetItem, safeSetItem, getRefreshToken, setRefreshToken, clearRefreshToken } from "./safe-storage";

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
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabaseKey },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
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

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Only set Content-Type for string bodies (JSON). For FormData / Blob /
  // ArrayBuffer bodies, the browser must set the multipart boundary itself —
  // forcing application/json here corrupts the request and breaks uploads.
  if (!headers.has("Content-Type") && typeof options.body === "string") headers.set("Content-Type", "application/json");
  let res = await fetch(url, { ...options, headers });

  // If 401, try refreshing the token once and retry
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken && newToken !== token) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers });
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
