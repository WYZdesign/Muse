import { describe, expect, it } from "vitest";
import { parseWith, WaitlistSchema, emailField } from "./validate";

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
