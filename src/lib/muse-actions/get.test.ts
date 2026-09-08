import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/http", () => ({ safeServerError: (e: any) => ({ error: e?.message || "err" }) }));

const state: any = { profiles: [], nsfw: false };
(globalThis as any).__authUser = null;
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: (globalThis as any).__authUser } }) } },
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

beforeEach(() => { vi.clearAllMocks(); (globalThis as any).__authUser = null; (globalThis as any).__sbMock = { from: () => makeQuery() }; });

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

describe("GET briefs — applicant count embed", () => {
  it("passes through the embedded muse_brief_applications(count) row untouched (CollabScreen's normalizeBrief unpacks it client-side)", async () => {
    const rows = [
      { id: "b1", title: "Editorial shoot", author_id: { id: "u1", name: "Ada", avatar: "" }, muse_brief_applications: [{ count: 3 }] },
      { id: "b2", title: "No applicants yet", author_id: { id: "u2", name: "Bo", avatar: "" }, muse_brief_applications: [{ count: 0 }] },
    ];
    (globalThis as any).__sbMock = { from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: rows }) }) }) }) };
    const r = await GET(req("briefs"));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.briefs).toEqual(rows);
    (globalThis as any).__sbMock = { from: () => makeQuery() };
  });
});

// "matches" previously had NO nsfw gating at all — a matched partner's
// avatar came through unconditionally regardless of the viewer's
// verification, unlike "profiles" (Discover) right above it in get.ts.
// These lock in the fix: same viewerVerified computation, same strip
// pattern, now applied to target_id.avatar too.
describe("GET matches — nsfw gating on the matched partner's avatar", () => {
  // Two muse_profiles lookups happen in order for an authed "matches"
  // request: (1) resolve profileId from auth_id, (2) read age_verified/
  // age_verified_at for that profileId. muse_matches is the actual list.
  function mockAuthedMatches(verifyRow: any, matchesRows: any[]) {
    let profilesCallCount = 0;
    (globalThis as any).__authUser = { id: "auth-1" };
    (globalThis as any).__sbMock = {
      from: (table: string) => {
        if (table === "muse_profiles") {
          profilesCallCount++;
          const row = profilesCallCount === 1 ? { id: "profile-1" } : verifyRow;
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) };
        }
        if (table === "muse_matches") {
          return { select: () => ({ eq: async () => ({ data: matchesRows }) }) };
        }
        return makeQuery();
      },
    };
  }

  it("strips the avatar for an nsfw match when the viewer is not verified", async () => {
    mockAuthedMatches(
      { age_verified: false, age_verified_at: null },
      [{ id: "m1", user_id: "profile-1", target_id: { id: "t1", name: "Nova", nsfw: true, avatar: "https://x/nsfw.jpg" } }],
    );
    const r = await GET(req("matches", "tok"));
    const body = await r.json();
    expect(body.matches[0].target_id.avatar).toBeUndefined();
  });

  it("strips the avatar when the viewer WAS verified but it has expired", async () => {
    const staleDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(); // well past the re-verification window
    mockAuthedMatches(
      { age_verified: true, age_verified_at: staleDate },
      [{ id: "m1", user_id: "profile-1", target_id: { id: "t1", name: "Nova", nsfw: true, avatar: "https://x/nsfw.jpg" } }],
    );
    const r = await GET(req("matches", "tok"));
    const body = await r.json();
    expect(body.matches[0].target_id.avatar).toBeUndefined();
  });

  it("keeps the avatar for an nsfw match when the viewer is currently verified", async () => {
    mockAuthedMatches(
      { age_verified: true, age_verified_at: new Date().toISOString() },
      [{ id: "m1", user_id: "profile-1", target_id: { id: "t1", name: "Nova", nsfw: true, avatar: "https://x/nsfw.jpg" } }],
    );
    const r = await GET(req("matches", "tok"));
    const body = await r.json();
    expect(body.matches[0].target_id.avatar).toBe("https://x/nsfw.jpg");
  });

  it("never touches the avatar for a non-nsfw match either way", async () => {
    mockAuthedMatches(
      { age_verified: false, age_verified_at: null },
      [{ id: "m1", user_id: "profile-1", target_id: { id: "t1", name: "Nova", nsfw: false, avatar: "https://x/sfw.jpg" } }],
    );
    const r = await GET(req("matches", "tok"));
    const body = await r.json();
    expect(body.matches[0].target_id.avatar).toBe("https://x/sfw.jpg");
  });
});
