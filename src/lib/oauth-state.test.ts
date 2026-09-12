import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// signState and verifyState are pure crypto functions — no mocks needed.
// We just test the round-trip, forgery detection, and expiry.

import { signState, verifyState } from "@/lib/oauth-state";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("oauth-state sign/verify", () => {
  it("round-trips valid data", () => {
    const data = { profileId: "p1", provider: "spotify", ts: Date.now() };
    const signed = signState(data);
    const decoded = verifyState(signed) as Record<string, unknown>;
    expect(decoded).not.toBeNull();
    expect(decoded.profileId).toBe("p1");
    expect(decoded.provider).toBe("spotify");
  });

  it("rejects tampered payload", () => {
    const signed = signState({ profileId: "p1", provider: "spotify", ts: Date.now() });
    const dot = signed.lastIndexOf(".");
    const payload = signed.slice(0, dot);
    const sig = signed.slice(dot + 1);
    // Tamper with payload
    const tampered = payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
    expect(verifyState(`${tampered}.${sig}`)).toBeNull();
  });

  it("rejects tampered signature", () => {
    const signed = signState({ profileId: "p1", provider: "spotify", ts: Date.now() });
    const dot = signed.lastIndexOf(".");
    const payload = signed.slice(0, dot);
    const sig = signed.slice(dot + 1);
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(verifyState(`${payload}.${tamperedSig}`)).toBeNull();
  });

  it("rejects expired state (default 10 min)", () => {
    const data = { profileId: "p1", provider: "spotify", ts: Date.now() };
    const signed = signState(data);
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(verifyState(signed)).toBeNull();
  });

  it("allows state within maxAgeMs", () => {
    const data = { profileId: "p1", provider: "spotify", ts: Date.now() };
    const signed = signState(data);
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(verifyState(signed, 10 * 60 * 1000)).not.toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifyState("not-a-valid-state")).toBeNull();
    expect(verifyState("")).toBeNull();
    expect(verifyState("abc.def.ghi")).toBeNull();
  });
});
