import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/questEngine", () => ({ bumpQuest: async () => ({}), questPeriodKey: () => "daily", awardQuestXp: async () => ({}), setQuestProgress: async () => ({}), refreshMetaQuest: async () => ({}), bumpLoginStreak: async () => ({}), setReferralQuestProgress: async () => ({}), getQuestDefinitions: () => [], questsForPeriod: () => [], rotateQuests: () => [], seededHash: () => 0 }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));

const state: any = { upserts: [], inserts: [], deletes: [], updates: [], target: { id: "t1", suspended: false, views_count: 5 } };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { matchCreate, matchDelete, profileViewTrack } from "@/lib/muse-actions/matching";

function makeQuery(table: string) {
  const q: any = {
    select: () => q,
    eq: () => q, or: () => q, limit: () => q, delete: () => q,
    upsert: (v: any) => { state.upserts.push(v); return q; },
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
    // muse_blocks lookups share this builder but must never resolve to the
    // target profile row — otherwise every non-blocked match would 403.
    maybeSingle: async () => ({ data: table === "muse_blocks" ? null : state.target }),
  };
  return q;
}
function ctx(over: any = {}) {
  return {
    sb: { from: (table: string) => makeQuery(table) },
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

  it("matchCreate stores an anchored like's prompt text and uses it in the notification", async () => {
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111", anchor_type: "prompt", anchor_value: "My creative superpower is finding light" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts[0]).toMatchObject({ anchor_type: "prompt", anchor_value: "My creative superpower is finding light" });
    const notif = state.inserts.find((i: any) => i.type === "match");
    expect(notif.body).toContain("liked your prompt");
    expect(notif.body).toContain("My creative superpower is finding light");
  });

  it("matchCreate stores an anchored photo like and uses it in the notification", async () => {
    const r = await matchCreate(ctx({ rest: { target_id: "11111111-1111-4111-8111-111111111111", anchor_type: "photo", anchor_value: "Photo #2" } }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts[0]).toMatchObject({ anchor_type: "photo", anchor_value: "Photo #2" });
    const notif = state.inserts.find((i: any) => i.type === "match");
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
    const notif = state.inserts.find((i: any) => i.type === "match");
    expect(notif.body).toContain("Loved your work!");
  });
});
