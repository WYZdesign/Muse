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
export async function startSubscriptionCheckout(plan: string, email?: string, showToast?: (msg: string) => void): Promise<string | null> {
  try {
    const r = await authFetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify({ type: "subscription", plan, email }),
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
