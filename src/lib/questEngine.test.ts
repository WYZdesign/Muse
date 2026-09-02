import { describe, it, expect } from "vitest";
import { seededHash, rotateQuests, ROTATION_LIMITS } from "./questEngine";

function makeQuest(id: string, tier: string) {
  return { id, quest_tier: tier, title: `${tier} ${id}` };
}

describe("seededHash", () => {
  it("is deterministic", () => {
    expect(seededHash("test")).toBe(seededHash("test"));
  });
  it("produces different hashes for different inputs", () => {
    expect(seededHash("a")).not.toBe(seededHash("b"));
  });
  it("returns unsigned 32-bit integer", () => {
    const h = seededHash("hello world");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xFFFFFFFF);
  });
});

describe("rotateQuests", () => {
  const fixedDate = new Date("2026-09-01T12:00:00Z");

  it("returns all quests when none exceed rotation limits", () => {
    const quests = [
      makeQuest("1", "daily"), makeQuest("2", "daily"),
      makeQuest("3", "weekly"), makeQuest("4", "weekly"),
    ];
    const result = rotateQuests(quests, fixedDate);
    expect(result).toHaveLength(4);
  });

  it("rotates daily quests down to 6", () => {
    const quests = Array.from({ length: 15 }, (_, i) => makeQuest(`d${i}`, "daily"));
    const result = rotateQuests(quests, fixedDate);
    const dailies = result.filter(q => q.quest_tier === "daily");
    expect(dailies).toHaveLength(6);
  });

  it("rotates weekly quests down to 8", () => {
    const quests = Array.from({ length: 20 }, (_, i) => makeQuest(`w${i}`, "weekly"));
    const result = rotateQuests(quests, fixedDate);
    const weeklies = result.filter(q => q.quest_tier === "weekly");
    expect(weeklies).toHaveLength(8);
  });

  it("rotates monthly quests down to 6", () => {
    const quests = Array.from({ length: 12 }, (_, i) => makeQuest(`m${i}`, "monthly"));
    const result = rotateQuests(quests, fixedDate);
    const monthlies = result.filter(q => q.quest_tier === "monthly");
    expect(monthlies).toHaveLength(6);
  });

  it("always includes starter/season/legendary quests (never rotated out)", () => {
    const quests = [
      ...Array.from({ length: 5 }, (_, i) => makeQuest(`s${i}`, "starter")),
      ...Array.from({ length: 5 }, (_, i) => makeQuest(`se${i}`, "season")),
      ...Array.from({ length: 5 }, (_, i) => makeQuest(`l${i}`, "legendary")),
    ];
    const result = rotateQuests(quests, fixedDate);
    expect(result).toHaveLength(15);
  });

  it("is deterministic for the same date", () => {
    const quests = Array.from({ length: 20 }, (_, i) => makeQuest(`d${i}`, "daily"));
    const a = rotateQuests(quests, new Date("2026-09-01T12:00:00Z"));
    const b = rotateQuests(quests, new Date("2026-09-01T12:00:00Z"));
    expect(a.map(q => q.id)).toEqual(b.map(q => q.id));
  });

  it("rotates to a different set when the date changes (daily rollover)", () => {
    const quests = Array.from({ length: 20 }, (_, i) => makeQuest(`d${i}`, "daily"));
    const day1 = rotateQuests(quests, new Date("2026-09-01T12:00:00Z"));
    const day2 = rotateQuests(quests, new Date("2026-09-02T12:00:00Z"));
    const ids1 = new Set(day1.map(q => q.id));
    const ids2 = new Set(day2.map(q => q.id));
    // With 20 quests and selecting 6, high probability of at least one different
    const same = [...ids1].filter(id => ids2.has(id)).length;
    expect(same).toBeLessThan(6);
  });

  it("preserves quest objects intact", () => {
    const quests = [makeQuest("1", "daily"), makeQuest("2", "starter")];
    const result = rotateQuests(quests, fixedDate);
    expect(result[0]).toEqual(makeQuest("1", "daily"));
    expect(result[1]).toEqual(makeQuest("2", "starter"));
  });

  it("handles mixed tiers correctly", () => {
    const quests = [
      ...Array.from({ length: 10 }, (_, i) => makeQuest(`d${i}`, "daily")),
      ...Array.from({ length: 10 }, (_, i) => makeQuest(`w${i}`, "weekly")),
      ...Array.from({ length: 10 }, (_, i) => makeQuest(`m${i}`, "monthly")),
      ...Array.from({ length: 5 }, (_, i) => makeQuest(`s${i}`, "starter")),
    ];
    const result = rotateQuests(quests, fixedDate);
    expect(result.filter(q => q.quest_tier === "daily")).toHaveLength(6);
    expect(result.filter(q => q.quest_tier === "weekly")).toHaveLength(8);
    expect(result.filter(q => q.quest_tier === "monthly")).toHaveLength(6);
    expect(result.filter(q => q.quest_tier === "starter")).toHaveLength(5);
    expect(result).toHaveLength(25);
  });
});
