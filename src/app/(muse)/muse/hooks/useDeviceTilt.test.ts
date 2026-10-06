// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { getDeviceTilt, ensureDeviceTiltActive, requestMotionPermission } from "./useDeviceTilt";

describe("useDeviceTilt (module engine)", () => {
  it("reports zero tilt before any orientation event", () => {
    expect(getDeviceTilt()).toEqual({ x: 0, y: 0 });
  });

  it("ensureDeviceTiltActive and requestMotionPermission do not throw", () => {
    expect(() => ensureDeviceTiltActive()).not.toThrow();
    expect(() => requestMotionPermission()).not.toThrow();
  });
});
