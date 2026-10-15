import { describe, expect, it } from "vitest";
import { buildFilteredProfiles } from "./discover-deck";
import type { DiscoveryProfile, DiscoverDeckInput } from "./discover-deck";

/**
 * Behaviour tests for the extracted Discover deck builder. The static demo deck
 * (inside PROFILES) never carries the sentinel style below, so the style filter
 * isolates the test fixtures regardless of DEMO_MODE.
 */

const SENTINEL = "ZzzTestOnly";

function p(over: Record<string, unknown>): DiscoveryProfile {
  return {
    id: over.id, name: over.name || "Test", img: "", type: "photographer",
    bio: "", loc: over.loc || "Testville", styles: over.styles || [SENTINEL],
    score: over.score ?? 70, nsfw: !!over.nsfw, looking: [], zodiac: "", chinese: "",
    mbti: "", lifePath: "", photos: [], collabs: 0, verified: false, side: "creative",
    ...over,
  } as unknown as DiscoveryProfile;
}

function build(liveProfiles: DiscoveryProfile[], over: Partial<DiscoverDeckInput> = {}) {
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
    expect(out.map((x) => x.id)).toEqual(["a"]);
  });

  it("keeps NSFW profiles when showNsfw is on", () => {
    const out = build([p({ id: "a" }), p({ id: "b", nsfw: true })], { showNsfw: true });
    expect(out.map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("filters by search across name/type/loc/styles", () => {
    const out = build([
      p({ id: "a", name: "Zebraphoto" }),
      p({ id: "b", name: "Other" }),
    ], { discoverSearch: "zebraphoto" });
    expect(out.map((x) => x.id)).toEqual(["a"]);
  });

  it("filters by minimum score above the 50 threshold", () => {
    const out = build([
      p({ id: "a", score: 90 }),
      p({ id: "b", score: 40 }),
    ], { filterScore: 60 });
    expect(out.map((x) => x.id)).toEqual(["a"]);
  });

  it("enriches each profile with a live match score and reasons", () => {
    const out = build([p({ id: "a", score: 10 })]);
    expect(out[0].id).toBe("a");
    expect(typeof out[0].score).toBe("number");
    expect(Array.isArray(out[0].matchReasons)).toBe(true);
  });

  // Max Distance is a Musa Pro filter and used to render a value without ever
  // removing anyone. LA to NY is roughly 2450 miles, so a 100 mile ceiling must
  // drop it while keeping the Los Angeles row.
  const MY_GEO = { lat: 34.05, long: -118.24 };

  it("drops profiles beyond the Max Distance ceiling when one is set", () => {
    const out = build([
      p({ id: "near", loc: "Los Angeles, CA" }),
      p({ id: "far", loc: "New York, NY" }),
    ], { myGeo: MY_GEO, maxDistanceMi: 100 });
    expect(out.map((x) => x.id)).toEqual(["near"]);
  });

  it("keeps profiles whose distance cannot be computed", () => {
    const out = build([
      p({ id: "near", loc: "Los Angeles, CA" }),
      p({ id: "unknown", loc: "Testville" }),
    ], { myGeo: MY_GEO, maxDistanceMi: 100 });
    expect(out.map((x) => x.id).sort()).toEqual(["near", "unknown"]);
  });

  it("keeps a profile that opted out of showing its distance", () => {
    const out = build([
      p({ id: "hidden", loc: "New York, NY", showDistance: false }),
    ], { myGeo: MY_GEO, maxDistanceMi: 100 });
    expect(out.map((x) => x.id)).toEqual(["hidden"]);
  });

  it("applies no ceiling at all when maxDistanceMi is omitted", () => {
    const out = build([
      p({ id: "near", loc: "Los Angeles, CA" }),
      p({ id: "far", loc: "New York, NY" }),
    ], { myGeo: MY_GEO });
    expect(out.map((x) => x.id).sort()).toEqual(["far", "near"]);
  });
});
