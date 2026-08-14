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
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  return fetch(url, { ...options, headers });
}
