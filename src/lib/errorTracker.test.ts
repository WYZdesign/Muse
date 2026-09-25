import { afterEach, describe, expect, it, vi } from "vitest";
import { trackError } from "@/lib/errorTracker";

describe("trackError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the error context without throwing when window is unavailable", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => trackError("unit_error", { a: 1 })).not.toThrow();
    expect(spy).toHaveBeenCalledWith("[muse:error]", "unit_error", { a: 1 }, expect.any(String));
  });

  it("accepts a missing params object", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => trackError("unit_error_bare")).not.toThrow();
    expect(spy).toHaveBeenCalledWith("[muse:error]", "unit_error_bare", "", expect.any(String));
  });
});
