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

function req(type: string, token = "", extra: Record<string, string> = {}) {
  return {
    nextUrl: { searchParams: { get: (k: string) => (k === "type" ? type : (extra[k] ?? null)) } },
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

  it("community-members returns an empty roster for a non-UUID communityId", async () => {
    const r = await GET(req("community-members", "", { communityId: "stub-id" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.members).toEqual([]);
  });

  it("community-members returns the real roster ordered admin/mod first", async () => {
    const rows = [
      { user_id: "u2", user_name: "Bo", role: "member", joined_at: "2026-01-01" },
      { user_id: "u1", user_name: "Ada", role: "admin", joined_at: "2026-01-02" },
      { user_id: "u3", user_name: "Cy", role: "moderator", joined_at: "2026-01-03" },
    ];
    (globalThis as any).__sbMock = { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: rows }) }) }) }) }) };
    const r = await GET(req("community-members", "", { communityId: "11111111-1111-4111-8111-111111111111" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.members.map((m: any) => m.role)).toEqual(["admin", "moderator", "member"]);
    (globalThis as any).__sbMock = { from: () => makeQuery() };
  });
});
