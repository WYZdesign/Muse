// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePageTour } from "./usePageTour";
import { SCREEN_TRIGGERED_TOUR_IDS } from "../components/pageTourContent";

const AUTH = { id: "u1" };

describe("usePageTour", () => {
  it("fires the tour after 600ms on a triggered screen once bootstrapped + authed", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    renderHook(() => usePageTour({ screen: SCREEN_TRIGGERED_TOUR_IDS[0], bootstrapped: true, authUser: AUTH, maybeShowPageTour: fn }));
    expect(fn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(600); });
    expect(fn).toHaveBeenCalledWith(SCREEN_TRIGGERED_TOUR_IDS[0]);
    vi.useRealTimers();
  });

  it("does nothing before bootstrap or when signed out", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    renderHook(() => usePageTour({ screen: SCREEN_TRIGGERED_TOUR_IDS[0], bootstrapped: false, authUser: null, maybeShowPageTour: fn }));
    renderHook(() => usePageTour({ screen: SCREEN_TRIGGERED_TOUR_IDS[0], bootstrapped: true, authUser: null, maybeShowPageTour: fn }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("does nothing for a screen without a triggered tour", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    renderHook(() => usePageTour({ screen: "definitely-not-a-tour-screen", bootstrapped: true, authUser: AUTH, maybeShowPageTour: fn }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
