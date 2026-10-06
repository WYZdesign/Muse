// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useQuestTracking } from "./useQuestTracking";

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
});
