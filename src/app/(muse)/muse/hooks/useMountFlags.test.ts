// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMountFlags } from "./useMountFlags";

describe("useMountFlags", () => {
  it("restores a persisted banner dismissal", () => {
    const get = (k: string) => (k === "muse_verify_banner_dismissed" ? "1" : null);
    const { result } = renderHook(() => useMountFlags({ safeGetItem: get, safeSetItem: () => true }));
    expect(result.current.verificationBannerDismissed).toBe(true);
  });

  it("leaves the banner visible when no dismissal is stored", () => {
    const { result } = renderHook(() => useMountFlags({ safeGetItem: () => null, safeSetItem: () => true }));
    expect(result.current.verificationBannerDismissed).toBe(false);
  });

  it("increments the persisted open counter", () => {
    const set = vi.fn(() => true);
    renderHook(() => useMountFlags({ safeGetItem: () => "4", safeSetItem: set }));
    expect(set).toHaveBeenCalledWith("muse_open_count", "5");
  });

  it("starts the open counter at 1 on a fresh install", () => {
    const set = vi.fn(() => true);
    renderHook(() => useMountFlags({ safeGetItem: () => null, safeSetItem: set }));
    expect(set).toHaveBeenCalledWith("muse_open_count", "1");
  });
});
