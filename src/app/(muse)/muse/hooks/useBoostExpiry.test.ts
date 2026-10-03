// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoostExpiry } from "./useBoostExpiry";

describe("useBoostExpiry", () => {
  it("does nothing when no boost is active", () => {
    vi.useFakeTimers();
    const setBoostActive = vi.fn();
    renderHook(() => useBoostExpiry({ boostActive: false, boostEnd: 0, setBoostActive, safeRemoveItem: vi.fn() }));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(setBoostActive).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("clears the boost once it expires", () => {
    vi.useFakeTimers();
    const setBoostActive = vi.fn();
    const remove = vi.fn();
    const end = Date.now() + 1000;
    renderHook(() => useBoostExpiry({ boostActive: true, boostEnd: end, setBoostActive, safeRemoveItem: remove }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(setBoostActive).toHaveBeenCalledWith(false);
    expect(remove).toHaveBeenCalledWith("muse_boost");
    vi.useRealTimers();
  });

  it("leaves an unexpired boost alone", () => {
    vi.useFakeTimers();
    const setBoostActive = vi.fn();
    const end = Date.now() + 60000;
    renderHook(() => useBoostExpiry({ boostActive: true, boostEnd: end, setBoostActive, safeRemoveItem: vi.fn() }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(setBoostActive).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
