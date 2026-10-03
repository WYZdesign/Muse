// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuestsState } from "./useQuestsState";

describe("useQuestsState", () => {
  it("starts with zero counts and a seven-false weekly login row", () => {
    const { result } = renderHook(() => useQuestsState());
    expect(result.current.claimableQuests).toBe(0);
    expect(result.current.nearQuests).toBe(0);
    expect(result.current.topQuests).toEqual([]);
    expect(result.current.loginStreak).toBe(0);
    expect(result.current.weeklyLogins).toEqual([false, false, false, false, false, false, false]);
  });

  it("updates streak, counts and quest rows", () => {
    const { result } = renderHook(() => useQuestsState());
    act(() => result.current.setLoginStreak(5));
    act(() => result.current.setClaimableQuests(2));
    act(() => result.current.setTopQuests([{ id: "q1", title: "Post", icon: "✦", progress: 1, target: 3, color: "#fff" }]));
    act(() => result.current.setWeeklyLogins((p) => p.map((v, i) => (i < 5 ? true : v))));
    expect(result.current.loginStreak).toBe(5);
    expect(result.current.claimableQuests).toBe(2);
    expect(result.current.topQuests).toHaveLength(1);
    expect(result.current.weeklyLogins.filter(Boolean)).toHaveLength(5);
  });
});
