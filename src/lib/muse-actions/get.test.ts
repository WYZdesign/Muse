import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSb, tableCalls, type SbCall } from "@/test-support/sb";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/http", () => ({
  safeServerError: () => new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { "content-type": "application/json" } }),
}));

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

beforeEach(() => { vi.clearAllMocks(); (globalThis as any).__authUser = null; (globalThis as any).__sbMock = { from: () => makeQuery() }; delete process.env.ADMIN_EMAILS; });

type Handler = (calls: SbCall[]) => any;
function installSb(handlers: Record<string, Handler>) {
  const sb: any = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  sb.auth = { getUser: async () => ({ data: { user: (globalThis as any).__authUser }, error: null }) };
  (globalThis as any).__sbMock = sb;
  return sb;
}
function selectArg(calls: SbCall[]): string {
  const c = [...calls].reverse().find((x) => x.method === "select");
  return typeof c?.args[0] === "string" ? c.args[0] : "";
}
function eqOf(calls: SbCall[], field: string): any {
  const c = [...calls].reverse().find((x) => x.method === "eq" && x.args[0] === field);
  return c?.args[1];
}
function profLookup(calls: SbCall[]): any {
  return selectArg(calls) === "id" ? { data: { id: "me" } } : null;
}

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

describe("GET profiles — visibility filtering", () => {
  it("excludes self, suspended, blocked, unverified-nsfw and avatar-less/photo-less rows", async () => {
    (globalThis as any).__authUser = { id: "auth-1" };
    installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "id") return { data: { id: "me" } };
        if (sel.startsWith("age_verified")) return { data: { age_verified: false, age_verified_at: null } };
        if (sel.includes("budget_range")) return { data: [
          { id: "me", avatar: "a" },
          { id: "blocked", avatar: "a" },
          { id: "susp", avatar: "a", suspended: true },
          { id: "nsfw1", avatar: "a", nsfw: true },
          { id: "empty", avatar: "" },
          { id: "ok", avatar: "a", suspended: false, nsfw: false },
          { id: "photo", avatar: "", photos: ["p"] },
        ] };
        return { data: null };
      },
      muse_blocks: () => ({ data: [{ user_id: "me", target_id: "blocked" }] }),
    });
    const body = await (await GET(req("profiles", "tok"))).json();
    expect(body.profiles.map((p: any) => p.id)).toEqual(["ok", "photo"]);
  });

  it("admits nsfw rows for a currently-verified viewer", async () => {
    (globalThis as any).__authUser = { id: "auth-1" };
    installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "id") return { data: { id: "me" } };
        if (sel.startsWith("age_verified")) return { data: { age_verified: true, age_verified_at: new Date().toISOString() } };
        if (sel.includes("budget_range")) return { data: [{ id: "nsfw1", avatar: "a", nsfw: true }] };
        return { data: null };
      },
      muse_blocks: () => ({ data: [] }),
    });
    const body = await (await GET(req("profiles", "tok"))).json();
    expect(body.profiles.map((p: any) => p.id)).toEqual(["nsfw1"]);
  });
});

describe("GET discover-ranked", () => {
  it("404s when the viewer profile is missing", async () => {
    (globalThis as any).__authUser = { id: "auth-1" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "id" ? { data: { id: "me" } } : { data: null }),
    });
    expect((await GET(req("discover-ranked", "tok"))).status).toBe(404);
  });

  it("scores, strips self/blocks, and ranks boosted + complementary first", async () => {
    (globalThis as any).__authUser = { id: "auth-1" };
    const future = new Date(Date.now() + 86400000).toISOString();
    installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "id") return { data: { id: "me" } };
        if (sel.includes("life_path") && sel.includes("age_verified_at")) {
          return { data: { id: "me", type: "Photographer", styles: ["Editorial"], looking: ["Model"], zodiac: "Aries", age_verified: false, age_verified_at: null } };
        }
        if (sel.includes("boost_expires_at")) {
          return { data: [
            { id: "me", avatar: "a", type: "Model" },
            { id: "blocked", avatar: "a", type: "Model" },
            { id: "plain", avatar: "a", type: "Model", styles: ["Editorial"], looking: ["Photographer"] },
            { id: "boosted", avatar: "a", type: "Actor", styles: ["Editorial"], looking: ["Photographer"], boost_expires_at: future },
          ] };
        }
        return { data: null };
      },
      muse_blocks: () => ({ data: [{ user_id: "me", target_id: "blocked" }] }),
    });
    const body = await (await GET(req("discover-ranked", "tok"))).json();
    const ids = body.profiles.map((p: any) => p.id);
    expect(ids).not.toContain("me");
    expect(ids).not.toContain("blocked");
    expect(ids[0]).toBe("boosted");
    expect(body.profiles.every((p: any) => typeof p.matchScore === "number")).toBe(true);
  });

  it("exposes derived age only when the owner's showAge allows it", async () => {
    (globalThis as any).__authUser = { id: "auth-1" };
    installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "id") return { data: { id: "me" } };
        if (sel.includes("life_path") && sel.includes("age_verified_at")) {
          return { data: { id: "me", type: "Photographer", styles: [], looking: [], age_verified: false, age_verified_at: null } };
        }
        if (sel.includes("boost_expires_at")) {
          return { data: [
            { id: "shown", avatar: "a", type: "Model", birthdate: "1990-05-15", preferences: {} },
            { id: "hidden", avatar: "a", type: "Model", birthdate: "1990-05-15", preferences: { showAge: false } },
          ] };
        }
        return { data: null };
      },
      muse_blocks: () => ({ data: [] }),
    });
    const body = await (await GET(req("discover-ranked", "tok"))).json();
    const shown = body.profiles.find((p: any) => p.id === "shown");
    const hidden = body.profiles.find((p: any) => p.id === "hidden");
    expect(typeof shown.age).toBe("number");
    expect(shown.birthdate).toBeUndefined();
    expect(shown.preferences).toBeUndefined();
    expect(hidden.age).toBeUndefined();
    expect(hidden.showAge).toBe(false);
    expect(hidden.birthdate).toBeUndefined();
  });
});

describe("GET matches — blocking", () => {
  it("filters out a match whose target the viewer has blocked", async () => {
    (globalThis as any).__authUser = { id: "auth-1" };
    let pCalls = 0;
    installSb({
      muse_profiles: () => {
        pCalls++;
        return pCalls === 1 ? { data: { id: "me" } } : { data: { age_verified: false, age_verified_at: null } };
      },
      muse_matches: () => ({ data: [
        { id: "m1", user_id: "me", target_id: { id: "blocked", nsfw: false, avatar: "a" } },
        { id: "m2", user_id: "me", target_id: { id: "ok", nsfw: false, avatar: "b" } },
      ] }),
      muse_blocks: () => ({ data: [{ user_id: "me", target_id: "blocked" }] }),
    });
    const body = await (await GET(req("matches", "tok"))).json();
    expect(body.matches.map((m: any) => m.id)).toEqual(["m2"]);
  });
});

describe("GET messages — participant + limit logic", () => {
  function authed() {
    (globalThis as any).__authUser = { id: "a" };
    return installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_messages: () => ({ data: [{ id: "msg1" }] }),
    });
  }
  it("returns [] without a match_id", async () => {
    authed();
    const body = await (await GET(req("messages", "tok"))).json();
    expect(body.messages).toEqual([]);
  });
  it("403s for a non-participant conversation key", async () => {
    authed();
    expect((await GET(req("messages", "tok", { match_id: "other1__other2" }))).status).toBe(403);
  });
  it("clamps the limit to 500 and applies the before cursor", async () => {
    const sb = authed();
    const body = await (await GET(req("messages", "tok", { match_id: "me__other", limit: "99999", before: "2026-01-01" }))).json();
    expect(body.messages).toEqual([{ id: "msg1" }]);
    const msgCalls = tableCalls(sb.__log, "muse_messages");
    expect(msgCalls.find((c) => c.method === "limit")?.args[0]).toBe(500);
    expect(msgCalls.some((c) => c.method === "lt" && c.args[0] === "created_at")).toBe(true);
  });
});

describe("GET simple list types", () => {
  it.each([
    ["feed", "posts", "muse_feed_posts"],
    ["briefs", "briefs", "muse_briefs"],
    ["forum", "posts", "muse_forum_posts"],
    ["events", "events", "muse_events"],
    ["communities", "communities", "muse_communities"],
    ["moments", "moments", "muse_moments"],
  ])("%s returns the %s list", async (type, key, table) => {
    installSb({ [table]: () => ({ data: [{ id: "row1" }] }) });
    const body = await (await GET(req(type))).json();
    expect(body[key]).toEqual([{ id: "row1" }]);
  });
});

describe("GET rsvps", () => {
  it("maps event ids for an authed user", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_rsvps: () => ({ data: [{ event_id: "e1" }, { event_id: "e2" }] }),
    });
    const body = await (await GET(req("rsvps", "tok"))).json();
    expect(body.rsvps).toEqual(["e1", "e2"]);
  });
  it("returns [] for an unauthenticated caller", async () => {
    installSb({});
    const body = await (await GET(req("rsvps"))).json();
    expect(body.rsvps).toEqual([]);
  });
});

describe("GET export", () => {
  it("400s without an Authorization header", async () => {
    installSb({});
    expect((await GET(req("export"))).status).toBe(400);
  });
  it("401s with an invalid token", async () => {
    const sb = installSb({});
    sb.auth.getUser = async () => ({ data: { user: null }, error: { message: "bad" } });
    expect((await GET(req("export", "tok"))).status).toBe(401);
  });
  it("404s when the profile row is missing", async () => {
    (globalThis as any).__authUser = { id: "auth-1", email: "a@b.com" };
    installSb({ muse_profiles: () => ({ data: null }) });
    expect((await GET(req("export", "tok"))).status).toBe(404);
  });
  it("returns the full account export", async () => {
    (globalThis as any).__authUser = { id: "auth-1", email: "a@b.com" };
    installSb({ muse_profiles: () => ({ data: { id: "me", name: "Ada" } }) });
    const body = await (await GET(req("export", "tok"))).json();
    expect(body.auth).toEqual({ id: "auth-1", email: "a@b.com" });
    expect(body.muse_profiles).toEqual({ id: "me", name: "Ada" });
    expect(body.muse_messages).toEqual([]);
    expect(typeof body.exportedAt).toBe("string");
  });
});

describe("GET community-members", () => {
  it("defaults an unknown role to member priority", async () => {
    installSb({
      muse_community_members: () => ({ data: [
        { user_id: "u1", role: "weird", joined_at: "1" },
        { user_id: "u2", role: "admin", joined_at: "2" },
      ] }),
    });
    const body = await (await GET(req("community-members", "", { communityId: "11111111-1111-4111-8111-111111111111" }))).json();
    expect(body.members[0].role).toBe("admin");
  });
});

describe("GET sessions — host trust enrichment", () => {
  it("attaches verified + completed-host counts", async () => {
    installSb({
      muse_sessions: () => ({ data: [{ id: "s1", host_id: "h1" }, { id: "s2", host_id: "h2" }] }),
      muse_profiles: () => ({ data: [{ id: "h1", verified: true }, { id: "h2", verified: false }] }),
      muse_bookings: () => ({ data: [{ host_id: "h1" }, { host_id: "h1" }] }),
    });
    const body = await (await GET(req("sessions"))).json();
    const s1 = body.sessions.find((s: any) => s.id === "s1");
    const s2 = body.sessions.find((s: any) => s.id === "s2");
    expect(s1.hostVerified).toBe(true);
    expect(s1.hostCompletedSessions).toBe(2);
    expect(s2.hostCompletedSessions).toBe(0);
  });
  it("skips enrichment when there are no sessions", async () => {
    installSb({ muse_sessions: () => ({ data: [] }) });
    const body = await (await GET(req("sessions"))).json();
    expect(body.sessions).toEqual([]);
  });
});

describe("GET discover-count", () => {
  it("returns totals for an authed user", async () => {
    (globalThis as any).__authUser = { id: "a" };
    let n = 0;
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "id" ? { data: { id: "me" } } : { count: ++n === 1 ? 100 : 12 }),
    });
    const body = await (await GET(req("discover-count", "tok"))).json();
    expect(body).toEqual({ total: 100, activeLastWeek: 12 });
  });
});

describe("GET professionals", () => {
  it("resolves profile ids and aggregates review stats", async () => {
    installSb({
      muse_professionals: () => ({ data: [{ id: "p1", user_id: "auth-h1" }] }),
      muse_profiles: () => ({ data: [{ id: "prof-1", auth_id: "auth-h1", verified: true }] }),
      muse_reviews: () => ({ data: [
        { reviewee_id: "prof-1", rating: 5, criteria_communication: 5, criteria_reliability: 4 },
        { reviewee_id: "prof-1", rating: 3, criteria_communication: 3 },
      ] }),
    });
    const body = await (await GET(req("professionals"))).json();
    const p = body.professionals[0];
    expect(p.profileId).toBe("prof-1");
    expect(p.verified).toBe(true);
    expect(p.reviewRating).toBe(4);
    expect(p.reviewCount).toBe(2);
    expect(p.reviewCriteria.communication).toBe(4);
  });
});

describe("GET reviews", () => {
  it("400s without a profile id or session", async () => {
    installSb({});
    expect((await GET(req("reviews"))).status).toBe(400);
  });
  it("returns [] for a non-uuid profile_id", async () => {
    installSb({});
    const body = await (await GET(req("reviews", "", { profile_id: "nope" }))).json();
    expect(body.reviews).toEqual([]);
  });
  it("maps criteria into a nested object", async () => {
    installSb({ muse_reviews: () => ({ data: [{ id: "r1", rating: 5, body: "great", created_at: "t", reviewer_id: { name: "A" }, criteria_communication: 4, criteria_safety: 5 }] }) });
    const body = await (await GET(req("reviews", "", { profile_id: "11111111-1111-4111-8111-111111111111" }))).json();
    expect(body.reviews[0].criteria).toEqual({ communication: 4, reliability: null, creative_quality: null, professionalism: null, safety: 5 });
  });
});

describe("GET creative-trust", () => {
  const pid = "11111111-1111-4111-8111-111111111111";
  it("400s without profile_id", async () => {
    installSb({});
    expect((await GET(req("creative-trust"))).status).toBe(400);
  });
  it("returns trust:null for a non-uuid", async () => {
    installSb({});
    const body = await (await GET(req("creative-trust", "", { profile_id: "nope" }))).json();
    expect(body.trust).toBeNull();
  });
  it("returns trust:null when the profile is missing", async () => {
    installSb({ muse_profiles: () => ({ data: null }) });
    const body = await (await GET(req("creative-trust", "", { profile_id: pid }))).json();
    expect(body.trust).toBeNull();
  });
  it("aggregates reviews, response rate and completed bookings", async () => {
    installSb({
      muse_profiles: () => ({ data: { id: pid, name: "Ada", verified: true, age_verified: true, age_verified_at: new Date().toISOString(), boost_expires_at: null, last_seen_at: new Date(Date.now() - 3 * 86400000).toISOString(), created_at: "2025-01-01", profile_completion_pct: 80 } }),
      muse_reviews: () => ({ data: [{ rating: 5, criteria_communication: 5 }, { rating: 4, criteria_communication: 3 }] }),
      muse_bookings: () => ({ count: 4 }),
      muse_message_requests: () => ({ data: [{ status: "accepted" }, { status: "declined" }, { status: "pending" }, { status: "accepted" }] }),
    });
    const body = await (await GET(req("creative-trust", "", { profile_id: pid }))).json();
    expect(body.trust.verified).toBe(true);
    expect(body.trust.ageVerified).toBe(true);
    expect(body.trust.rating).toBe(4.5);
    expect(body.trust.reviewCount).toBe(2);
    expect(body.trust.completedAsHost).toBe(4);
    expect(body.trust.responseRate).toBe(75);
    expect(body.trust.lastSeenDaysAgo).toBe(3);
  });
});

describe("GET photo-likes", () => {
  it("returns empty counts when no urls are supplied", async () => {
    installSb({});
    const body = await (await GET(req("photo-likes"))).json();
    expect(body.counts).toEqual({});
  });
  it("counts likes and flags likedByMe for an authed viewer", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_photo_likes: (calls) => (eqOf(calls, "user_id") ? { data: [{ photo_url: "u2" }] } : { data: [{ photo_url: "u1" }, { photo_url: "u1" }] }),
    });
    const body = await (await GET(req("photo-likes", "tok", { urls: "u1,u2" }))).json();
    expect(body.counts).toEqual({ u1: 2, u2: 0 });
    expect(body.likedByMe).toEqual({ u2: true });
  });
});

describe("GET bookings", () => {
  it("401s when unauthenticated", async () => {
    installSb({});
    expect((await GET(req("bookings"))).status).toBe(401);
  });
  it("attaches payment_status to both roles", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_bookings: (calls) => (eqOf(calls, "user_id") ? { data: [{ id: "b1" }] } : { data: [{ id: "b2" }] }),
      muse_booking_payments: () => ({ data: [{ booking_id: "b1", status: "succeeded" }] }),
    });
    const body = await (await GET(req("bookings", "tok"))).json();
    expect(body.asBooker[0].payment_status).toBe("succeeded");
    expect(body.asHost[0].payment_status).toBeNull();
  });
});

describe("GET my-stats / profile-viewers", () => {
  it("my-stats returns views and likes received", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "id") return { data: { id: "me" } };
        if (sel.includes("views_count")) return { data: { views_count: 42 } };
        return { data: null };
      },
      muse_matches: () => ({ count: 7 }),
    });
    const body = await (await GET(req("my-stats", "tok"))).json();
    expect(body).toEqual({ views: 42, likesReceived: 7 });
  });
  it("profile-viewers dedupes and drops viewers with no profile", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "id") return { data: { id: "me" } };
        if (sel.includes("verified")) return { data: [{ id: "v1", name: "A" }, { id: "v2", name: "B" }] };
        return { data: null };
      },
      muse_activity_log: () => ({ data: [{ actor_id: "v1", created_at: "t1" }, { actor_id: "v1", created_at: "t2" }, { actor_id: "ghost", created_at: "t3" }] }),
    });
    const body = await (await GET(req("profile-viewers", "tok"))).json();
    expect(body.viewers).toHaveLength(1);
    expect(body.viewers[0].id).toBe("v1");
  });
});

describe("GET profile-completion", () => {
  it("returns 0 when the profile is missing", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "id" ? { data: { id: "me" } } : { data: null }),
    });
    const body = await (await GET(req("profile-completion", "tok"))).json();
    expect(body).toEqual({ completion: 0, breakdown: {} });
  });
  it("computes weighted completion and persists it", async () => {
    (globalThis as any).__authUser = { id: "a" };
    const sb = installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "id") return { data: { id: "me" } };
        if (sel.includes("life_path")) {
          return { data: { id: "me", name: "Ada", bio: "a".repeat(25), styles: ["x"], looking: ["y"], avatar: "av", type: "Model", age_verified: true, zodiac: "Aries", chinese: null, mbti: null, life_path: null } };
        }
        return { data: null };
      },
      muse_prompt_responses: () => ({ count: 3 }),
      muse_prompt_bank: () => ({ count: 10 }),
      muse_albums: () => ({ data: [{ id: "a1" }] }),
      muse_album_photos: () => ({ count: 2 }),
    });
    const body = await (await GET(req("profile-completion", "tok"))).json();
    expect(body.completion).toBe(100);
    expect(body.breakdown.avatar.done).toBe(true);
    expect(body.breakdown.photos.done).toBe(true);
    expect(tableCalls(sb.__log, "muse_profiles").some((c) => c.method === "update")).toBe(true);
  });
});

describe("GET my-analytics", () => {
  it("aggregates counts and earnings", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "id") return { data: { id: "me" } };
        if (sel.includes("views_count")) return { data: { views_count: 9 } };
        return { data: null };
      },
      muse_activity_log: () => ({ data: [{ created_at: "x" }, { created_at: "y" }] }),
      muse_matches: () => ({ count: 3 }),
      muse_messages: () => ({ count: 4 }),
      muse_brief_applications: () => ({ count: 5 }),
      muse_bookings: (calls) => (eqOf(calls, "status") === "completed" ? { data: [{ id: "bk1" }] } : { count: 2 }),
      muse_booking_payments: () => ({ data: [{ amount_cents: 1000, status: "succeeded" }, { amount_cents: 500, status: "succeeded" }] }),
    });
    const body = await (await GET(req("my-analytics", "tok"))).json();
    expect(body.views).toBe(9);
    expect(body.viewsLast30Days).toBe(2);
    expect(body.matchesReceived).toBe(3);
    expect(body.messagesSent).toBe(4);
    expect(body.briefApplications).toBe(5);
    expect(body.totalEarningsCents).toBe(1500);
    expect(body.totalEarningsUsd).toBe("15.00");
  });
});

describe("GET notifications family", () => {
  it("notifications returns [] when the profile is missing", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({ muse_profiles: () => ({ data: null }) });
    const body = await (await GET(req("notifications", "tok"))).json();
    expect(body.notifications).toEqual([]);
  });
  it("notifications flattens the from_id embed", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: () => ({ data: { id: "me" } }),
      muse_notifications: () => ({ data: [{ id: "n1", type: "like", read: false, from_id: { name: "Ada", avatar: "av" } }] }),
    });
    const body = await (await GET(req("notifications", "tok"))).json();
    expect(body.notifications[0].from).toBe("Ada");
    expect(body.notifications[0].avatar).toBe("av");
  });
  it("notification-count sums unread + pending requests", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: () => ({ data: { id: "me" } }),
      muse_notifications: () => ({ count: 2 }),
      muse_message_requests: () => ({ count: 3 }),
    });
    const body = await (await GET(req("notification-count", "tok"))).json();
    expect(body).toEqual({ count: 5 });
  });
  it("notifications-grouped categorizes and adds pending requests", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: () => ({ data: { id: "me" } }),
      muse_notifications: () => ({ data: [
        { type: "match", read: false }, { type: "message", read: true }, { type: "booking", read: false },
        { type: "suspension", read: false }, { type: "weird", read: true },
      ] }),
      muse_message_requests: () => ({ count: 2 }),
    });
    const body = await (await GET(req("notifications-grouped", "tok"))).json();
    expect(body.groups.matches.unread).toBe(1);
    expect(body.groups.messages.unread).toBe(2);
    expect(body.groups.bookings.items).toHaveLength(1);
    expect(body.groups.safety.items).toHaveLength(1);
    expect(body.groups.other.items).toHaveLength(1);
  });
  it("notification-prefs returns the nested prefs object", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({ muse_profiles: () => ({ data: { id: "me", preferences: { notifications: { match: false } } } }) });
    const body = await (await GET(req("notification-prefs", "tok"))).json();
    expect(body.prefs).toEqual({ match: false });
  });
});

describe("GET saved-search-list / boost-status / payout-readiness / my-refunds", () => {
  it("saved-search-list returns searches", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_saved_searches: () => ({ data: [{ id: "s1", name: "n" }] }),
    });
    const body = await (await GET(req("saved-search-list", "tok"))).json();
    expect(body.searches[0].id).toBe("s1");
  });
  it("boost-status returns the real shared boost state", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "id") return { data: { id: "me" } };
        if (sel.includes("boost_inventory")) return { data: { tier: "muse_pro", boost_inventory: 2, boost_expires_at: null } };
        return { data: null };
      },
    });
    const body = await (await GET(req("boost-status", "tok"))).json();
    expect(body).toEqual({ isPro: true, inventory: 2, isBoosted: false, expiresAt: null });
  });
  it("payout-readiness flags a host with earnings but no Connect account", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_stripe_connect: () => ({ data: null }),
      muse_bookings: () => ({ data: [{ id: "bk1" }] }),
      muse_booking_payments: () => ({ data: [{ net_amount_cents: 900 }, { net_amount_cents: 100 }] }),
    });
    const body = await (await GET(req("payout-readiness", "tok"))).json();
    expect(body.connected).toBe(false);
    expect(body.completedBookingsCount).toBe(1);
    expect(body.unpaidEarningsCents).toBe(1000);
    expect(body.needsConnect).toBe(true);
  });
  it("my-refunds lists refund requests", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({ muse_profiles: (calls) => profLookup(calls) ?? { data: null }, muse_refund_requests: () => ({ data: [{ id: "r1" }] }) });
    const body = await (await GET(req("my-refunds", "tok"))).json();
    expect(body.requests[0].id).toBe("r1");
  });
});

describe("GET albums", () => {
  const other = "22222222-2222-4222-8222-222222222222";
  it("400s without profile_id", async () => {
    installSb({});
    expect((await GET(req("albums"))).status).toBe(400);
  });
  it("401s for profile_id=me without auth", async () => {
    installSb({});
    expect((await GET(req("albums", "", { profile_id: "me" }))).status).toBe(401);
  });
  it("returns [] for a non-uuid target", async () => {
    installSb({});
    const body = await (await GET(req("albums", "", { profile_id: "bad" }))).json();
    expect(body.albums).toEqual([]);
  });
  it("returns all albums with photo counts for the owner", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_albums: () => ({ data: [{ id: "al1", profile_id: "me", access_level: "private" }], error: null }),
      muse_album_photos: () => ({ data: [{ album_id: "al1" }, { album_id: "al1" }] }),
    });
    const body = await (await GET(req("albums", "tok", { profile_id: "me" }))).json();
    expect(body.albums[0].photo_count).toBe(2);
  });
  it("still returns the owner's albums when their portfolio is private", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "preferences" ? { data: { preferences: { portfolioVisibility: "private" } } } : profLookup(calls) ?? { data: null }),
      muse_albums: () => ({ data: [{ id: "al1", profile_id: "me", access_level: "public" }], error: null }),
      muse_album_photos: () => ({ data: [] }),
    });
    const body = await (await GET(req("albums", "tok", { profile_id: "me" }))).json();
    expect(body.albums.map((a: any) => a.id)).toEqual(["al1"]);
  });
  it("strips the whole portfolio from a non-owner when the owner set it private", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "preferences" ? { data: { preferences: { portfolioVisibility: "private" } } } : profLookup(calls) ?? { data: null }),
      muse_albums: () => ({ data: [{ id: "pub", profile_id: other, access_level: "public" }], error: null }),
      muse_album_photos: () => ({ data: [{ album_id: "pub" }] }),
    });
    const body = await (await GET(req("albums", "tok", { profile_id: other }))).json();
    expect(body.albums).toEqual([]);
  });
  it("strips the portfolio from an unmatched viewer when the owner set matches-only", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "preferences" ? { data: { preferences: { portfolioVisibility: "matches" } } } : profLookup(calls) ?? { data: null }),
      muse_albums: () => ({ data: [{ id: "pub", profile_id: other, access_level: "public" }], error: null }),
      muse_matches: () => ({ data: [] }),
    });
    const body = await (await GET(req("albums", "tok", { profile_id: other }))).json();
    expect(body.albums).toEqual([]);
  });
  it("serves a mutually matched viewer when the owner set matches-only", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "preferences" ? { data: { preferences: { portfolioVisibility: "matches" } } } : profLookup(calls) ?? { data: null }),
      muse_albums: () => ({ data: [{ id: "pub", profile_id: other, access_level: "public" }], error: null }),
      muse_matches: () => ({ data: [{ user_id: "me", target_id: other }, { user_id: other, target_id: "me" }] }),
      muse_album_photos: () => ({ data: [{ album_id: "pub" }] }),
    });
    const body = await (await GET(req("albums", "tok", { profile_id: other }))).json();
    expect(body.albums.map((a: any) => a.id)).toEqual(["pub"]);
    expect(body.albums[0].photo_count).toBe(1);
  });
  it("hides private and ungranted invite albums from non-owners", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_albums: () => ({ data: [
        { id: "pub", profile_id: other, access_level: "public" },
        { id: "inv", profile_id: other, access_level: "invite" },
        { id: "priv", profile_id: other, access_level: "private" },
      ], error: null }),
      muse_album_access: () => ({ data: [{ album_id: "inv" }] }),
      muse_album_photos: () => ({ data: [] }),
    });
    const body = await (await GET(req("albums", "tok", { profile_id: other }))).json();
    expect(body.albums.map((a: any) => a.id).sort()).toEqual(["inv", "pub"]);
  });
  it("returns 500 when the album query errors", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_albums: () => ({ data: null, error: { message: "db" } }),
    });
    expect((await GET(req("albums", "tok", { profile_id: other }))).status).toBe(500);
  });
});

describe("GET album-photos", () => {
  const aid = "33333333-3333-4333-8333-333333333333";
  const other = "22222222-2222-4222-8222-222222222222";
  it("400s without album_id", async () => {
    installSb({});
    expect((await GET(req("album-photos"))).status).toBe(400);
  });
  it("returns [] for a non-uuid", async () => {
    installSb({});
    const body = await (await GET(req("album-photos", "", { album_id: "bad" }))).json();
    expect(body.photos).toEqual([]);
  });
  it("404s when the album does not exist", async () => {
    installSb({ muse_albums: () => ({ data: null }) });
    expect((await GET(req("album-photos", "", { album_id: aid }))).status).toBe(404);
  });
  it("403s on a private album for a non-owner", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_albums: () => ({ data: { id: aid, profile_id: "other", access_level: "private" } }),
    });
    expect((await GET(req("album-photos", "tok", { album_id: aid }))).status).toBe(403);
  });
  it("403s on an invite album without a grant", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_albums: () => ({ data: { id: aid, profile_id: "other", access_level: "invite" } }),
      muse_album_access: () => ({ data: null }),
    });
    expect((await GET(req("album-photos", "tok", { album_id: aid }))).status).toBe(403);
  });
  it("signs private-storage photos for an authorized viewer", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => profLookup(calls) ?? { data: null },
      muse_albums: () => ({ data: { id: aid, profile_id: "me", access_level: "public" } }),
      muse_album_photos: () => ({ data: [{ id: "ph1", img_url: "storage://muse-private/secret.jpg" }], error: null }),
      storage: () => ({ data: { signedUrl: "https://signed/secret.jpg" }, error: null }),
    });
    const body = await (await GET(req("album-photos", "tok", { album_id: aid }))).json();
    expect(body.photos[0].img_url).toBe("https://signed/secret.jpg");
  });
  it("403s a non-owner when the owner's portfolio is private (even on a public album)", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "preferences" ? { data: { preferences: { portfolioVisibility: "private" } } } : profLookup(calls) ?? { data: null }),
      muse_albums: () => ({ data: { id: aid, profile_id: "other", access_level: "public" } }),
      muse_album_photos: () => ({ data: [{ id: "ph1", img_url: "storage://muse-private/secret.jpg" }], error: null }),
    });
    expect((await GET(req("album-photos", "tok", { album_id: aid }))).status).toBe(403);
  });
  it("403s an unmatched viewer when the owner set matches-only", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "preferences" ? { data: { preferences: { portfolioVisibility: "matches" } } } : profLookup(calls) ?? { data: null }),
      muse_albums: () => ({ data: { id: aid, profile_id: "other", access_level: "public" } }),
      muse_matches: () => ({ data: [] }),
    });
    expect((await GET(req("album-photos", "tok", { album_id: aid }))).status).toBe(403);
  });
  it("serves a mutually matched viewer when the owner set matches-only", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "preferences" ? { data: { preferences: { portfolioVisibility: "matches" } } } : profLookup(calls) ?? { data: null }),
      muse_albums: () => ({ data: { id: aid, profile_id: other, access_level: "public" } }),
      muse_matches: () => ({ data: [{ user_id: "me", target_id: other }, { user_id: other, target_id: "me" }] }),
      muse_album_photos: () => ({ data: [{ id: "ph1", img_url: "https://cdn.test/x.jpg" }], error: null }),
    });
    const body = await (await GET(req("album-photos", "tok", { album_id: aid }))).json();
    expect(body.photos[0].img_url).toBe("https://cdn.test/x.jpg");
  });
  it("still serves the owner's own album when they set the portfolio private", async () => {
    (globalThis as any).__authUser = { id: "a" };
    installSb({
      muse_profiles: (calls) => (selectArg(calls) === "preferences" ? { data: { preferences: { portfolioVisibility: "private" } } } : profLookup(calls) ?? { data: null }),
      muse_albums: () => ({ data: { id: aid, profile_id: "me", access_level: "public" } }),
      muse_album_photos: () => ({ data: [{ id: "ph1", img_url: "https://cdn.test/mine.jpg" }], error: null }),
    });
    const body = await (await GET(req("album-photos", "tok", { album_id: aid }))).json();
    expect(body.photos[0].img_url).toBe("https://cdn.test/mine.jpg");
  });
});

describe("GET admin-analytics", () => {
  it("403s without a token", async () => {
    installSb({});
    expect((await GET(req("admin-analytics"))).status).toBe(403);
  });
  it("403s for a non-admin", async () => {
    (globalThis as any).__authUser = { id: "a" };
    process.env.ADMIN_EMAILS = "admin@x.com";
    installSb({ muse_profiles: () => ({ data: { email: "user@x.com" } }) });
    expect((await GET(req("admin-analytics", "tok"))).status).toBe(403);
  });
  it("returns an analytics payload for an admin", async () => {
    (globalThis as any).__authUser = { id: "a", email: "admin@x.com" };
    process.env.ADMIN_EMAILS = "admin@x.com";
    installSb({
      muse_profiles: (calls) => {
        const sel = selectArg(calls);
        if (sel === "email") return { data: { email: "admin@x.com" } };
        if (calls.some((c) => c.method === "gte")) return { data: [{ created_at: "2026-06-10T00:00:00Z" }] };
        return { data: null, count: 5 };
      },
      muse_activity_log: () => ({ data: [{ user_id: "u1" }, { user_id: "u2" }] }),
      muse_events_log: (calls) => (calls.some((c) => c.method === "limit" && c.args[0] === 5000) ? { data: [{ name: "view" }] } : { data: [{ name: "view", props: {}, created_at: "t" }] }),
      muse_referrals: () => ({ count: 3 }),
      muse_booking_payments: () => ({ data: [{ amount_cents: 100, commission_cents: 7, status: "succeeded" }] }),
      muse_stripe_connect: () => ({ count: 2 }),
      muse_admin_audit_log: () => ({ data: [{ id: "a1" }] }),
      muse_safety_incidents: () => ({ data: [{ status: "open", created_at: "t", reviewed_at: "t2" }] }),
      muse_reports: () => ({ count: 4 }),
      muse_refund_requests: () => ({ data: [{ status: "open" }] }),
      muse_calls: () => ({ data: [{ status: "answered" }, { status: "missed" }] }),
    });
    const body = await (await GET(req("admin-analytics", "tok"))).json();
    expect(body.totals).toHaveProperty("users");
    expect(body.payments.succeeded).toBe(1);
    expect(body.connectedAccounts).toBe(2);
    expect(body.reportCounts.total).toBe(4);
    expect(body.calls.total).toBe(2);
    expect(body.refunds.open).toBe(1);
    expect(body.retention.retentionRatePct).toBe(100);
  });
});

describe("GET admin-audit-log", () => {
  it("403s for a non-admin", async () => {
    (globalThis as any).__authUser = { id: "a", email: "user@x.com" };
    process.env.ADMIN_EMAILS = "admin@x.com";
    installSb({ muse_profiles: () => ({ data: { email: "user@x.com" } }) });
    expect((await GET(req("admin-audit-log", "tok"))).status).toBe(403);
  });
  it("returns audit entries for an admin with limit/offset", async () => {
    (globalThis as any).__authUser = { id: "a", email: "admin@x.com" };
    process.env.ADMIN_EMAILS = "admin@x.com";
    installSb({ muse_profiles: () => ({ data: { email: "admin@x.com" } }), muse_admin_audit_log: () => ({ data: [{ id: "e1" }] }) });
    const body = await (await GET(req("admin-audit-log", "tok", { limit: "10", offset: "5" }))).json();
    expect(body.entries[0].id).toBe("e1");
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(5);
  });
});

describe("GET unknown type + unexpected errors", () => {
  it("400s for an unknown type", async () => {
    installSb({});
    expect((await GET(req("nope"))).status).toBe(400);
  });
  it("500s and logs when an unexpected error is thrown", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    installSb({ muse_profiles: () => { throw new Error("boom"); } });
    expect((await GET(req("profiles"))).status).toBe(500);
  });
});
