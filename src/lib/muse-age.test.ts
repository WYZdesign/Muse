import { describe, it, expect } from "vitest";
import { parseBirthdate, ageFromBirthdate, sanitizeBirthdate, publicAge } from "@/lib/muse-age";

const NOW = new Date("2026-09-27T00:00:00Z");

describe("parseBirthdate", () => {
  it("parses a valid ISO date", () => {
    const d = parseBirthdate("1990-05-15");
    expect(d?.toISOString()).toBe("1990-05-15T00:00:00.000Z");
  });

  it("accepts a leap day", () => {
    expect(parseBirthdate("2000-02-29")).not.toBeNull();
  });

  it("rejects a non-leap-year Feb 29", () => {
    expect(parseBirthdate("1999-02-29")).toBeNull();
  });

  it("rejects rolled-over calendar dates and bad formats", () => {
    for (const bad of ["1990-02-30", "1990-13-01", "1990-00-10", "90-05-15", "1990/05/15", "", null, 19900515, "1990-5-15"]) {
      expect(parseBirthdate(bad)).toBeNull();
    }
  });
});

describe("ageFromBirthdate", () => {
  it("returns whole years and increments on the birthday", () => {
    expect(ageFromBirthdate("1990-05-15", new Date("2026-05-14T00:00:00Z"))).toBe(35);
    expect(ageFromBirthdate("1990-05-15", new Date("2026-05-15T00:00:00Z"))).toBe(36);
    expect(ageFromBirthdate("1990-05-15", new Date("2026-05-16T00:00:00Z"))).toBe(36);
  });

  it("handles a leap-day birthday", () => {
    expect(ageFromBirthdate("2000-02-29", new Date("2026-02-28T00:00:00Z"))).toBe(25);
    expect(ageFromBirthdate("2000-02-29", new Date("2026-03-01T00:00:00Z"))).toBe(26);
  });

  it("returns null for invalid input", () => {
    expect(ageFromBirthdate("not-a-date", NOW)).toBeNull();
    expect(ageFromBirthdate(undefined, NOW)).toBeNull();
  });
});

describe("sanitizeBirthdate", () => {
  it("accepts and canonicalises a valid adult birthdate", () => {
    expect(sanitizeBirthdate("1990-05-15", NOW)).toBe("1990-05-15");
    expect(sanitizeBirthdate("1990-5-15", NOW)).toBeUndefined();
  });

  it("rejects future dates", () => {
    expect(sanitizeBirthdate("2030-01-01", NOW)).toBeUndefined();
    expect(sanitizeBirthdate("2026-09-28", NOW)).toBeUndefined();
  });

  it("rejects ages under 18", () => {
    expect(sanitizeBirthdate("2009-01-01", NOW)).toBeUndefined();
    expect(sanitizeBirthdate("2008-12-31", NOW)).toBeUndefined();
  });

  it("accepts the 18th-birthday boundary", () => {
    expect(sanitizeBirthdate("2008-09-27", NOW)).toBe("2008-09-27");
  });

  it("rejects ages over 120 and accepts the 120 boundary", () => {
    expect(sanitizeBirthdate("1900-01-01", NOW)).toBeUndefined();
    expect(sanitizeBirthdate("1906-09-27", NOW)).toBe("1906-09-27");
  });

  it("rejects non-string / malformed input", () => {
    for (const bad of [null, undefined, 19900515, "", "1990-02-30", {}]) {
      expect(sanitizeBirthdate(bad, NOW)).toBeUndefined();
    }
  });
});

describe("publicAge", () => {
  it("derives age when showAge is unset or true", () => {
    expect(publicAge({ birthdate: "1990-05-15" }, NOW)).toBe(36);
    expect(publicAge({ birthdate: "1990-05-15", preferences: { showAge: true } }, NOW)).toBe(36);
  });

  it("hides age when the owner sets showAge false", () => {
    expect(publicAge({ birthdate: "1990-05-15", preferences: { showAge: false } }, NOW)).toBeUndefined();
  });

  it("returns undefined for missing/invalid birthdate or null row", () => {
    expect(publicAge(null, NOW)).toBeUndefined();
    expect(publicAge({}, NOW)).toBeUndefined();
    expect(publicAge({ birthdate: "nope" }, NOW)).toBeUndefined();
  });
});
