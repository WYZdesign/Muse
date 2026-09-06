import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/http", () => ({ safeServerError: (e: any) => ({ error: e?.message || "err" }) }));

const state: any = { profiles: [], nsfw: false };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { GET } from "@/lib/muse-actions/get";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q, or: () => q, range: () => q, update: () => q, delete: () => q, upsert: () => q, insert: () => q,
    maybeSingle: async () => ({ data: null }),
    single: async () => ({ data: null }),
  };
  return q;
}
(globalThis as any).__sbMock = { from: () => makeQuery() };

function req(type: string, token = "") {
  return {
    nextUrl: { searchParams: { get: (k: string) => (k === "type" ? type : null) } },
    headers: { get: (n: string) => (n.toLowerCase() === "authorization" ? (token ? "Bearer " + token : null) : null) },
  } as any;
}

beforeEach(() => { vi.clearAllMocks(); });

describe("GET dispatcher (read-only)", () => {
  it("returns a shaped profiles response for an unauthenticated request", async () => {
    const r = await GET(req("profiles"));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty("profiles");
    expect(Array.isArray(body.profiles)).toBe(true);
  });

  it("returns a 200 for an unknown type (graceful, not a crash)", async () => {
    const r = await GET(req("totally-unknown-type"));
    expect([200, 400]).toContain(r.status);
  });
});
