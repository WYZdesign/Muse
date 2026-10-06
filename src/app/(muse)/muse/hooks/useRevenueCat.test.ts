// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));
vi.mock("@revenuecat/purchases-capacitor", () => ({ Purchases: {}, LOG_LEVEL: { DEBUG: 0, INFO: 1 } }));

import { renderHook } from "@testing-library/react";
import { useRevenueCat, syncRevenueCatUser, logoutRevenueCat } from "./useRevenueCat";

describe("useRevenueCat", () => {
  it("is a no-op on web (no native purchases) and clears loading", () => {
    const { result } = renderHook(() => useRevenueCat());
    expect(result.current.loading).toBe(false);
    expect(result.current.customerInfo).toBeNull();
    expect(result.current.offerings).toBeNull();
    expect(result.current.isPro).toBe(false);
    expect(result.current.entitlements).toEqual({ pro: false, founding: false, earlyMember: false });
  });

  it("sync/login/logout are safe no-ops off-native", async () => {
    await expect(syncRevenueCatUser("u1")).resolves.toBeUndefined();
    await expect(logoutRevenueCat()).resolves.toBeUndefined();
  });
});
