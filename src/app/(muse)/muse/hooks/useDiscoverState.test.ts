// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDiscoverState } from "./useDiscoverState";

describe("useDiscoverState", () => {
  it("has documented swipe/limit defaults", () => {
    const { result } = renderHook(() => useDiscoverState());
    expect(result.current.currentIdx).toBe(0);
    expect(result.current.dailyLikes).toBe(10);
    expect(result.current.superLikes).toBe(3);
    expect(result.current.discoverLoading).toBe(true);
    expect(result.current.filterScore).toBe(50);
    expect(result.current.filterStyles).toEqual([]);
    expect(result.current.rewindStack).toEqual([]);
    expect(result.current.swipeDir).toBeNull();
    expect(result.current.boostActive).toBe(false);
  });

  it("handles like decrement, rewind stack growth and boost", () => {
    const { result } = renderHook(() => useDiscoverState());
    act(() => result.current.setDailyLikes((p) => p - 1));
    act(() => result.current.setCurrentIdx((p) => p + 1));
    act(() => result.current.setRewindStack((p) => [...p, 2]));
    act(() => { result.current.setBoostActive(true); result.current.setBoostEnd(12345); });
    expect(result.current.dailyLikes).toBe(9);
    expect(result.current.currentIdx).toBe(1);
    expect(result.current.rewindStack).toEqual([2]);
    expect(result.current.boostActive).toBe(true);
    expect(result.current.boostEnd).toBe(12345);
  });

  it("toggles discover search and filters", () => {
    const { result } = renderHook(() => useDiscoverState());
    act(() => result.current.setDiscoverSearchOpen(true));
    act(() => result.current.setFilterStyles(["portrait"]));
    act(() => result.current.setFilterScore(80));
    expect(result.current.discoverSearchOpen).toBe(true);
    expect(result.current.filterStyles).toEqual(["portrait"]);
    expect(result.current.filterScore).toBe(80);
  });
});
