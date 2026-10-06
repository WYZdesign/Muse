import { describe, it, expect } from "vitest";
import { CODEX_ZODIAC, CODEX_CHINESE, CODEX_MBTI } from "./codexData";

describe("codexData", () => {
  it("has the full zodiac + chinese sets with required fields", () => {
    expect(CODEX_ZODIAC).toHaveLength(12);
    for (const z of CODEX_ZODIAC) {
      expect(z.name).toBeTruthy();
      expect(z.icon).toBeTruthy();
      expect(z.tag).toBeTruthy();
      expect(z.long.length).toBeGreaterThan(20);
    }
    expect(CODEX_CHINESE).toHaveLength(12);
  });

  it("has a non-empty MBTI set with codes", () => {
    expect(CODEX_MBTI.length).toBeGreaterThanOrEqual(16);
    for (const m of CODEX_MBTI) expect(m.code).toMatch(/^[EI][NS][TF][JP]$/);
  });
});
