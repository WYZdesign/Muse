import { describe, it, expect } from "vitest";
import { makeConfettiPieces } from "./confetti";

const PALETTE = ["var(--gold)", "var(--amber)", "var(--pink)", "var(--lavender)", "var(--coral)", "var(--mint)", "#fff"];

describe("makeConfettiPieces", () => {
  it("returns 40 pieces", () => {
    expect(makeConfettiPieces()).toHaveLength(40);
  });

  it("emits CSS-valid values with a bounded position", () => {
    for (const p of makeConfettiPieces()) {
      expect(p.left).toMatch(/%$/);
      const leftPct = parseFloat(p.left);
      expect(leftPct).toBeGreaterThanOrEqual(0);
      expect(leftPct).toBeLessThanOrEqual(100);
      expect(p.width).toMatch(/px$/);
      expect(p.height).toMatch(/px$/);
      expect(p.animationDuration).toMatch(/s$/);
      expect(p.animationDelay).toMatch(/s$/);
      expect(p["--drift"]).toMatch(/px$/);
      expect(p["--rot"]).toMatch(/deg$/);
    }
  });

  it("cycles the palette deterministically by index", () => {
    const pieces = makeConfettiPieces();
    pieces.forEach((p, i) => expect(p.background).toBe(PALETTE[i % 7]));
  });
});
