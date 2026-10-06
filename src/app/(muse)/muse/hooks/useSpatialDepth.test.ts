// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { attachSpatialDepth } from "./useSpatialDepth";

describe("useSpatialDepth (module engine)", () => {
  it("returns a cleanup function and safely no-ops when nothing matches", () => {
    const cleanup = attachSpatialDepth(".no-such-card", "img");
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
  });
});
