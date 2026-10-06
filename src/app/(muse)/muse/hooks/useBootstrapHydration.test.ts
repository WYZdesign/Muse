// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useBootstrapHydration } from "./useBootstrapHydration";

afterEach(() => cleanup());

// loadStateRef.current = true makes the mount effect early-return, so this is a
// pure initialization test (no network/session hydration path).
function args() {
  return {
    loadStateRef: { current: true },
    sessionAppliedRef: { current: false },
    syncingSdkSessionRef: { current: false },
    loadState: vi.fn(), initAnalyticsSession: vi.fn(), getGeolocation: vi.fn(),
    safeSetItem: () => true, safeGetItem: () => null, safeRemoveItem: vi.fn(), showToast: vi.fn(),
    apiFetch: vi.fn(), setObData: vi.fn(), supabase: {}, applySession: vi.fn(), getRefreshToken: () => "",
    bootstrapData: vi.fn(), setDiscoverLoading: vi.fn(), setRefreshToken: vi.fn(),
  };
}

describe("useBootstrapHydration", () => {
  it("starts not hydrated with no geo", () => {
    const { result } = renderHook(() => useBootstrapHydration(args() as never));
    expect(result.current.hydrated).toBe(false);
    expect(result.current.myGeo).toBeNull();
  });
});
