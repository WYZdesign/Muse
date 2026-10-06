// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuthOnboardingState } from "./useAuthOnboardingState";

describe("useAuthOnboardingState", () => {
  it("has documented auth + onboarding defaults", () => {
    const { result } = renderHook(() => useAuthOnboardingState());
    expect(result.current.authMode).toBe("login");
    expect(result.current.authEmail).toBe("");
    expect(result.current.authLoading).toBe(false);
    expect(result.current.formErrors).toEqual({});
    expect(result.current.authRemember).toBe(true);
    expect(result.current.obStep).toBe(0);
    expect(result.current.obData).toEqual({});
    expect(result.current.testScreen).toBeNull();
    expect(result.current.testLevels).toEqual({ zodiac: 1, mbti: 1, chinese: 1, lifePath: 1 });
    expect(result.current.obProfilePic).toBeNull();
    expect(result.current.obPortfolioItems).toEqual([]);
  });

  it("changes auth mode and onboarding step", () => {
    const { result } = renderHook(() => useAuthOnboardingState());
    act(() => result.current.setAuthMode("signup"));
    act(() => result.current.setObStep(3));
    expect(result.current.authMode).toBe("signup");
    expect(result.current.obStep).toBe(3);
  });

  it("setAuthRemember persists the remember flag", () => {
    const { result } = renderHook(() => useAuthOnboardingState());
    act(() => result.current.setAuthRemember(false));
    expect(result.current.authRemember).toBe(false);
    expect(localStorage.getItem("muse_remember")).toBe("0");
  });
});
