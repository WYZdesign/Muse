import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, any>;

/** Minimal fake of the supabase query builder for head-count / maybeSingle reads. */
function fakeClient(rows: Row[]) {
  const make = (table: string) => ({
    select: (_cols: string, opts?: { head?: boolean }) => {
      const filters: Array<{ op: "eq" | "lt"; c: string; v: any }> = [];
      const matched = () =>
        rows.filter((r) => filters.every((f) => (f.op === "eq" ? r[f.c] === f.v : r[f.c] < f.v)));
      const api: any = {
        eq: (c: string, v: any) => { filters.push({ op: "eq", c, v }); return api; },
        lt: (c: string, v: any) => { filters.push({ op: "lt", c, v }); return api; },
        maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
        then: (onF: any, onR: any) =>
          Promise.resolve(opts?.head
            ? { count: matched().length, data: null }
            : { count: matched().length, data: matched() }
          ).then(onF, onR),
      };
      return api;
    },
    eq: (_c: string, _v: any) => ({ maybeSingle: async () => ({ data: null, error: null }) }),
    from: () => make(table),
  });
  return { from: (table: string) => make(table) };
}

import { queuePosition, newReferralCode, pickReferralCode, shareUrl } from "@/lib/waitlist-queue";

const row = (id: string, created_at: string, extra: Row = {}): Row => ({ id, created_at, ...extra });

beforeEach(() => vi.clearAllMocks());

describe("queuePosition", () => {
  it("ranks you after everyone who signed up earlier", async () => {
    const rows = [
      row("a", "2026-10-01T00:00:00Z"),
      row("b", "2026-10-02T00:00:00Z"),
      row("me", "2026-10-03T00:00:00Z"),
    ];
    const r = await queuePosition(fakeClient(rows), { id: "me", created_at: "2026-10-03T00:00:00Z" });
    expect(r.position).toBe(3);
    expect(r.total).toBe(3);
    expect(r.referrals).toBe(0);
  });

  it("moves you up one place per person you referred", async () => {
    const rows = [
      row("a", "2026-10-01T00:00:00Z"),
      row("b", "2026-10-02T00:00:00Z"),
      row("me", "2026-10-03T00:00:00Z"),
      row("friend", "2026-10-04T00:00:00Z", { referred_by: "me" }),
    ];
    const r = await queuePosition(fakeClient(rows), { id: "me", created_at: "2026-10-03T00:00:00Z" });
    // Two people signed up before me (3rd), one arrived through my link -> 2nd.
    expect(r.position).toBe(2);
    expect(r.referrals).toBe(1);
    expect(r.total).toBe(4);
  });

  it("never lets referral credit push you below position 1", async () => {
    const rows = [
      row("me", "2026-10-01T00:00:00Z"),
      row("f1", "2026-10-02T00:00:00Z", { referred_by: "me" }),
      row("f2", "2026-10-03T00:00:00Z", { referred_by: "me" }),
      row("f3", "2026-10-04T00:00:00Z", { referred_by: "me" }),
      row("f4", "2026-10-05T00:00:00Z", { referred_by: "me" }),
    ];
    const r = await queuePosition(fakeClient(rows), { id: "me", created_at: "2026-10-01T00:00:00Z" });
    expect(r.position).toBe(1);
    expect(r.referrals).toBe(4);
  });

  it("shares a position for signups in the same second", async () => {
    const rows = [
      row("a", "2026-10-01T00:00:00Z"),
      row("me", "2026-10-01T00:00:00Z"),
    ];
    const r = await queuePosition(fakeClient(rows), { id: "me", created_at: "2026-10-01T00:00:00Z" });
    expect(r.position).toBe(1);
  });

  it("degrades to position 1 when the count queries fail", async () => {
    const broken = {
      from: () => ({
        select: () => ({
          eq: () => Promise.reject(new Error("network")),
          lt: () => Promise.reject(new Error("network")),
          then: (_f: any, r: any) => Promise.reject(new Error("network")).then(null, r),
        }),
      }),
    };
    const r = await queuePosition(broken, { id: "me", created_at: "2026-10-01T00:00:00Z" });
    expect(r).toEqual({ position: 1, total: 0, referrals: 0 });
  });
});

describe("referral codes", () => {
  it("generates 8 human-friendly characters with no 0/O/1/I/L", () => {
    for (let i = 0; i < 50; i++) {
      expect(newReferralCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it("picks a code that is not already taken", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => row(`r${i}`, "2026-10-01T00:00:00Z", {
      referral_code: `TAKEN${String(i).padStart(3, "0")}`.slice(0, 8),
    }));
    const code = await pickReferralCode(fakeClient(rows));
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(rows.some((r) => r.referral_code === code)).toBe(false);
  });

  it("builds a share link pointing at the landing page with the code", () => {
    const url = shareUrl("REF12345");
    expect(url).toContain("/muse/landing?ref=REF12345");
  });
});
