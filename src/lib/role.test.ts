import { describe, it, expect } from "vitest";
import {
  MUSE_TYPES,
  CREATIVE_TYPES,
  isIndustryType,
  isMuseType,
  isCreativeType,
  getMuseRole,
  viewerSide,
  viewerSideOf,
  getRoleCapabilities,
  roleSpecific,
  roleBadgeText,
  profileSectionLabel,
  navTabLabel,
  ctaText,
  emptyStateText,
} from "./role";

describe("role type detection", () => {
  it("recognizes industry/muse types and rejects others", () => {
    expect(isIndustryType("Producer")).toBe(true);
    expect(isMuseType("Creative Director")).toBe(true);
    expect(isCreativeType("Photographer")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(isMuseType("  Casting Director  ")).toBe(true);
    expect(isCreativeType("  Model ")).toBe(true);
  });

  it("is case-sensitive (sets hold the exact display strings)", () => {
    expect(isMuseType("producer")).toBe(false);
    expect(isCreativeType("photographer")).toBe(false);
  });

  it("handles null/undefined/empty without throwing", () => {
    expect(isIndustryType(null)).toBe(false);
    expect(isIndustryType(undefined)).toBe(false);
    expect(isIndustryType("")).toBe(false);
    expect(isMuseType(undefined)).toBe(false);
    expect(isCreativeType(null)).toBe(false);
  });

  it("the two type sets are disjoint", () => {
    for (const t of MUSE_TYPES) expect(CREATIVE_TYPES.has(t)).toBe(false);
  });
});

describe("getMuseRole", () => {
  it("prefers an explicit audience field", () => {
    expect(getMuseRole({ audience: "muse", type: "Photographer" })).toBe("muse");
    expect(getMuseRole({ audience: "creative", type: "Producer" })).toBe("creative");
  });

  it("accepts legacy 'industry' as muse", () => {
    expect(getMuseRole({ audience: "industry" })).toBe("muse");
  });

  it("normalizes audience casing/whitespace", () => {
    expect(getMuseRole({ audience: "  MUSE " })).toBe("muse");
    expect(getMuseRole({ audience: "Creative" })).toBe("creative");
  });

  it("falls back to the type set when audience is absent/unknown", () => {
    expect(getMuseRole({ type: "Producer" })).toBe("muse");
    expect(getMuseRole({ type: "Model" })).toBe("creative");
  });

  it("defaults to creative for null/unknown/empty profiles", () => {
    expect(getMuseRole(null)).toBe("creative");
    expect(getMuseRole(undefined)).toBe("creative");
    expect(getMuseRole({})).toBe("creative");
    expect(getMuseRole({ audience: "", type: "Unknown Type" })).toBe("creative");
  });
});

describe("viewerSide / viewerSideOf", () => {
  it("viewerSide maps industry types to 'industry', everything else to 'creative'", () => {
    expect(viewerSide("Producer")).toBe("industry");
    expect(viewerSide("Model")).toBe("creative");
    expect(viewerSide(null)).toBe("creative");
  });

  it("viewerSideOf honors explicit audience including muse→industry", () => {
    expect(viewerSideOf({ audience: "industry" })).toBe("industry");
    expect(viewerSideOf({ audience: "creative" })).toBe("creative");
    expect(viewerSideOf({ audience: "muse", type: "Model" })).toBe("industry");
  });

  it("viewerSideOf falls back to type detection", () => {
    expect(viewerSideOf({ type: "Producer" })).toBe("industry");
    expect(viewerSideOf({ type: "Photographer" })).toBe("creative");
    expect(viewerSideOf(null)).toBe("creative");
  });
});

describe("role capabilities", () => {
  it("returns the matching capability object", () => {
    const muse = getRoleCapabilities("muse") as any;
    const creative = getRoleCapabilities("creative") as any;
    expect(muse.canHireBook).toBe(true);
    expect(creative.canApplyToBriefs).toBe(true);
    expect(creative.canHireBook).toBeUndefined();
  });

  it("exposes distinct default tabs per role", () => {
    expect(getRoleCapabilities("muse").defaultTabs).toContain("analytics");
    expect(getRoleCapabilities("creative").defaultTabs).toContain("matches");
  });
});

describe("role-aware text helpers", () => {
  it("roleSpecific picks the value for the role", () => {
    expect(roleSpecific("muse", "hire them", "apply now")).toBe("hire them");
    expect(roleSpecific("creative", "hire them", "apply now")).toBe("apply now");
  });

  it("roleBadgeText is plain text per role", () => {
    expect(roleBadgeText("muse")).toBe("Musa");
    expect(roleBadgeText("creative")).toBe("Creative");
  });

  it("profileSectionLabel maps known sections and passes unknowns through", () => {
    expect(profileSectionLabel("muse", "portfolio")).toBe("Portfolio & Work");
    expect(profileSectionLabel("creative", "reel")).toBe("Reel & Demos");
    expect(profileSectionLabel("creative", "unknown-section")).toBe("unknown-section");
  });

  it("navTabLabel differs by role and passes unknowns through", () => {
    expect(navTabLabel("muse", "discover")).toBe("Scout");
    expect(navTabLabel("creative", "discover")).toBe("Discover");
    expect(navTabLabel("muse", "nope")).toBe("nope");
  });

  it("ctaText differs by role and passes unknowns through", () => {
    expect(ctaText("muse", "hire")).toBe("Hire");
    expect(ctaText("creative", "hire")).toBe("Pitch");
    expect(ctaText("creative", "book")).toBe("Request Booking");
    expect(ctaText("muse", "nothing" as never)).toBe("nothing");
  });

  it("emptyStateText returns role copy and a safe default for unknown context", () => {
    expect(emptyStateText("muse", "matches").title).toBe("No Talent Yet");
    expect(emptyStateText("creative", "matches").title).toBe("No Musa Yet");
    expect(emptyStateText("creative", "unknown")).toEqual({ title: "Nothing Here", subtitle: "Check back later" });
  });
});
