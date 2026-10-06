import { describe, it, expect } from "vitest";
import { FD_STUDIO, OTHER_STUDIOS, ALL_STUDIOS } from "./studios";

describe("studios registry", () => {
  it("has FD + the other LA studios with valid shapes", () => {
    expect(FD_STUDIO.id).toBe("fd");
    expect(FD_STUDIO.name).toBeTruthy();
    expect(Array.isArray(FD_STUDIO.buildings)).toBe(true);
    expect(FD_STUDIO.buildings.length).toBeGreaterThan(0);
    expect(ALL_STUDIOS.length).toBe(1 + OTHER_STUDIOS.length);
    for (const profile of ALL_STUDIOS) {
      expect(typeof profile.name).toBe("string");
      expect(Array.isArray(profile.buildings)).toBe(true);
      for (const b of profile.buildings) {
        expect(typeof b.label).toBe("string");
        expect(Array.isArray(b.studios)).toBe(true);
      }
    }
  });
});
