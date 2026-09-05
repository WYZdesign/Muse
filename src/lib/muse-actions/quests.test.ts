import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/questEngine", () => ({ bumpQuest: async () => ({}), setQuestProgress: async () => ({}), bumpLoginStreak: async () => ({}), setReferralQuestProgress: async () => ({}), questPeriodKey: () => "daily", awardQuestXp: async () => ({}), refreshMetaQuest: async () => ({}), getQuestDefinitions: () => [{ action_key: "message", target_count: 1 }], questsForPeriod: () => [], rotateQuests: () => [], seededHash: () => 0 }));

const state: any = { row: null, inserts: [], updates: [], selects: {} };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { questTrackQuest, questClaimQuest } from "@/lib/muse-actions/quests";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
    maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
function ctx(rest: any, row: any) {
  state.row = row;
  return { sb: { from: () => makeQuery() }, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; });

describe("quests actions", () => {
  it("questTrackQuest requires action_key (400)", async () => {
    const r = await questTrackQuest(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("questClaimQuest requires a UUID quest_id (400)", async () => {
    const r = await questClaimQuest(ctx({ quest_id: "not-a-uuid" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("questClaimQuest returns 404 when quest not found", async () => {
    const r = await questClaimQuest(ctx({ quest_id: "11111111-1111-4111-8111-111111111111" }, null));
    expect((r as Response).status).toBe(404);
  });

  it("questTrackQuest accepts an action_key (no error)", async () => {
    const r = await questTrackQuest(ctx({ action_keys: ["message"] }, null));
    // noQuest or a result — not a 400/500
    expect([200]).toContain((r as Response).status);
  });
});
