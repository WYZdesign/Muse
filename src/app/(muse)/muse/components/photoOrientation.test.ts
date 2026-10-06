import { describe, it, expect } from "vitest";
import { PORTRAIT_IMG } from "./photoOrientation";

describe("PORTRAIT_IMG", () => {
  it("maps image urls to booleans", () => {
    const entries = Object.entries(PORTRAIT_IMG);
    expect(entries.length).toBeGreaterThan(100);
    for (const [k, v] of entries) {
      expect(k.startsWith("/")).toBe(true);
      expect(typeof v).toBe("boolean");
    }
  });
});
