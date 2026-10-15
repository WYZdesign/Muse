import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import type { ActionContext } from "@/lib/muse-actions/shared";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/questEngine", () => ({ bumpQuest: async () => ({}), questPeriodKey: () => "daily", awardQuestXp: async () => ({}), setQuestProgress: async () => ({}), refreshMetaQuest: async () => ({}), bumpLoginStreak: async () => ({}), setReferralQuestProgress: async () => ({}), getQuestDefinitions: () => [], questsForPeriod: () => [], rotateQuests: () => [], seededHash: () => 0 }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: unknown[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));

type TestGlobals = { __sbMock: unknown };
const g = vi.hoisted(() => globalThis as unknown as TestGlobals);

type TargetRow = { id: string; suspended: boolean; views_count: number };
const state: { upserts: Record<string, unknown>[]; inserts: Record<string, unknown>[]; deletes: unknown[]; updates: unknown[]; target: TargetRow; likeCount: number } = { upserts: [], inserts: [], deletes: [], updates: [], target: { id: "t1", suspended: false, views_count: 5 }, likeCount: 0 };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => g.__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { matchCreate, matchDelete, profileViewTrack } from "@/lib/muse-actions/matching";

type MockQuery = {
  select: () => MockQuery;
  eq: () => MockQuery;
  or: () => MockQuery;
  gte: () => MockQuery;
  limit: () => MockQuery;
  delete: () => MockQuery;
  upsert: (value: Record<string, unknown>) => MockQuery;
  insert: (value: Record<string, unknown>) => MockQuery;
  update: (value: Record<string, unknown>) => MockQuery;
  maybeSingle: () => Promise<{ data: unknown }>;
  // Awaiting a chain (head:true count reads) resolves to a count. Counted
  // queries run against muse_activity_log for the Free daily-like cap; every
  // other awaited chain is the reciprocal-match probe, which stays 0 unless a
  // test opts in.
  then: (onFulfilled?: (v: { count: number; data: unknown[] }) => unknown) => Promise<{ count: number; data: unknown[] }>;
};
function makeQuery(table: string): MockQuery {
  const q: MockQuery = {
    select: () => q,
    eq: () => q, or: () => q, gte: () => q, limit: () => q, delete: () => q,
    upsert: (v) => { state.upserts.push(v); return q; },
    insert: (v) => { state.inserts.push(v); return q; },
    update: (v) => { state.updates.push(v); return q; },
    // muse_blocks lookups share this builder but must never resolve to the
    // target profile row — otherwise every non-blocked match would 403.
    maybeSingle: async () => ({ data: table === "muse_blocks" ? null : state.target }),
    then: (onFulfilled?: (v: { count: number; data: unknown[] }) => unknown) =>
    Promise.resolve({ count: table === "muse_activity_log" ? state.likeCount : 0, data: [] as unknown[] }).then(onFulfilled) as Promise<{ count: number; data: unknown[] }>,
  };
  return q;
}
const req = {} as unknown as NextRequest;
function ctx(over: { me?: string; rest?: Record<string, unknown>; tier?: string } = {}): ActionContext {
  return {
    sb: { from: (table: string) => makeQuery(table) } as unknown as ActionContext["sb"],
    profile: { id: over.me || "u1", name: "Ada", ...(over.tier ? { tier: over.tier } : {}) },
    rest: over.rest || {},
    ip: "10.0.0.1",
    req,
  };
}

beforeEach(() => { vi.clearAllMocks(); state.upserts = []; state.inserts = []; state.deletes = []; state.updates = []; state.target = { id: "t1", suspended: false, views_count: 5 }; state.likeCount = 0; });

describe("matching actions", () => {
  it("matchCreate requires target_id (400)", async () => {
    const r = await matchCreate(ctx({ rest: {} }));
    expect((r as Response).status).toBe(400);
  });

  it("matchCreate rejects matching yourself (400)", async () => {
    const r = await matchCreate(ctx({ me: "u1", rest: { target_id: "u1" } }));
    expect((r as Response).status).toBe(400);
  });

  it("matchCreate demo path: non-UUID target short-circuits to demo success", async () => {
    const r = await matchCreate(ctx({ rest: { target_id: "not-a-uuid-demo" } }));
    expect((r as Response).status).toBe(200);
    const body = await (r as Response).json();
    expect(body.demo).toBe(true);
  });

  it("matchCreate rejects a suspended target (403)", async () => {
    state.target = { id: "t1", suspended: true, views_count: 0 };
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111" } }));
    expect((r as Response).status).toBe(403);
  });

  it("matchDelete requires target_id (400)", async () => {
    const r = await matchDelete(ctx({ rest: {} }));
    expect((r as Response).status).toBe(400);
  });

  it("profileViewTrack no-ops on missing/self target", async () => {
    const r = await profileViewTrack(ctx({ me: "u1", rest: {} }));
    expect((r as Response).status).toBe(200);
  });

  it("matchCreate stores an anchored like's prompt text and uses it in the notification", async () => {
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111", anchor_type: "prompt", anchor_value: "My creative superpower is finding light" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts[0]).toMatchObject({ anchor_type: "prompt", anchor_value: "My creative superpower is finding light" });
    const notif = state.inserts.find((i) => i.type === "match")!;
    expect(notif.body).toContain("liked your prompt");
    expect(notif.body).toContain("My creative superpower is finding light");
  });

  it("matchCreate stores an anchored photo like and uses it in the notification", async () => {
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111", anchor_type: "photo", anchor_value: "Photo #2" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts[0]).toMatchObject({ anchor_type: "photo", anchor_value: "Photo #2" });
    const notif = state.inserts.find((i) => i.type === "match")!;
    expect(notif.body).toContain("Photo #2");
  });

  it("matchCreate ignores an invalid anchor_type", async () => {
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111", anchor_type: "bogus", anchor_value: "x" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts[0].anchor_type).toBeUndefined();
  });

  it("matchCreate persists a plain note when there's no anchor", async () => {
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111", note: "Loved your work!" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts[0]).toMatchObject({ note: "Loved your work!" });
    const notif = state.inserts.find((i) => i.type === "match")!;
    expect(notif.body).toContain("Loved your work!");
  });

  it("matchCreate lets a Free user like while under the daily cap", async () => {
    state.likeCount = 9;
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts).toHaveLength(1);
  });

  it("matchCreate blocks a Free user at the daily cap with LIKE_LIMIT and consumes no like", async () => {
    state.likeCount = 10;
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111" } }));
    expect((r as Response).status).toBe(429);
    const body = await (r as Response).json();
    expect(body.code).toBe("LIKE_LIMIT");
    expect(body.limit).toBe(10);
    expect(state.upserts).toHaveLength(0);
    expect(state.inserts.filter((i) => i.type === "match")).toHaveLength(0);
  });

  it("matchCreate keeps blocking a Free user who is already past the cap", async () => {
    state.likeCount = 25;
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111" } }));
    expect((r as Response).status).toBe(429);
    expect(state.upserts).toHaveLength(0);
  });

  it("matchCreate does not cap a muse_pro subscriber", async () => {
    state.likeCount = 500;
    const r = await matchCreate(ctx({ tier: "muse_pro", rest: { target_id: "11111111-1111-4111-8111-111111111111" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts).toHaveLength(1);
  });

  it("matchCreate does not cap a muse_studio subscriber (Pro-equivalent)", async () => {
    state.likeCount = 500;
    const r = await matchCreate(ctx({ tier: "muse_studio", rest: { target_id: "11111111-1111-4111-8111-111111111111" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts).toHaveLength(1);
  });

  it("matchCreate treats the legacy 'pro' tier string as paid too", async () => {
    state.likeCount = 500;
    const r = await matchCreate(ctx({ tier: "pro", rest: { target_id: "11111111-1111-4111-8111-111111111111" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts).toHaveLength(1);
  });
});
