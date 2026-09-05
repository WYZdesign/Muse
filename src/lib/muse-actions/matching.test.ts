import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/questEngine", () => ({ bumpQuest: async () => ({}), questPeriodKey: () => "daily", awardQuestXp: async () => ({}), setQuestProgress: async () => ({}), refreshMetaQuest: async () => ({}), bumpLoginStreak: async () => ({}), setReferralQuestProgress: async () => ({}), getQuestDefinitions: () => [], questsForPeriod: () => [], rotateQuests: () => [], seededHash: () => 0 }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));

const state: any = { upserts: [], inserts: [], deletes: [], updates: [], target: { id: "t1", suspended: false, views_count: 5 } };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { matchCreate, matchDelete, profileViewTrack } from "@/lib/muse-actions/matching";

function makeQuery() {
  const q: any = {
    select: () => q,
    eq: () => q, or: () => q, limit: () => q, delete: () => q,
    upsert: (v: any) => { state.upserts.push(v); return q; },
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
    maybeSingle: async () => ({ data: state.target }),
  };
  return q;
}
function ctx(over: any = {}) {
  return {
    sb: { from: () => makeQuery() },
    profile: { id: over.me || "u1", name: "Ada" },
    rest: over.rest || {},
    ip: "10.0.0.1",
    req: {} as any,
  } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.upserts = []; state.inserts = []; state.deletes = []; state.updates = []; state.target = { id: "t1", suspended: false, views_count: 5 }; });

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
});
