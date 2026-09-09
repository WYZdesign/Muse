"use client";

import { safeGetItem } from "./safe-storage";

export function getAccessToken(): string {
  if (typeof window === "undefined") return "";
  try { return JSON.parse(safeGetItem("muse_user") || "{}").access_token || ""; } catch { return ""; }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Only set Content-Type for string bodies (JSON). For FormData / Blob /
  // ArrayBuffer bodies, the browser must set the multipart boundary itself —
  // forcing application/json here corrupts the request and breaks uploads.
  if (!headers.has("Content-Type") && typeof options.body === "string") headers.set("Content-Type", "application/json");
  return fetch(url, { ...options, headers });
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
