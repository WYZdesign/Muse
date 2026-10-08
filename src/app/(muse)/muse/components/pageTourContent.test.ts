import { describe, it, expect } from "vitest";
import {
  ALL_TOUR_IDS,
  SCREEN_TRIGGERED_TOUR_IDS,
  PAGE_TOURS,
  tourSeenKey,
} from "./pageTourContent";

/**
 * The tour catalogue is a shared contract: the app reads PAGE_TOURS to render a
 * screen's first-visit tutorial, and tests/helpers/test-helpers.ts seeds the
 * matching `muse_tour_seen_*` flags so overlays never intercept a UI assertion.
 * If an id is added or renamed on one side only, both silently drift apart, so
 * this pins the shape (ids, key format, content completeness).
 */
describe("pageTourContent", () => {
  it("exposes 11 unique tour ids, with forum as the only non-screen-triggered one", () => {
    expect(ALL_TOUR_IDS).toHaveLength(11);
    expect(new Set(ALL_TOUR_IDS).size).toBe(ALL_TOUR_IDS.length);
    expect(ALL_TOUR_IDS).toContain("forum");
    expect(SCREEN_TRIGGERED_TOUR_IDS).not.toContain("forum");
    expect(ALL_TOUR_IDS).toEqual([...SCREEN_TRIGGERED_TOUR_IDS, "forum"]);
  });

  it("keys seen-flags exactly as the e2e helper seeds them", () => {
    for (const id of ALL_TOUR_IDS) {
      expect(tourSeenKey(id)).toBe(`muse_tour_seen_${id}`);
    }
  });

  it("has complete, renderable content for every id", () => {
    for (const id of ALL_TOUR_IDS) {
      const tour = PAGE_TOURS[id];
      expect(tour, `PAGE_TOURS.${id} should exist`).toBeTruthy();
      expect(tour.ariaLabel.length).toBeGreaterThan(0);
      expect(tour.from).toMatch(/^#[0-9a-fA-F]{3,6}$/);
      expect(tour.to).toMatch(/^#[0-9a-fA-F]{3,6}$/);
      expect([1, 2, 3]).toContain(tour.orbitCount);
      expect([ "solid", "dashed" ]).toContain(tour.ringStyle);
      expect(Array.isArray(tour.slides)).toBe(true);
      expect(tour.slides.length).toBeGreaterThan(0);
    }
  });

  it("has no content defined for an id outside the catalogue", () => {
    expect(Object.keys(PAGE_TOURS).sort()).toEqual([...ALL_TOUR_IDS].sort());
  });
});
