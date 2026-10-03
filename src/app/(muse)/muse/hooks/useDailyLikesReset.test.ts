// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDailyLikesReset } from "./useDailyLikesReset";

describe("useDailyLikesReset", () => {
  it("resets likes on a fresh install (no last-reset marker)", () => {
    const setDailyLikes = vi.fn();
    const setSuperLikes = vi.fn();
    const set = vi.fn(() => true);
    renderHook(() => useDailyLikesReset({ safeGetItem: () => null, safeSetItem: set, setDailyLikes, setSuperLikes }));
    expect(setDailyLikes).toHaveBeenCalledWith(10);
    expect(setSuperLikes).toHaveBeenCalledWith(3);
    expect(set).toHaveBeenCalledWith("muse_last_reset", expect.any(String));
  });

  it("does not reset within the 24h window", () => {
    const setDailyLikes = vi.fn();
    renderHook(() => useDailyLikesReset({ safeGetItem: () => String(Date.now() - 1000), safeSetItem: vi.fn(), setDailyLikes, setSuperLikes: vi.fn() }));
    expect(setDailyLikes).not.toHaveBeenCalled();
  });

  it("resets when the last reset exceeds 24h", () => {
    const setDailyLikes = vi.fn();
    renderHook(() => useDailyLikesReset({ safeGetItem: () => String(Date.now() - 86400001), safeSetItem: vi.fn(), setDailyLikes, setSuperLikes: vi.fn() }));
    expect(setDailyLikes).toHaveBeenCalledWith(10);
  });
});
