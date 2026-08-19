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
