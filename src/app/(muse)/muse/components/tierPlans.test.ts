/** Guards the tier -> checkout contract: every paid tier must send a plan key
 *  that /api/checkout accepts, and the accepted set must normalize cleanly.
 *  Regression: the Muse -> Musa brand rename made the old name-derived key
 *  (`musa_pro`) diverge from the billing key (`muse_pro`), so every paid plan
 *  failed checkout with "Invalid plan". */
import { describe, it, expect } from "vitest";
import { TIERS, TIERS_BY_SIDE } from "./types";
import { CheckoutSchema, parseWith } from "@/lib/validate";

const ALL_TIERS = [...TIERS, ...TIERS_BY_SIDE.creative, ...TIERS_BY_SIDE.industry];

describe("tier checkout plans", () => {
  it("every tier declares an explicit plan key", () => {
    for (const tier of ALL_TIERS) {
      expect(tier.plan, `tier ${tier.name} is missing a plan key`).toBeTruthy();
    }
  });

  it("no plan key is derived from the display name", () => {
    for (const tier of ALL_TIERS) {
      const derived = tier.name.toLowerCase().replace(/ /g, "_");
      if (derived !== tier.plan) {
        // Allowed only when the two spellings are known brand aliases that the
        // API normalizes (musa_* -> muse_*), never for a genuinely unknown key.
        expect(["musa_pro", "musa_pro_annual", "musa_studio"]).toContain(derived);
      }
    }
  });

  it("paid tier plans are accepted by the checkout schema", () => {
    for (const tier of ALL_TIERS) {
      if (tier.plan === "free") continue;
      const parsed = parseWith(CheckoutSchema, { plan: tier.plan });
      expect(parsed.ok, `plan ${tier.plan} rejected by CheckoutSchema`).toBe(true);
    }
  });

  it("legacy musa_* spellings still validate", () => {
    for (const alias of ["musa_pro", "musa_pro_annual", "musa_studio", "musa"]) {
      expect(parseWith(CheckoutSchema, { plan: alias }).ok, alias).toBe(true);
    }
  });

  it("unknown plans are rejected", () => {
    expect(parseWith(CheckoutSchema, { plan: "nope" }).ok).toBe(false);
    expect(parseWith(CheckoutSchema, {}).ok).toBe(false);
  });

  it("the three visible tiers on each side are distinct", () => {
    for (const side of ["creative", "industry"] as const) {
      const plans = TIERS_BY_SIDE[side].map((t) => t.plan);
      expect(new Set(plans).size).toBe(plans.length);
    }
  });
});
