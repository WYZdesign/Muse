import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSb, tableCalls, type SbCall } from "@/test-support/sb";

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
}));

import {
  questPeriodKey,
  seededHash,
  rotateQuests,
  ROTATION_LIMITS,
  notifyQuestComplete,
  setQuestProgress,
  awardQuestXp,
  bumpQuest,
  setReferralQuestProgress,
  bumpLoginStreak,
} from "./questEngine";

interface State {
  quests: any[];
  userQuest: any;
  count: number;
  xpRow: any;
  profile: any;
  referralCount: number;
  inserts: any[];
  updates: any[];
  upserts: any[];
  throwOn: string | null;
}
const state: State = {
  quests: [], userQuest: null, count: 0, xpRow: null, profile: null, referralCount: 0,
  inserts: [], updates: [], upserts: [], throwOn: null,
};

function eqValue(calls: SbCall[], field: string): any {
  const c = [...calls].reverse().find((x) => x.method === "eq" && x.args[0] === field);
  return c?.args[1];
}
function selectArgs(calls: SbCall[]): any[] {
  const c = [...calls].reverse().find((x) => x.method === "select");
  return c?.args ?? [];
}

function installSb() {
  (globalThis as any).__sbMock = createSb((table, calls) => {
    if (state.throwOn === table) throw new Error("boom");
    const mutation = calls.find((c) => ["insert", "update", "upsert"].includes(c.method));
    if (mutation?.method === "insert") { state.inserts.push(mutation.args[0]); return { data: null, error: null }; }
    if (mutation?.method === "upsert") { state.upserts.push(mutation.args[0]); return { data: null, error: null }; }
    if (mutation?.method === "update") { state.updates.push(mutation.args[0]); return { data: null, error: null }; }

    if (table === "muse_quests") {
      if (eqValue(calls, "action_key") === "meta_quests") return { data: [], error: null };
      return { data: state.quests, error: null };
    }
    if (table === "muse_user_quests") {
      const select = selectArgs(calls);
      if (select[1]?.count === "exact") return { data: null, error: null, count: state.count };
      return { data: state.userQuest, error: null };
    }
    if (table === "muse_user_xp") return { data: state.xpRow, error: null };
    if (table === "muse_profiles") return { data: state.profile, error: null };
    if (table === "muse_referrals") return { data: null, error: null, count: state.referralCount };
    return { data: null, error: null };
  });
}

beforeEach(() => {
  Object.assign(state, {
    quests: [], userQuest: null, count: 0, xpRow: null, profile: null, referralCount: 0,
    inserts: [], updates: [], upserts: [], throwOn: null,
  });
  installSb();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("questPeriodKey", () => {
  it("daily keys include today's UTC date and are stable per call", () => {
    const key = questPeriodKey("daily");
    expect(key).toMatch(/^daily:\d{4}-\d{2}-\d{2}$/);
    expect(questPeriodKey("daily")).toBe(key);
  });

  it("monthly keys include the yyyy-mm bucket", () => {
    expect(questPeriodKey("monthly")).toMatch(/^monthly:\d{4}-\d{2}$/);
  });

  it("lifetime and once share a single non-resetting lifetime bucket", () => {
    expect(questPeriodKey("lifetime")).toBe("lifetime:all");
    expect(questPeriodKey("once")).toBe("lifetime:all");
  });

  it("falls back to a daily bucket for unknown frequencies", () => {
    expect(questPeriodKey("weird")).toMatch(/^daily:\d{4}-\d{2}-\d{2}$/);
  });

  it("weekly keys are Monday-anchored and group dates within the same week", () => {
    // 2026-06-10 is a Wednesday; the Monday of that UTC week is 2026-06-08.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00Z"));
    const wed = questPeriodKey("weekly");
    vi.setSystemTime(new Date("2026-06-12T23:59:00Z")); // Friday, same week
    expect(questPeriodKey("weekly")).toBe(wed);
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z")); // next Monday
    expect(questPeriodKey("weekly")).not.toBe(wed);
  });
});

describe("seededHash", () => {
  it("is deterministic and unsigned 32-bit", () => {
    const h = seededHash("quest-1:daily");
    expect(h).toBe(seededHash("quest-1:daily"));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it("differs across inputs", () => {
    expect(seededHash("a")).not.toBe(seededHash("b"));
  });
});

describe("rotateQuests", () => {
  const at = new Date("2026-06-10T12:00:00Z");

  it("returns every quest when a rotating tier is within its limit", () => {
    const quests = [
      { id: "d1", quest_tier: "daily" },
      { id: "d2", quest_tier: "daily" },
      { id: "s1", quest_tier: "starter" },
    ];
    expect(rotateQuests(quests, at).map((q) => q.id).sort()).toEqual(["d1", "d2", "s1"]);
  });

  it("caps an over-limit rotating tier at exactly its rotation limit", () => {
    const quests = Array.from({ length: ROTATION_LIMITS.daily + 4 }, (_, i) => ({ id: `d${i}`, quest_tier: "daily" }));
    const result = rotateQuests(quests, at);
    expect(result).toHaveLength(ROTATION_LIMITS.daily);
    for (const q of result) expect(quests.some((x) => x.id === q.id)).toBe(true);
  });

  it("is deterministic for the same period and stable across a period", () => {
    const quests = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, quest_tier: "weekly" }));
    const a = rotateQuests(quests, at).map((q) => q.id).sort();
    const b = rotateQuests(quests, new Date("2026-06-11T01:00:00Z")).map((q) => q.id).sort();
    expect(a).toEqual(b);
  });

  it("always includes non-rotating tiers", () => {
    const quests = [
      ...Array.from({ length: 8 }, (_, i) => ({ id: `d${i}`, quest_tier: "daily" })),
      { id: "streak", quest_tier: "starter" },
      { id: "season", quest_tier: "season" },
    ];
    const ids = rotateQuests(quests, at).map((q) => q.id);
    expect(ids).toContain("streak");
    expect(ids).toContain("season");
  });

  it("caps weekly (8) and monthly (6) tiers at their own limits", () => {
    const weekly = Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, quest_tier: "weekly" }));
    const monthly = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, quest_tier: "monthly" }));
    expect(rotateQuests(weekly, at)).toHaveLength(ROTATION_LIMITS.weekly);
    expect(rotateQuests(monthly, at)).toHaveLength(ROTATION_LIMITS.monthly);
  });

  it("preserves the original quest objects intact", () => {
    const quests = [{ id: "1", quest_tier: "daily", title: "Daily 1" }, { id: "2", quest_tier: "starter", title: "Starter 2" }];
    expect(rotateQuests(quests, at)).toEqual(quests);
  });

  it("rotates to a different selection on the next daily rollover", () => {
    const quests = Array.from({ length: 20 }, (_, i) => ({ id: `d${i}`, quest_tier: "daily" }));
    const day1 = new Set(rotateQuests(quests, new Date("2026-09-01T12:00:00Z")).map((q) => q.id));
    const day2 = new Set(rotateQuests(quests, new Date("2026-09-02T12:00:00Z")).map((q) => q.id));
    const overlap = [...day1].filter((id) => day2.has(id)).length;
    expect(overlap).toBeLessThan(ROTATION_LIMITS.daily);
  });
});

describe("notifyQuestComplete", () => {
  it("inserts a quest notification", async () => {
    await notifyQuestComplete((globalThis as any).__sbMock, "u1", "First Match");
    const row = state.inserts.find((i) => i.type === "quest");
    expect(row).toMatchObject({ user_id: "u1", read: false });
    expect(row.body).toContain("First Match");
  });

  it("never throws when the insert fails", async () => {
    state.throwOn = "muse_notifications";
    await expect(notifyQuestComplete((globalThis as any).__sbMock, "u1", "x")).resolves.toBeUndefined();
  });
});

describe("setQuestProgress", () => {
  it("no-ops when no active quest matches the action_key", async () => {
    state.quests = [];
    await setQuestProgress((globalThis as any).__sbMock, "u1", "message", 3);
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("inserts a fresh row with clamped progress when none exists", async () => {
    state.quests = [{ id: "q1", frequency: "lifetime", target_count: 5, xp_reward: 0, title: "Five matches" }];
    state.userQuest = null;
    await setQuestProgress((globalThis as any).__sbMock, "u1", "message", 12);
    const row = state.inserts.find((i) => i.quest_id === "q1");
    expect(row).toMatchObject({ user_id: "u1", progress: 5, target: 5, completed: true, period_key: "lifetime:all" });
  });

  it("skips an already-completed row entirely", async () => {
    state.quests = [{ id: "q1", frequency: "lifetime", target_count: 5, xp_reward: 0, title: "x" }];
    state.userQuest = { id: "uq1", progress: 5, completed: true };
    await setQuestProgress((globalThis as any).__sbMock, "u1", "message", 9);
    expect(state.updates).toHaveLength(0);
    expect(state.inserts).toHaveLength(0);
  });

  it("skips when progress is unchanged and still incomplete", async () => {
    state.quests = [{ id: "q1", frequency: "lifetime", target_count: 9, xp_reward: 0, title: "x" }];
    state.userQuest = { id: "uq1", progress: 3, completed: false };
    await setQuestProgress((globalThis as any).__sbMock, "u1", "message", 3);
    expect(state.updates).toHaveLength(0);
  });

  it("updates an existing row and notifies on completion", async () => {
    state.quests = [{ id: "q1", frequency: "daily", target_count: 2, xp_reward: 0, title: "Two a day" }];
    state.userQuest = { id: "uq1", progress: 1, completed: false };
    await setQuestProgress((globalThis as any).__sbMock, "u1", "message", 2);
    expect(state.updates.find((u) => u.progress === 2)?.completed).toBe(true);
    expect(state.inserts.some((i) => i.type === "quest")).toBe(true);
  });
});

describe("awardQuestXp", () => {
  it("accumulates xp without levelling and returns false", async () => {
    state.xpRow = { total_xp: 0, level: 1 };
    const leveled = await awardQuestXp((globalThis as any).__sbMock, "u1", 10);
    expect(leveled).toBe(false);
    const row = state.upserts.find((u) => u.total_xp === 10);
    expect(row.level).toBe(1);
  });

  it("reports a level-up and cascades into the reach_level quest", async () => {
    state.xpRow = { total_xp: 0, level: 1 };
    const leveled = await awardQuestXp((globalThis as any).__sbMock, "u1", 100);
    expect(leveled).toBe(true);
    expect(state.upserts.some((u) => u.total_xp === 100 && u.level === 2)).toBe(true);
    // reach_level cascade fetched the (empty) quest list — no crash.
    expect(tableCalls((globalThis as any).__sbMock.__log, "muse_quests").length).toBeGreaterThan(0);
  });
});

describe("bumpLoginStreak", () => {
  it("returns the stored streak unchanged when already logged in today", async () => {
    state.profile = { login_streak: 4, last_login_date: new Date().toISOString().slice(0, 10) };
    expect(await bumpLoginStreak((globalThis as any).__sbMock, "u1")).toBe(4);
    expect(state.updates).toHaveLength(0);
  });

  it("increments when the previous login was yesterday", async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.profile = { login_streak: 4, last_login_date: yesterday };
    expect(await bumpLoginStreak((globalThis as any).__sbMock, "u1")).toBe(5);
    expect(state.updates[0]).toMatchObject({ login_streak: 5 });
  });

  it("resets to 1 after a gap of 2+ days", async () => {
    const longAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
    state.profile = { login_streak: 9, last_login_date: longAgo };
    expect(await bumpLoginStreak((globalThis as any).__sbMock, "u1")).toBe(1);
  });

  it("starts at 1 for a brand new profile", async () => {
    state.profile = null;
    expect(await bumpLoginStreak((globalThis as any).__sbMock, "u1")).toBe(1);
  });

  it("fails silently (returns 0) when the read throws", async () => {
    state.throwOn = "muse_profiles";
    expect(await bumpLoginStreak((globalThis as any).__sbMock, "u1")).toBe(0);
  });
});

describe("bumpQuest", () => {
  it("does nothing when no active quest matches", async () => {
    state.quests = [];
    await bumpQuest((globalThis as any).__sbMock, "u1", "match");
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("inserts progress 1 for a fresh non-completing quest", async () => {
    state.quests = [{ id: "q1", frequency: "daily", target_count: 3, xp_reward: 5, title: "Message 3" }];
    state.userQuest = null;
    await bumpQuest((globalThis as any).__sbMock, "u1", "message");
    const row = state.inserts.find((i) => i.quest_id === "q1");
    expect(row).toMatchObject({ progress: 1, completed: false });
  });

  it("skips a completed quest", async () => {
    state.quests = [{ id: "q1", frequency: "daily", target_count: 1, xp_reward: 0, title: "x" }];
    state.userQuest = { id: "uq1", progress: 1, completed: true };
    await bumpQuest((globalThis as any).__sbMock, "u1", "message");
    expect(state.updates).toHaveLength(0);
    expect(state.inserts).toHaveLength(0);
  });

  it("completes, notifies, awards xp and refreshes meta without recursing", async () => {
    state.quests = [{ id: "q1", frequency: "lifetime", target_count: 1, xp_reward: 20, title: "First post" }];
    state.userQuest = null;
    state.xpRow = { total_xp: 0, level: 1 };
    await bumpQuest((globalThis as any).__sbMock, "u1", "post_feed");
    const completed = state.inserts.find((i) => i.quest_id === "q1");
    expect(completed.completed).toBe(true);
    expect(state.inserts.some((i) => i.type === "quest")).toBe(true);
    expect(state.upserts.some((u) => u.total_xp === 20)).toBe(true);
  });

  it("swallows errors so a quest failure never breaks the primary action", async () => {
    state.throwOn = "muse_quests";
    await expect(bumpQuest((globalThis as any).__sbMock, "u1", "match")).resolves.toBeUndefined();
  });
});

describe("setReferralQuestProgress", () => {
  it("sets absolute progress from the referral count and completes at target", async () => {
    state.referralCount = 3;
    state.quests = [{ id: "r1", target_count: 3, xp_reward: 0, title: "Refer 3" }];
    state.userQuest = null;
    await setReferralQuestProgress((globalThis as any).__sbMock, "ref1");
    const row = state.inserts.find((i) => i.quest_id === "r1");
    expect(row).toMatchObject({ user_id: "ref1", progress: 3, completed: true, period_key: "lifetime:all" });
  });

  it("clamps progress to the target and skips already-completed rows", async () => {
    state.referralCount = 99;
    state.quests = [{ id: "r1", target_count: 5, xp_reward: 0, title: "Refer 5" }];
    state.userQuest = { id: "uq", progress: 5, completed: true };
    await setReferralQuestProgress((globalThis as any).__sbMock, "ref1");
    expect(state.updates).toHaveLength(0);
    expect(state.inserts).toHaveLength(0);
  });
});
