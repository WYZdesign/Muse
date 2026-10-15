import { describe, expect, it } from "vitest";
import { getIcebreaker, getReferralTier, checkProfileBadges, sanitizeInput, advancedFilterInput } from "./page-helpers";
import { ICEBREAKERS } from "./components/types";

describe("page-helpers (extracted from page.tsx)", () => {
  describe("getIcebreaker", () => {
    it("is deterministic for the same seed", () => {
      expect(getIcebreaker("Photographer", "seed-1")).toBe(getIcebreaker("Photographer", "seed-1"));
    });

    it("falls back to the default pool for an unknown type", () => {
      const value = getIcebreaker("NotARealType", "x");
      expect(ICEBREAKERS.default).toContain(value);
    });

    it("returns a member of the requested pool", () => {
      const value = getIcebreaker("Photographer", "abc");
      expect(ICEBREAKERS.Photographer).toContain(value);
    });
  });

  describe("getReferralTier", () => {
    it("maps thresholds to the right tier", () => {
      expect(getReferralTier(0).tier).toBe("None");
      expect(getReferralTier(1).tier).toBe("Bronze");
      expect(getReferralTier(5).tier).toBe("Silver");
      expect(getReferralTier(20).tier).toBe("Gold");
      expect(getReferralTier(50).tier).toBe("Platinum");
    });

    it("reports the next threshold, null at the top tier", () => {
      expect(getReferralTier(0).nextThreshold).toBe(1);
      expect(getReferralTier(1).nextThreshold).toBe(5);
      expect(getReferralTier(50).nextThreshold).toBeNull();
    });
  });

  describe("checkProfileBadges", () => {
    const YEAR = 31536000000;

    it("awards Full Moon after a year", () => {
      const names = checkProfileBadges({}, Date.now() - YEAR - 1000).map(b => b.name);
      expect(names).toContain("Full Moon");
    });

    it("awards one bookings badge, preferring the higher tier", () => {
      const high = checkProfileBadges({ bookingsCompleted: 50 }, Date.now()).map(b => b.name);
      expect(high).toContain("Golden Hour");
      expect(high).not.toContain("Collab King");

      const mid = checkProfileBadges({ bookingsCompleted: 10 }, Date.now()).map(b => b.name);
      expect(mid).toContain("Collab King");
    });

    it("awards matches and messages badges at their thresholds", () => {
      const names = checkProfileBadges({ matchesReceived: 100, messagesSent: 500 }, Date.now()).map(b => b.name);
      expect(names).toContain("Rising Star");
      expect(names).toContain("Social Butterfly");
    });

    it("returns nothing for a brand-new low-activity profile", () => {
      expect(checkProfileBadges({}, Date.now())).toEqual([]);
    });
  });

  describe("sanitizeInput", () => {
    it("strips angle brackets", () => {
      expect(sanitizeInput("<script>alert(1)</script>")).toBe("scriptalert(1)/script");
    });

    it("caps length at 500", () => {
      expect(sanitizeInput("a".repeat(900)).length).toBe(500);
    });
  });

  describe("advancedFilterInput", () => {
    it("passes the values through for a paying tier", () => {
      expect(advancedFilterInput("muse_pro", ["Editorial"], 80, 25)).toEqual({
        filterStyles: ["Editorial"], filterScore: 80, maxDistanceMi: 25,
      });
    });

    it("returns the unlocked defaults for a free account", () => {
      expect(advancedFilterInput("free", ["Editorial"], 80, 25)).toEqual({
        filterStyles: [], filterScore: 50, maxDistanceMi: undefined,
      });
    });

    it("treats every paid tier and unknown/nullish tiers predictably", () => {
      expect(advancedFilterInput("pro", [], 60, 10).maxDistanceMi).toBe(10);
      expect(advancedFilterInput("muse_studio", [], 60, 10).maxDistanceMi).toBe(10);
      expect(advancedFilterInput("", [], 60, 10).maxDistanceMi).toBeUndefined();
      expect(advancedFilterInput("gold", [], 60, 10).maxDistanceMi).toBeUndefined();
    });
  });
});
