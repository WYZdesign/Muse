import { describe, it, expect } from "vitest";
import {
  validatePassword,
  passwordClasses,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  PASSWORD_RULES_LABEL,
} from "@/lib/password-policy";

// Fixtures are obviously synthetic on purpose: never use a real credential.
const VALID_3_CLASS = "Abcdefghijkl1"; // lower + upper + digit, 13 chars, no symbol
const VALID_4_CLASS = "Tr0ubador&9x"; // all four classes, 13 chars
const TOO_SHORT = "Ab3&defghij"; // 11 chars but all four classes present
const TWO_CLASSES = "ZebraHeadboard"; // 14 chars, lower + upper only
const SPACES_ONLY = "            "; // 12 spaces
const PLACEHOLDER = "Password1234";
const REPEATED = "aaaaaaaaaaaa";

describe("validatePassword (policy baseline)", () => {
  it("accepts a 12+ character password using exactly three of four classes", () => {
    expect(validatePassword(VALID_3_CLASS)).toBeNull();
    expect(VALID_3_CLASS.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    expect(passwordClasses(VALID_3_CLASS)).toEqual(["lowercase", "uppercase", "number"]);
  });

  it("accepts a password using all four classes", () => {
    expect(validatePassword(VALID_4_CLASS)).toBeNull();
    expect(passwordClasses(VALID_4_CLASS)).toEqual([
      "lowercase", "uppercase", "number", "symbol",
    ]);
  });

  it("rejects a password under 12 characters", () => {
    expect(validatePassword(TOO_SHORT)).toMatch(/at least 12 characters/);
    expect(TOO_SHORT.length).toBe(11);
  });

  it("accepts exactly MIN_PASSWORD_LENGTH characters", () => {
    const edge = "A1&abcdefghi"; // 12 chars, three classes
    expect(edge.length).toBe(MIN_PASSWORD_LENGTH);
    expect(validatePassword(edge)).toBeNull();
  });

  it("rejects a long password with fewer than three classes", () => {
    expect(validatePassword(TWO_CLASSES)).toMatch(/at least 3 of/);
  });

  it("does not count whitespace as the symbol class", () => {
    const spaced = "Abcdefghij k"; // 12 chars, lower + upper, space is not a symbol
    expect(spaced.length).toBe(MIN_PASSWORD_LENGTH);
    expect(validatePassword(spaced)).toMatch(/at least 3 of/);
    expect(passwordClasses(spaced)).toEqual(["lowercase", "uppercase"]);
  });

  it("rejects whitespace-only input", () => {
    expect(validatePassword(SPACES_ONLY)).toMatch(/only spaces/);
  });

  it("rejects well-known placeholder passwords", () => {
    expect(validatePassword(PLACEHOLDER)).toMatch(/too common/);
    expect(validatePassword("abcdefghijkl")).toMatch(/too common/);
  });

  it("rejects a single repeated character", () => {
    expect(validatePassword(REPEATED)).toMatch(/too common/);
  });

  it("rejects passwords over MAX_PASSWORD_LENGTH", () => {
    const long = "A1&" + "b".repeat(MAX_PASSWORD_LENGTH);
    expect(long.length).toBeGreaterThan(MAX_PASSWORD_LENGTH);
    expect(validatePassword(long)).toMatch(/too long/);
  });

  it("rejects empty and non-string input without echoing it", () => {
    expect(validatePassword("")).toMatch(/required/);
    expect(validatePassword(null)).toMatch(/required/);
    expect(validatePassword(undefined)).toMatch(/required/);
    expect(validatePassword(12345 as unknown)).toMatch(/required/);
  });

  it("never echoes the submitted password back in the error", () => {
    const err = validatePassword("hunter2hunter2");
    expect(err).not.toContain("hunter2");
  });
});

describe("PASSWORD_RULES_LABEL", () => {
  it("states the same rules the validator enforces", () => {
    expect(PASSWORD_RULES_LABEL).toContain(`${MIN_PASSWORD_LENGTH}+ characters`);
    expect(PASSWORD_RULES_LABEL).toContain("3 of: lowercase, uppercase, number, symbol");
  });
});
