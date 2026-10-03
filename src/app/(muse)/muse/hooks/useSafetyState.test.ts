// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSafetyState } from "./useSafetyState";

describe("useSafetyState", () => {
  it("has safe defaults (unverified, banner visible)", () => {
    const { result } = renderHook(() => useSafetyState());
    expect(result.current.ageVerified).toBe(false);
    expect(result.current.verificationExpiringSoon).toBe(false);
    expect(result.current.verificationBannerDismissed).toBe(false);
    expect(result.current.verificationBannerClosing).toBe(false);
    expect(result.current.disclosureTarget).toBeNull();
  });

  it("animates (closing) then dismisses the verification banner", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSafetyState());
    act(() => result.current.dismissVerificationBanner());
    expect(result.current.verificationBannerClosing).toBe(true);
    expect(result.current.verificationBannerDismissed).toBe(false);
    act(() => { vi.advanceTimersByTime(320); });
    expect(result.current.verificationBannerDismissed).toBe(true);
    expect(result.current.verificationBannerClosing).toBe(false);
    vi.useRealTimers();
  });

  it("tracks a disclosure target and pending confirm", () => {
    const { result } = renderHook(() => useSafetyState());
    act(() => result.current.setDisclosureTarget({ id: "u1", name: "Ada" }));
    act(() => result.current.setPendingDisclosureConfirm("yes"));
    expect(result.current.disclosureTarget?.name).toBe("Ada");
    expect(result.current.pendingDisclosureConfirm).toBe("yes");
  });
});
