import { describe, it, expect, vi, beforeEach } from "vitest";

// checkRate fails CLOSED if the durable RPC errors. Mock the service client
// per-test via globalThis.__rateRpc so fail-closed paths are deterministic.
vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    rpc: vi.fn(async (_name: string, args: any) =>
      (globalThis as any).__rateRpc
        ? (globalThis as any).__rateRpc(_name, args)
        : { data: args?.p_limit <= 999, error: null },
    ),
  })),
}));

import { checkRate, checkRateUser, clientIp } from "./rate-limit";

beforeEach(() => {
  (globalThis as any).__rateRpc = undefined;
});

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
    expect(await checkRate(ip, "b", 1)).toBe(true);
    expect(await checkRate(ip + "-other", "a", 1)).toBe(true);
  });

  it("fails closed when durable RPC returns an error", async () => {
    (globalThis as any).__rateRpc = async () => ({ data: null, error: { message: "db down" } });
    expect(await checkRate("fail-closed-rpc-" + Math.random(), "a", 10)).toBe(false);
  });

  it("fails closed when durable RPC returns null (not boolean true)", async () => {
    (globalThis as any).__rateRpc = async () => ({ data: null, error: null });
    expect(await checkRate("fail-closed-null-" + Math.random(), "a", 10)).toBe(false);
  });

  it("fails closed when durable RPC returns non-true value", async () => {
    (globalThis as any).__rateRpc = async () => ({ data: "ok", error: null });
    expect(await checkRate("fail-closed-str-" + Math.random(), "a", 10)).toBe(false);
  });

  it("allows when durable RPC returns explicit true", async () => {
    (globalThis as any).__rateRpc = async () => ({ data: true, error: null });
    expect(await checkRate("allow-true-" + Math.random(), "a", 5)).toBe(true);
  });

  it("denies when durable RPC returns explicit false", async () => {
    (globalThis as any).__rateRpc = async () => ({ data: false, error: null });
    expect(await checkRate("deny-false-" + Math.random(), "a", 5)).toBe(false);
  });
});

describe("checkRateUser", () => {
  it("keys by u:userId so users do not share IP quotas", async () => {
    const userId = "user-" + Math.random();
    expect(await checkRateUser(userId, "delete-account", 1)).toBe(true);
    expect(await checkRateUser(userId, "delete-account", 1)).toBe(false);
    // Different user, same action — independent bucket
    expect(await checkRateUser(userId + "-other", "delete-account", 1)).toBe(true);
  });

  it("fails closed on RPC error for user keys", async () => {
    (globalThis as any).__rateRpc = async () => ({ data: null, error: { message: "boom" } });
    expect(await checkRateUser("u-fail-" + Math.random(), "action", 5)).toBe(false);
  });
});
