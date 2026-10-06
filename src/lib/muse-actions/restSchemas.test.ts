import { describe, it, expect } from "vitest";
import { validateRest } from "./restSchemas";

describe("validateRest", () => {
  it("rejects prototype-pollution keys", () => {
    const polluted = JSON.parse('{"__proto__":{"isAdmin":true}}') as Record<string, unknown>;
    expect(Object.keys(polluted)).toContain("__proto__");
    expect(validateRest("feed", polluted).ok).toBe(false);
  });

  it("caps the total payload size", () => {
    expect(validateRest("feed", { text: "x".repeat(60000) }).ok).toBe(false);
  });

  it("validates a known action's field format", () => {
    expect(validateRest("track-view", { target_id: "not-a-uuid" }).ok).toBe(false);
    expect(validateRest("track-view", { target_id: "11111111-1111-1111-1111-111111111111" }).ok).toBe(true);
  });

  it("enforces bounds on a known action field", () => {
    expect(validateRest("apply-promo", { code: "x".repeat(100) }).ok).toBe(false);
    expect(validateRest("apply-promo", { code: "WELCOME10" }).ok).toBe(true);
  });

  it("accepts extra fields on a mapped action (passthrough)", () => {
    expect(validateRest("feed", { text: "hi", futureField: 1 }).ok).toBe(true);
  });

  it("passes unknown actions through the universal guards only", () => {
    expect(validateRest("some-unmapped-action", { anything: true }).ok).toBe(true);
  });
});
