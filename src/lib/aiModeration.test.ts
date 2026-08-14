import { describe, it, expect } from "vitest";
import { heuristicScreen, screenText } from "./aiModeration";

describe("heuristicScreen", () => {
  it("flags off-platform payment solicitation", () => {
    const r = heuristicScreen("send me $50 on cashapp for a shoot");
    expect(r.flagged).toBe(true);
    expect(r.categories).toContain("off_platform_payment");
  });

  it("flags minor risk language", () => {
    const r = heuristicScreen("are you 17? you look young");
    expect(r.flagged).toBe(true);
    expect(r.categories).toContain("minor_risk");
  });

  it("flags hate speech", () => {
    const r = heuristicScreen("you are a dumb whore");
    expect(r.flagged).toBe(true);
    expect(r.categories).toContain("hate_speech");
  });

  it("does not flag normal content", () => {
    const r = heuristicScreen("hey loved your work! would love to collaborate sometime");
    expect(r.flagged).toBe(false);
    expect(r.categories).toEqual([]);
  });
});

describe("screenText", () => {
  it("blocks critical categories", () => {
    expect(screenText("meet me at my apartment tonight").block).toBe(true);
    expect(screenText("are you under 18?").block).toBe(true);
  });

  it("does not block normal content", () => {
    expect(screenText("great portfolio, let's shoot together").block).toBe(false);
  });
});
