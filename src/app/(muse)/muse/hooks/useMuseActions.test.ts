// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useMuseActions } from "./useMuseActions";

afterEach(() => cleanup());

function args(over: Record<string, unknown> = {}) {
  return {
    apiFetch: vi.fn(async () => new Response("{}", { status: 200 })),
    safeGetItem: () => null,
    safeSetItem: () => true,
    showToast: vi.fn(),
    showDailyLogin: false, showAgeVerification: false, showAgeGate: false, showQuests: false, showStories: false, showHamburger: false,
    setClaimableQuests: vi.fn(), setNearQuests: vi.fn(), setTopQuests: vi.fn(), setLoginStreak: vi.fn(),
    obData: {}, setObData: vi.fn(), obConnectedSocials: {}, setObConnectedSocials: vi.fn(),
    authUser: { id: "u1", profile: { id: "p1" } },
    setViewProfileRaw: vi.fn(), setScreen: vi.fn(), screenHistoryRef: { current: [] }, setScreenFlash: vi.fn(),
    setHamburgerScreen: vi.fn(), setShowHamburger: vi.fn(), setVerificationBannerDismissed: vi.fn(), setUpsell: vi.fn(),
    ...over,
  };
}

describe("useMuseActions", () => {
  it("exposes the action handlers", () => {
    const { result } = renderHook(() => useMuseActions(args() as never));
    for (const k of ["setViewProfile", "handleImgError", "trackQuest", "maybeShowPageTour", "flash", "showScreen", "goBack", "openHamburger"]) {
      expect(typeof (result.current as Record<string, unknown>)[k], k).toBe("function");
    }
  });

  it("setViewProfile forwards to the raw setter and tracks a real uuid view", () => {
    const a = args();
    const { result } = renderHook(() => useMuseActions(a as never));
    act(() => result.current.setViewProfile({ id: "11111111-1111-1111-1111-111111111111" } as never));
    expect(a.setViewProfileRaw).toHaveBeenCalled();
    expect(a.apiFetch).toHaveBeenCalledWith("/api/muse", expect.objectContaining({ method: "POST" }));
  });

  it("maybeShowPageTour activates the tour on first call", () => {
    const { result } = renderHook(() => useMuseActions(args() as never));
    act(() => result.current.maybeShowPageTour("discover" as never));
    expect(result.current.activePageTour).toBe("discover");
  });
});
