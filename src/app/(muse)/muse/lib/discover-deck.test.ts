import { describe, expect, it } from "vitest";
import { buildFilteredProfiles } from "./discover-deck";

/**
 * Behaviour tests for the extracted Discover deck builder. The static demo deck
 * (inside PROFILES) never carries the sentinel style below, so the style filter
 * isolates the test fixtures regardless of DEMO_MODE.
 */

const SENTINEL = "ZzzTestOnly";

function p(over: Record<string, any>) {
  return {
    id: over.id, name: over.name || "Test", img: "", type: "photographer",
    bio: "", loc: over.loc || "Testville", styles: over.styles || [SENTINEL],
    score: over.score ?? 70, nsfw: !!over.nsfw, looking: [], zodiac: "", chinese: "",
    mbti: "", lifePath: "", photos: [], collabs: 0, verified: false, side: "creative",
    ...over,
  };
}

function build(liveProfiles: any[], over: Record<string, any> = {}) {
  return buildFilteredProfiles({
    seed: 12345,
    liveProfiles,
    showNsfw: false,
    filterStyles: [SENTINEL],
    filterScore: 0,
    myGeo: null,
    discoverSearch: "",
    obData: { type: "photographer", styles: [SENTINEL], looking: [] },
    ...over,
  });
}

describe("buildFilteredProfiles", () => {
  it("drops NSFW profiles when showNsfw is off", () => {
    const out = build([p({ id: "a" }), p({ id: "b", nsfw: true })]);
    expect(out.map((x: any) => x.id)).toEqual(["a"]);
  });

  it("keeps NSFW profiles when showNsfw is on", () => {
    const out = build([p({ id: "a" }), p({ id: "b", nsfw: true })], { showNsfw: true });
    expect(out.map((x: any) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("filters by search across name/type/loc/styles", () => {
    const out = build([
      p({ id: "a", name: "Zebraphoto" }),
      p({ id: "b", name: "Other" }),
    ], { discoverSearch: "zebraphoto" });
    expect(out.map((x: any) => x.id)).toEqual(["a"]);
  });

  it("filters by minimum score above the 50 threshold", () => {
    const out = build([
      p({ id: "a", score: 90 }),
      p({ id: "b", score: 40 }),
    ], { filterScore: 60 });
    expect(out.map((x: any) => x.id)).toEqual(["a"]);
  });

  it("enriches each profile with a live match score and reasons", () => {
    const out = build([p({ id: "a", score: 10 })]);
    expect(out[0].id).toBe("a");
    expect(typeof out[0].score).toBe("number");
    expect(Array.isArray(out[0].matchReasons)).toBe(true);
  });
});
