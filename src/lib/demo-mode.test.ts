import { afterEach, describe, expect, it, vi } from "vitest";
import { demoModeUnavailable, isDemoMode } from "./demo-mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("demo mode safety boundary", () => {
  it("defaults to enabled when neither flag is configured", () => {
    vi.stubEnv("MUSE_DEMO_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");

    expect(isDemoMode()).toBe(true);
  });

  it("honors an explicit server-side enablement", () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");

    expect(isDemoMode()).toBe(true);
  });

  it("requires an explicit server-side disablement before real mode", () => {
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

    expect(isDemoMode()).toBe(false);
  });

  it("uses the public flag only when the server flag is unset", () => {
    vi.stubEnv("MUSE_DEMO_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");

    expect(isDemoMode()).toBe(false);
  });

  it("returns a stable client-safe unavailable response", () => {
    expect(demoModeUnavailable("Payments")).toEqual({
      error: "Payments is unavailable in demo mode",
      code: "DEMO_MODE",
    });
  });
});
