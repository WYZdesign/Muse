import { describe, it, expect } from "vitest";
import { checkRate, clientIp } from "./rate-limit";

describe("clientIp", () => {
  function mockHeaders(get: (name: string) => string | null) {
    return { headers: { get } } as any;
  }

  it("prefers x-real-ip", () => {
    const req = mockHeaders((n) => (n === "x-real-ip" ? "1.2.3.4" : null));
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-forwarded-for (first entry)", () => {
    const req = mockHeaders((n) => (n === "x-forwarded-for" ? "9.9.9.9, 10.10.10.10" : null));
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when no headers present", () => {
    const req = mockHeaders(() => null);
    expect(clientIp(req)).toBe("unknown");
  });
});

describe("checkRate", () => {
  it("allows requests under the limit", async () => {
    const ip = "test-ip-" + Math.random();
    for (let i = 0; i < 3; i++) {
      expect(await checkRate(ip, "action", 5)).toBe(true);
    }
  });

  it("blocks requests over the limit", async () => {
    const ip = "test-ip-" + Math.random();
    for (let i = 0; i < 2; i++) await checkRate(ip, "action", 2);
    expect(await checkRate(ip, "action", 2)).toBe(false);
  });

  it("is per-action and per-ip", async () => {
    const ip = "test-ip-" + Math.random();
    await checkRate(ip, "a", 1);
    expect(await checkRate(ip, "b", 1)).toBe(true); // different action
    expect(await checkRate(ip + "-other", "a", 1)).toBe(true); // different ip
  });
});
