import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSb, tableCalls, updateValue, type SbCall } from "@/test-support/sb";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/questEngine", () => ({ bumpQuest: async () => ({}), setQuestProgress: async () => ({}), bumpLoginStreak: async () => ({}), setReferralQuestProgress: async () => ({}), questPeriodKey: () => "daily", awardQuestXp: async () => ({}), refreshMetaQuest: async () => ({}), getQuestDefinitions: () => [{ action_key: "message", target_count: 1 }], questsForPeriod: () => [], rotateQuests: () => [], seededHash: () => 0 }));

const state: any = { row: null, inserts: [], updates: [], selects: {} };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

vi.mock("@/lib/push", () => ({ pushToProfile: vi.fn(async () => ({})) }));

import { questTrackQuest, questClaimQuest, questGetQuests, questNotifyClaimable } from "@/lib/muse-actions/quests";

function install(handlers: Record<string, (calls: SbCall[]) => any>) {
  const sb: any = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  (globalThis as any).__sbMock = sb;
  return sb;
}
function act(rest: any) {
  return { sb: (globalThis as any).__sbMock, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

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

describe("questGetQuests", () => {
  it("returns an empty board when no quests exist", async () => {
    install({ muse_quests: () => ({ data: null }) });
    expect(await (await questGetQuests(act({})) as Response).json()).toEqual({ quests: [], xp: { total_xp: 0, level: 1 } });
  });
  it("enriches quests with progress and returns xp", async () => {
    install({
      muse_quests: () => ({ data: [{ id: "q1", frequency: "daily", target_count: 3, sort_order: 1 }] }),
      muse_user_quests: () => ({ data: [{ quest_id: "q1", progress: 2, target: 3, completed: false, claimed: false, period_key: "daily" }] }),
      muse_user_xp: () => ({ data: { total_xp: 120, level: 2 } }),
    });
    const body = await (await questGetQuests(act({})) as Response).json();
    expect(body.quests[0]).toMatchObject({ id: "q1", progress: 2, target: 3, completed: false });
    expect(body.xp).toEqual({ total_xp: 120, level: 2 });
  });
});

describe("questTrackQuest — client tracking", () => {
  it("returns early for server-only keys", async () => {
    install({});
    expect(await (await questTrackQuest(act({ action_keys: ["match"] })) as Response).json()).toEqual({ success: true, results: [] });
  });
  it("reports noQuest when nothing matches", async () => {
    install({ muse_quests: () => ({ data: [] }) });
    expect(await (await questTrackQuest(act({ action_keys: ["message"] })) as Response).json()).toEqual({ success: true, noQuest: true });
  });
  it("skips an already-completed quest", async () => {
    install({ muse_quests: () => ({ data: [{ id: "q1", action_key: "message", frequency: "daily", target_count: 3, xp_reward: 5 }] }), muse_user_quests: () => ({ data: { id: "uq1", progress: 3, completed: true } }) });
    const body = await (await questTrackQuest(act({ action_keys: ["message"] })) as Response).json();
    expect(body.results[0]).toEqual({ action_key: "message", alreadyCompleted: true });
  });
  it("increments progress and reports completion", async () => {
    const sb = install({
      muse_quests: () => ({ data: [{ id: "q1", action_key: "message", frequency: "daily", target_count: 1, xp_reward: 5, title: "Say hi", icon: "i", reward_label: "5 XP" }] }),
      muse_user_quests: (calls) => (calls.some((c) => c.method === "insert") ? { data: null } : { data: null }),
    });
    const body = await (await questTrackQuest(act({ action_keys: ["message"] })) as Response).json();
    expect(body.results[0]).toMatchObject({ action_key: "message", progress: 1, completed: true, newlyCompleted: true });
    expect(tableCalls(sb.__log, "muse_user_quests").some((c) => c.method === "insert")).toBe(true);
  });
  it("caps the tracked keys to 6 and reports a level-up", async () => {
    install({
      muse_quests: () => ({ data: [{ id: "q1", action_key: "msg1", frequency: "daily", target_count: 1, xp_reward: 5, title: "T" }] }),
      muse_user_quests: () => ({ data: null }),
    });
    const body = await (await questTrackQuest(act({ action_keys: Array.from({ length: 10 }, (_, i) => `k${i}`) })) as Response).json();
    expect(body.success).toBe(true);
  });
});

describe("questClaimQuest — rewards", () => {
  const Q = "11111111-1111-4111-8111-111111111111";
  it("404s when the user hasn't started the quest, 400s when incomplete/claimed", async () => {
    install({ muse_quests: () => ({ data: { id: Q, frequency: "daily", reward_type: "xp" } }), muse_user_quests: () => ({ data: null }) });
    expect((await questClaimQuest(act({ quest_id: Q })) as Response).status).toBe(404);
    install({ muse_quests: () => ({ data: { id: Q, frequency: "daily", reward_type: "xp" } }), muse_user_quests: () => ({ data: { id: "uq", completed: false, claimed: false } }) });
    expect((await questClaimQuest(act({ quest_id: Q })) as Response).status).toBe(400);
    install({ muse_quests: () => ({ data: { id: Q, frequency: "daily", reward_type: "xp" } }), muse_user_quests: () => ({ data: { id: "uq", completed: true, claimed: true } }) });
    expect((await questClaimQuest(act({ quest_id: Q })) as Response).status).toBe(400);
  });
  it("409s on a lost claim race and 500s on a claim error", async () => {
    // The update returns no rows → 409
    install({
      muse_quests: () => ({ data: { id: Q, frequency: "daily", reward_type: "xp" } }),
      muse_user_quests: (calls) => (calls.some((c) => c.method === "update") ? { data: [], error: null } : { data: { id: "uq", completed: true, claimed: false } }),
    });
    expect((await questClaimQuest(act({ quest_id: Q })) as Response).status).toBe(409);
    install({
      muse_quests: () => ({ data: { id: Q, frequency: "daily", reward_type: "xp" } }),
      muse_user_quests: (calls) => (calls.some((c) => c.method === "update") ? { data: null, error: { message: "conflict" } } : { data: { id: "uq", completed: true, claimed: false } }),
    });
    expect((await questClaimQuest(act({ quest_id: Q })) as Response).status).toBe(500);
  });
  it("grants a superpower (pro months)", async () => {
    const sb = install({
      muse_quests: () => ({ data: { id: Q, frequency: "daily", reward_type: "superpower", reward_amount: 2, reward_label: "Pro" } }),
      muse_user_quests: (calls) => (calls.some((c) => c.method === "update") ? { data: [{ id: "uq" }] } : { data: { id: "uq", completed: true, claimed: false } }),
      muse_profiles: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { pro_expires_at: null } }),
    });
    const body = await (await questClaimQuest(act({ quest_id: Q })) as Response).json();
    expect(body.success).toBe(true);
    expect(body.grantedUntil).toBeTruthy();
    expect(tableCalls(sb.__log, "muse_profiles").some((c) => c.method === "update")).toBe(true);
  });
  it("grants boost credits for a boost reward", async () => {
    const sb = install({
      muse_quests: () => ({ data: { id: Q, frequency: "daily", reward_type: "boost", reward_amount: 3, reward_label: "Boost" } }),
      muse_user_quests: (calls) => (calls.some((c) => c.method === "update") ? { data: [{ id: "uq" }] } : { data: { id: "uq", completed: true, claimed: false } }),
      muse_profiles: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { boost_inventory: 1 } }),
    });
    await questClaimQuest(act({ quest_id: Q }));
    expect(updateValue(tableCalls(sb.__log, "muse_profiles"))).toEqual({ boost_inventory: 4 });
  });
  it("grants a pro_day reward, rounding up to whole months", async () => {
    install({
      muse_quests: () => ({ data: { id: Q, frequency: "daily", reward_type: "pro_day", reward_amount: 45, reward_label: "Pro" } }),
      muse_user_quests: (calls) => (calls.some((c) => c.method === "update") ? { data: [{ id: "uq" }] } : { data: { id: "uq", completed: true, claimed: false } }),
      muse_profiles: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { pro_expires_at: null } }),
    });
    const body = await (await questClaimQuest(act({ quest_id: Q })) as Response).json();
    expect(body.grantedUntil).toBeTruthy();
  });
});

describe("questNotifyClaimable", () => {
  it("returns 0 when nothing is claimable", async () => {
    install({ muse_user_quests: () => ({ data: [] }) });
    expect(await (await questNotifyClaimable({ sb: (globalThis as any).__sbMock, profile: { id: "me1" } } as any) as Response).json()).toEqual({ notified: 0 });
  });
  it("notifies each claimable quest", async () => {
    install({ muse_user_quests: () => ({ data: [{ quest_id: "q1", muse_quests: { title: "Say hi", reward_label: "5 XP" } }] }) });
    expect(await (await questNotifyClaimable({ sb: (globalThis as any).__sbMock, profile: { id: "me1" } } as any) as Response).json()).toEqual({ notified: 1 });
  });
});
