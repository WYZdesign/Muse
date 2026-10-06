import { describe, expect, it } from "vitest";
import { ConnectSchema, AdminPromoteWaitlistSchema, parseWith, WaitlistSchema, SupportSchema, MfaSchema, VerificationSchema, emailField } from "./validate";

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


describe("parseWith / ConnectSchema", () => {
  it("accepts the supported financial actions", () => {
    for (const action of ["create-account", "create-account-session", "create-payment", "account-status", "transfer", "create-booking-checkout", "create-boost-checkout", "request-refund", "cancel-refund-request"]) {
      expect(parseWith(ConnectSchema, { action }).ok).toBe(true);
    }
  });

  it("rejects an unknown action before a financial handler runs", () => {
    const r = parseWith(ConnectSchema, { action: "charge-anyone" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Unknown action");
  });

  it("coerces legacy numeric request values while enforcing safe bounds", () => {
    const accepted = parseWith(ConnectSchema, { action: "create-boost-checkout", quantity: "2", duration: "72h" });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) expect(accepted.data.quantity).toBe(2);
    expect(parseWith(ConnectSchema, { action: "create-boost-checkout", quantity: 21 }).ok).toBe(false);
  });

  it("rejects oversized financial request fields", () => {
    expect(parseWith(ConnectSchema, { action: "create-payment", payeeId: "x".repeat(201) }).ok).toBe(false);
    expect(parseWith(ConnectSchema, { action: "request-refund", reason: "x".repeat(1001) }).ok).toBe(false);
  });
});

describe("parseWith / AdminPromoteWaitlistSchema", () => {
  it("accepts one address or a bounded batch", () => {
    expect(parseWith(AdminPromoteWaitlistSchema, { email: "owner@example.com" }).ok).toBe(true);
    expect(parseWith(AdminPromoteWaitlistSchema, { emails: ["a@example.com", "b@example.com"] }).ok).toBe(true);
  });

  it("rejects malformed, missing, and oversized promotion input", () => {
    expect(parseWith(AdminPromoteWaitlistSchema, {}).ok).toBe(false);
    expect(parseWith(AdminPromoteWaitlistSchema, { emails: ["nope"] }).ok).toBe(false);
    expect(parseWith(AdminPromoteWaitlistSchema, { emails: Array.from({ length: 51 }, (_, i) => `user${i}@example.com`) }).ok).toBe(false);
  });
});
