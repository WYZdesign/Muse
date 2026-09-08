import { describe, it, expect } from "vitest";
import { isPaidTier } from "./subscriptionTiers";

describe("isPaidTier", () => {
  it("treats muse_pro as paid", () => {
    expect(isPaidTier("muse_pro")).toBe(true);
  });
  it("treats muse_studio as paid", () => {
    expect(isPaidTier("muse_studio")).toBe(true);
  });
  it("treats the legacy 'pro' value as paid", () => {
    expect(isPaidTier("pro")).toBe(true);
  });
  it("treats free/unknown/missing tiers as not paid", () => {
    expect(isPaidTier("free")).toBe(false);
    expect(isPaidTier("")).toBe(false);
    expect(isPaidTier(undefined)).toBe(false);
    expect(isPaidTier(null)).toBe(false);
  });
});
