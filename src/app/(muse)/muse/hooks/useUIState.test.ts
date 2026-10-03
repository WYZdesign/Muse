// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUIState } from "./useUIState";

describe("useUIState", () => {
  it("exposes sensible initial state", () => {
    const { result } = renderHook(() => useUIState());
    expect(result.current.toastMsg).toBeNull();
    expect(result.current.searchQuery).toBe("");
    expect(result.current.searchOpen).toBe(false);
    expect(result.current.showStory).toBeNull();
    expect(result.current.realtimeStatus).toBe("connecting");
    expect(typeof result.current.shuffleSeed).toBe("number");
    expect(result.current.dragValues).toEqual({ x: 0, y: 0, opacity: 0 });
  });

  it("updates state through its setters", () => {
    const { result } = renderHook(() => useUIState());
    act(() => result.current.setSearchQuery("portrait"));
    act(() => result.current.setRealtimeStatus("connected"));
    act(() => result.current.setShowStory(2));
    expect(result.current.searchQuery).toBe("portrait");
    expect(result.current.realtimeStatus).toBe("connected");
    expect(result.current.showStory).toBe(2);
  });

  it("exposes stable refs", () => {
    const { result } = renderHook(() => useUIState());
    expect(result.current.typingTimerRef.current).toBeNull();
    expect(result.current.dragRef.current.active).toBe(false);
    expect(result.current.dragRef.current.axis).toBeNull();
  });

  it("keeps shuffleSeed stable across re-renders", () => {
    const { result, rerender } = renderHook(() => useUIState());
    const seed = result.current.shuffleSeed;
    rerender();
    expect(result.current.shuffleSeed).toBe(seed);
  });
});
