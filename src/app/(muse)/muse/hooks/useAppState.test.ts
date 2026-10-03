// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppState } from "./useAppState";

describe("useAppState", () => {
  it("has documented defaults (screen auth, theme lasunset, community tab)", () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.screen).toBe("auth");
    expect(result.current.theme).toBe("lasunset");
    expect(result.current.bootstrapped).toBe(false);
    expect(result.current.connTab).toBe("community");
    expect(result.current.matchesView).toBe("list");
    expect(result.current.realtimeStatus).toBe("connecting");
    expect(result.current.discoveryPrefs).toEqual({ ageMin: 18, ageMax: 50, distance: 50, gender: "all" });
    expect(result.current.myGeo).toBeNull();
  });

  it("composes the modal-visibility flags", () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.showFilterModal).toBe(false);
    expect(result.current.showHamburger).toBe(false);
    act(() => result.current.setShowFilterModal(true));
    expect(result.current.showFilterModal).toBe(true);
  });

  it("navigates screens and changes theme/tab", () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.setScreen("discover"));
    act(() => result.current.setTheme("nebula"));
    act(() => result.current.setConnTab("events"));
    expect(result.current.screen).toBe("discover");
    expect(result.current.theme).toBe("nebula");
    expect(result.current.connTab).toBe("events");
  });

  it("exposes working refs", () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.dragRef.current.active).toBe(false);
    expect(result.current.rafRef.current).toBe(0);
    expect(result.current.matchSwipeRef.current.id).toBe("");
  });
});
