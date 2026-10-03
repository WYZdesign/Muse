// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUserState } from "./useUserState";

describe("useUserState", () => {
  it("seeds the published demo persona in demo mode", () => {
    const { result } = renderHook(() => useUserState());
    expect(result.current.currentUser.name).toBe("Alex Rivera");
    expect(result.current.currentUser.tier).toBe("pro");
    expect(result.current.authUser).toBeNull();
    expect(result.current.userTier).toBe("free");
    expect(result.current.hydrated).toBe(false);
    expect(result.current.notifPrefs).toEqual({ match: true, message: true, brief: true, like: true });
    expect(result.current.excludedPortfolios).toEqual([]);
    expect(result.current.portfolioAccess).toEqual({});
  });

  it("opens a viewed profile without a network call for a non-uuid id", () => {
    const { result } = renderHook(() => useUserState());
    act(() => result.current.setViewProfile({ id: "local-1", name: "Sam" }));
    expect(result.current.viewProfile.name).toBe("Sam");
    expect(result.current.viewProfilePhotoIdx).toBe(0);
  });

  it("tracks portfolio access + excluded portfolios", () => {
    const { result } = renderHook(() => useUserState());
    act(() => result.current.setExcludedPortfolios((p) => [...p, "p1"]));
    act(() => result.current.setPortfolioAccess((p) => ({ ...p, p2: "private" })));
    expect(result.current.excludedPortfolios).toEqual(["p1"]);
    expect(result.current.portfolioAccess.p2).toBe("private");
  });

  it("exposes stable refs", () => {
    const { result } = renderHook(() => useUserState());
    expect(typeof result.current.shuffleSeedRef.current).toBe("number");
    expect(result.current.photoInputRef.current).toBeNull();
    expect(result.current.lightboxPhotos.current).toEqual([]);
  });
});
