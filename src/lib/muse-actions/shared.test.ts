import { describe, it, expect } from "vitest";
import { isAgeVerificationCurrent, AGE_VERIFICATION_VALID_DAYS, isPaidTier, applyLikeTierGate } from "./shared";

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

describe("isPaidTier", () => {
  it("accepts every advertised paid tier", () => {
    expect(isPaidTier("muse_pro")).toBe(true);
    expect(isPaidTier("pro")).toBe(true);
    expect(isPaidTier("muse_studio")).toBe(true);
  });

  it("rejects free and unknown tiers", () => {
    expect(isPaidTier("free")).toBe(false);
    expect(isPaidTier("muse_basic")).toBe(false);
    expect(isPaidTier("")).toBe(false);
    expect(isPaidTier(null)).toBe(false);
    expect(isPaidTier(undefined)).toBe(false);
  });
});

describe("applyLikeTierGate", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: 7,
    type: "match",
    body: "Maya Chen liked your prompt: \"do you shoot film?\"",
    from: "Maya Chen",
    avatar: "https://cdn/x.png",
    ...over,
  });

  it("returns a paid recipient's like as-is (name, avatar and body untouched)", () => {
    const r = row();
    const out = applyLikeTierGate(r, "Maya Chen", "https://cdn/x.png", true);
    expect(out.from).toBe("Maya Chen");
    expect(out.avatar).toBe("https://cdn/x.png");
    expect(out.body).toBe(r.body);
    // Short-circuits without copying, so callers can pass the raw row through.
    expect(out).toBe(r);
  });

  it("strips the liker's name from the body for a free recipient", () => {
    const out = applyLikeTierGate(row(), "Maya Chen", "https://cdn/x.png", false);
    expect(out.body).toBe('Someone liked your prompt: "do you shoot film?"');
    expect(out.body).not.toContain("Maya Chen");
  });

  it("replaces the sender label and avatar too", () => {
    const out = applyLikeTierGate(row(), "Maya Chen", "https://cdn/x.png", false);
    expect(out.from).toBe("Someone");
    expect(out.avatar).toBe("");
  });

  it("gates the 'like' type as well as 'match'", () => {
    const out = applyLikeTierGate(row({ type: "like", body: "Maya Chen matched with you!" }), "Maya Chen", "", false);
    expect(out.body).toBe("Someone matched with you!");
  });

  it("redacts a name that appears mid-body, not only as a prefix", () => {
    const out = applyLikeTierGate(row({ body: "Your note to Maya Chen was read" }), "Maya Chen", "", false);
    expect(out.body).toBe("Your note to Someone was read");
  });

  it("still hides the sender when the body does not contain the name", () => {
    const out = applyLikeTierGate(row({ body: "Someone liked your photo!" }), "Maya Chen", "https://cdn/x.png", false);
    expect(out.body).toBe("Someone liked your photo!");
    expect(out.from).toBe("Someone");
    expect(out.avatar).toBe("");
  });

  it("does not touch non-like notifications (the sender stays visible)", () => {
    for (const type of ["quest", "booking", "strike", "message", "boost", ""]) {
      const out = applyLikeTierGate(row({ type, from: "Admin", avatar: "a.png" }), "Admin", "a.png", false);
      expect(out.from).toBe("Admin");
      expect(out.avatar).toBe("a.png");
      expect(out.body).toContain("Maya Chen");
    }
  });

  it("keeps unread and id fields intact", () => {
    const out = applyLikeTierGate({ id: 7, type: "match", body: "Maya Chen matched with you!", read: false }, "Maya Chen", "", false);
    expect(out.id).toBe(7);
    expect(out.read).toBe(false);
    expect(out.body).toBe("Someone matched with you!");
  });
});
