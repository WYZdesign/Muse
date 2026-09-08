import { describe, it, expect } from "vitest";
import { sessionTier, SESSION_TIERS } from "./sessionTiers";

// sessionTier drives the "Rising Muse / Top Rated / Muse Elite" badges shown
// on SessionsScreen.tsx cards (audit finding taskrabbit-p2-2). Locking in
// the exact thresholds and the "only the highest tier, never a badge below
// Rising Muse" behavior so a future threshold tweak can't silently regress
// either of those two deliberate decisions.
describe("sessionTier", () => {
  it("returns null below every threshold (no badge for a brand-new host)", () => {
    expect(sessionTier({ hostCompletedSessions: 0, rating: 0 })).toBeNull();
    expect(sessionTier({})).toBeNull();
  });

  it("returns null just under the Rising Muse threshold", () => {
    expect(sessionTier({ hostCompletedSessions: 2, rating: 5 })).toBeNull(); // sessions too low
    expect(sessionTier({ hostCompletedSessions: 10, rating: 3.9 })).toBeNull(); // rating too low
  });

  it("returns Rising Muse right at its threshold", () => {
    const tier = sessionTier({ hostCompletedSessions: 3, rating: 4.0 });
    expect(tier?.key).toBe("rising");
  });

  it("returns Top Rated once both thresholds are cleared, not Rising Muse", () => {
    const tier = sessionTier({ hostCompletedSessions: 10, rating: 4.5 });
    expect(tier?.key).toBe("top");
  });

  it("returns Muse Elite at the top threshold", () => {
    const tier = sessionTier({ hostCompletedSessions: 25, rating: 4.8 });
    expect(tier?.key).toBe("elite");
  });

  it("never returns more than one tier — Elite-eligible hosts don't also get Top Rated/Rising", () => {
    const tier = sessionTier({ hostCompletedSessions: 100, rating: 5 });
    expect(tier?.key).toBe("elite");
  });

  it("qualifies for the highest tier whose sessions threshold is met even with a middling rating between tiers", () => {
    // 25+ sessions but rating only clears the Top Rated bar, not Elite's —
    // should land on Top Rated, not fall through to null or jump to Elite.
    const tier = sessionTier({ hostCompletedSessions: 30, rating: 4.6 });
    expect(tier?.key).toBe("top");
  });

  it("SESSION_TIERS stays ordered highest-to-lowest (sessionTier relies on .find() short-circuiting)", () => {
    for (let i = 1; i < SESSION_TIERS.length; i++) {
      expect(SESSION_TIERS[i - 1].minSessions).toBeGreaterThan(SESSION_TIERS[i].minSessions);
    }
  });
});
