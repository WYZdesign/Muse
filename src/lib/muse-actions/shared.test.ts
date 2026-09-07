import { describe, it, expect } from "vitest";
import { isAgeVerificationCurrent, AGE_VERIFICATION_VALID_DAYS } from "./shared";

describe("isAgeVerificationCurrent", () => {
  it("is false when never verified", () => {
    expect(isAgeVerificationCurrent(null)).toBe(false);
    expect(isAgeVerificationCurrent(undefined)).toBe(false);
    expect(isAgeVerificationCurrent({})).toBe(false);
    expect(isAgeVerificationCurrent({ age_verified: false, age_verified_at: new Date().toISOString() })).toBe(false);
  });

  it("is false when verified=true but the timestamp is missing (never grandfather in)", () => {
    expect(isAgeVerificationCurrent({ age_verified: true, age_verified_at: null })).toBe(false);
    expect(isAgeVerificationCurrent({ age_verified: true })).toBe(false);
  });

  it("is false for an unparseable timestamp", () => {
    expect(isAgeVerificationCurrent({ age_verified: true, age_verified_at: "not-a-date" })).toBe(false);
  });

  it("is true for a fresh verification", () => {
    expect(isAgeVerificationCurrent({ age_verified: true, age_verified_at: new Date().toISOString() })).toBe(true);
  });

  it("is true just inside the re-verification window", () => {
    const justInside = new Date(Date.now() - (AGE_VERIFICATION_VALID_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString();
    expect(isAgeVerificationCurrent({ age_verified: true, age_verified_at: justInside })).toBe(true);
  });

  it("is false once the re-verification window has passed", () => {
    const justOutside = new Date(Date.now() - (AGE_VERIFICATION_VALID_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    expect(isAgeVerificationCurrent({ age_verified: true, age_verified_at: justOutside })).toBe(false);
  });

  it("stays within Torreé's stated 3-6 month policy window", () => {
    expect(AGE_VERIFICATION_VALID_DAYS).toBeGreaterThanOrEqual(90);
    expect(AGE_VERIFICATION_VALID_DAYS).toBeLessThanOrEqual(184);
  });
});
