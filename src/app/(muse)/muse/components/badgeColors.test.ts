import { describe, it, expect } from "vitest";
import { BADGE_COLORS } from "./badgeColors";

describe("BADGE_COLORS", () => {
  it("exposes the documented palette families with bg/bd/c", () => {
    for (const k of ["gold", "blue", "lavender", "green", "red"]) {
      expect(BADGE_COLORS[k as keyof typeof BADGE_COLORS], k).toBeDefined();
      const v = BADGE_COLORS[k as keyof typeof BADGE_COLORS];
      expect(typeof v.bg).toBe("string");
      expect(typeof v.bd).toBe("string");
      expect(typeof v.c).toBe("string");
    }
  });
});
