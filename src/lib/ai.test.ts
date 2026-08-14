import { describe, it, expect } from "vitest";
import { cosineSimilarity, aiModels } from "./ai";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("returns 0 for empty or mismatched-length vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [])).toBe(0);
  });

  it("returns 0 when a vector is all zeros", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it("returns a value in [-1, 1] for arbitrary vectors", () => {
    const a = [1, 2, 3, 4];
    const b = [4, 3, 2, 1];
    const s = cosineSimilarity(a, b);
    expect(s).toBeGreaterThanOrEqual(-1);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe("aiModels", () => {
  it("returns default model ids", () => {
    const m = aiModels();
    expect(m.embed).toContain("text-embedding");
    expect(m.chat).toContain("gemini");
  });
});
