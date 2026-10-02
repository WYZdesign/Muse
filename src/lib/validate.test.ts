import { describe, expect, it } from "vitest";
import { parseWith, WaitlistSchema, SupportSchema, MfaSchema, VerificationSchema, emailField } from "./validate";

describe("parseWith / WaitlistSchema", () => {
  it("accepts a valid email and trims it", () => {
    const r = parseWith(WaitlistSchema, { email: "  Foo@Example.com  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("Foo@Example.com");
  });

  it("rejects a malformed email with the expected message", () => {
    const r = parseWith(WaitlistSchema, { email: "not-an-email" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Valid email required");
  });

  it("rejects a missing email", () => {
    expect(parseWith(WaitlistSchema, { phone: "123" }).ok).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(parseWith(WaitlistSchema, null).ok).toBe(false);
    expect(parseWith(WaitlistSchema, "x").ok).toBe(false);
  });

  it("allows optional phone/source", () => {
    const r = parseWith(WaitlistSchema, { email: "a@b.co" });
    expect(r.ok).toBe(true);
  });

  it("rejects an over-long email", () => {
    const long = "a".repeat(250) + "@b.co";
    expect(parseWith(WaitlistSchema, { email: long }).ok).toBe(false);
  });

  it("emailField enforces the practical format", () => {
    expect(emailField.safeParse("x@y.z").success).toBe(true);
    expect(emailField.safeParse("x@y").success).toBe(false);
    expect(emailField.safeParse("x y@z.co").success).toBe(false);
  });
});

describe("parseWith / SupportSchema", () => {
  it("accepts question or the q alias", () => {
    expect(parseWith(SupportSchema, { question: "hi" }).ok).toBe(true);
    expect(parseWith(SupportSchema, { q: "hi" }).ok).toBe(true);
  });

  it("rejects a non-string question", () => {
    expect(parseWith(SupportSchema, { question: 123 }).ok).toBe(false);
  });

  it("rejects an over-long question", () => {
    expect(parseWith(SupportSchema, { question: "a".repeat(4001) }).ok).toBe(false);
  });

  it("accepts an empty object (route then returns 400 question required)", () => {
    const r = parseWith(SupportSchema, {});
    expect(r.ok).toBe(true);
  });
});

describe("parseWith / MfaSchema", () => {
  it("accepts known actions", () => {
    for (const action of ["enroll", "verify", "verify-code", "unenroll", "challenge", "verify-session"]) {
      expect(parseWith(MfaSchema, { action }).ok).toBe(true);
    }
  });

  it("rejects an unknown action with the route's message", () => {
    const r = parseWith(MfaSchema, { action: "drop-table" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Unknown action");
  });

  it("passes through optional fields and rejects over-long ones", () => {
    expect(parseWith(MfaSchema, { action: "verify", factorId: "abc", code: "123456" }).ok).toBe(true);
    expect(parseWith(MfaSchema, { action: "verify", factorId: "x".repeat(201) }).ok).toBe(false);
  });
});

describe("parseWith / VerificationSchema", () => {
  it("accepts the known actions", () => {
    for (const action of ["create-verification-session", "get-verification-status", "create-age-gate-session"]) {
      expect(parseWith(VerificationSchema, { action }).ok).toBe(true);
    }
  });

  it("rejects an invalid action", () => {
    const r = parseWith(VerificationSchema, { action: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Invalid action");
  });
});
