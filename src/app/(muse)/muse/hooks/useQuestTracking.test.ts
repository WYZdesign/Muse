// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useQuestTracking, deriveWeekFromStreak } from "./useQuestTracking";

afterEach(() => cleanup());

const AUTH = { id: "u1" };
const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

function args(over: Record<string, unknown> = {}) {
  const store: Record<string, string> = {};
  return {
    store,
    a: {
      bootstrapped: true,
      authUser: AUTH,
      trackQuest: vi.fn(),
      apiFetch: vi.fn(async () => json({ quests: [], streak: 3 })),
      setClaimableQuests: vi.fn(),
      setLoginStreak: vi.fn(),
      setShowDailyLogin: vi.fn(),
      setWeeklyLogins: vi.fn(),
      safeGetItem: (k: string) => store[k] ?? null,
      safeSetItem: (k: string, v: string) => { store[k] = v; return true; },
      ...over,
    },
  };
}

describe("useQuestTracking", () => {
  it("records the login day and fires login quests once, then syncs streak", async () => {
    const { a, store } = args();
    renderHook(() => useQuestTracking(a as never));
    expect(a.trackQuest).toHaveBeenCalledWith("login", "login_streak");
    expect(store["muse_quest_login_day"]).toBe(new Date().toISOString().slice(0, 10));
    await waitFor(() => expect(a.setLoginStreak).toHaveBeenCalledWith(3));
  });

  it("does nothing before bootstrap / when signed out", () => {
    const { a } = args({ bootstrapped: false });
    renderHook(() => useQuestTracking(a as never));
    expect(a.trackQuest).not.toHaveBeenCalled();
    expect(a.apiFetch).not.toHaveBeenCalled();
  });

  // Bug fix (2026-10-07): the weekly pips used to be derived from a
  // separate, purely-local `muse_login_days` localStorage array that could
  // silently disagree with the server-synced streak number (e.g. after
  // clearing site data, or on a different device). They're now derived
  // directly from the same `streak` value the server already returns.
  it("derives the weekly pips from the server streak instead of local storage", async () => {
    const { a } = args({ apiFetch: vi.fn(async () => json({ quests: [], streak: 3 })) });
    renderHook(() => useQuestTracking(a as never));
    await waitFor(() => expect(a.setWeeklyLogins).toHaveBeenCalledWith([false, false, false, false, true, true, true]));
  });
});

describe("deriveWeekFromStreak", () => {
  it("marks no days hit for a zero streak", () => {
    expect(deriveWeekFromStreak(0)).toEqual([false, false, false, false, false, false, false]);
  });

  it("marks only the most recent days hit for a streak under a week", () => {
    expect(deriveWeekFromStreak(3)).toEqual([false, false, false, false, true, true, true]);
  });

  it("marks all 7 days hit once the streak reaches a full week", () => {
    expect(deriveWeekFromStreak(7)).toEqual([true, true, true, true, true, true, true]);
  });

  it("clamps a streak longer than a week to all 7 days hit", () => {
    expect(deriveWeekFromStreak(42)).toEqual([true, true, true, true, true, true, true]);
  });
});
