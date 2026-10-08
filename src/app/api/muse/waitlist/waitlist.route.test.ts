import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, any>;
const tables: Record<string, Row[]> = {
  muse_waitlist: [],
  muse_landing_analytics: [],
  muse_qr_events: [],
};
let forcedInsertError: { code?: string } | null = null;

function makeBuilder(table: string, opts?: { head?: boolean }) {
  const rows = () => tables[table] ?? [];
  const filters: Array<{ op: "eq" | "lt"; c: string; v: any }> = [];
  const matched = () =>
    rows().filter((r) => filters.every((f) => (f.op === "eq" ? r[f.c] === f.v : r[f.c] < f.v)));
  const api: any = {
    eq: (c: string, v: any) => { filters.push({ op: "eq", c, v }); return api; },
    lt: (c: string, v: any) => { filters.push({ op: "lt", c, v }); return api; },
    maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (onF: any, onR: any) =>
      Promise.resolve(opts?.head
        ? { count: matched().length, data: null, error: null }
        : { count: matched().length, data: matched(), error: null }
      ).then(onF, onR),
  };
  return api;
}

function makeClient() {
  return {
    from: (table: string) => ({
      insert: async (row: Row) => {
        if (table === "muse_waitlist") {
          if (forcedInsertError) return { error: forcedInsertError };
          if ((tables.muse_waitlist ?? []).some((r) => r.email === row.email)) {
            return { error: { code: "23505" } };
          }
          (tables.muse_waitlist ??= []).push(row);
          return { error: null, data: row };
        }
        (tables[table] ??= []).push(row);
        return { error: null, data: row };
      },
      upsert: async (row: Row) => { (tables[table] ??= []).push(row); return { error: null }; },
      select: (_cols: string, opts?: { head?: boolean }) => makeBuilder(table, opts),
    }),
  };
}

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ sent: true })),
  waitlistWelcome: vi.fn(() => ({ to: "a@b.c", subject: "welcome", html: "" })),
}));
vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => makeClient()),
}));

import { POST } from "@/app/api/muse/waitlist/route";
import { checkRate } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

function mockReq(body: unknown, ip = "10.0.0.1") {
  return {
    json: async () => body,
    headers: { get: (n: string) => (n === "x-forwarded-for" ? ip : null) },
  } as any;
}

beforeEach(() => {
  tables.muse_waitlist.length = 0;
  tables.muse_landing_analytics.length = 0;
  tables.muse_qr_events.length = 0;
  forcedInsertError = null;
  vi.clearAllMocks();
  vi.stubEnv("MUSE_DEMO_MODE", "false");
});

describe("waitlist route", () => {
  it("409 demo mode", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await POST(mockReq({ email: "a@b.c" }));
    expect(r.status).toBe(409);
    expect((await r.json()).code).toBe("DEMO_MODE");
  });

  it("400 when email missing or invalid", async () => {
    expect((await POST(mockReq({}))).status).toBe(400);
    expect((await POST(mockReq({ email: "not-an-email" }))).status).toBe(400);
    expect((await POST(mockReq({ email: "name@invalid" }))).status).toBe(400);
    expect((await POST(mockReq({ email: { address: "name@example.com" } }))).status).toBe(400);
  });

  it("429 when rate limited", async () => {
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await POST(mockReq({ email: "ok@example.com" }));
    expect(r.status).toBe(429);
  });

  it("trims and lowercases email before insert and returns success", async () => {
    const r = await POST(mockReq({ email: "  Foo@Example.COM  ", source: "qr_home" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    const row = tables.muse_waitlist.find((x) => x.email);
    expect(row).toBeDefined();
    expect(row!.email).toBe("foo@example.com");
    expect(tables.muse_qr_events.length).toBe(1);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("409 on unique violation (23505)", async () => {
    forcedInsertError = { code: "23505" };
    const r = await POST(mockReq({ email: "dup@example.com" }));
    expect(r.status).toBe(409);
    const body = await r.json();
    expect(body.error).toMatch(/already on waitlist/i);
  });

  it("500 on other insert errors", async () => {
    forcedInsertError = { code: "XX000" };
    const r = await POST(mockReq({ email: "x@example.com" }));
    expect(r.status).toBe(500);
  });
});

describe("waitlist referral loop", () => {
  it("issues a shareable referral code, position and share link", async () => {
    const r = await POST(mockReq({ email: "first@example.com" }));
    expect(r.status).toBe(200);
    const body = await r.json();

    const row = tables.muse_waitlist[0];
    expect(row.id).toEqual(expect.any(String));
    expect(row.created_at).toEqual(expect.any(String));
    // 8 chars from the human-friendly alphabet (no 0/O/1/I/L).
    expect(row.referral_code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(row.referred_by).toBeNull();

    expect(body.referralCode).toBe(row.referral_code);
    expect(body.position).toBe(1);
    expect(body.total).toBe(1);
    expect(body.referrals).toBe(0);
    expect(body.shareUrl).toContain(`?ref=${row.referral_code}`);
    expect(body.shareUrl).toContain("/muse/landing");
  });

  it("attributes a ?ref= signup to the referrer", async () => {
    const referrer = {
      id: "11111111-1111-1111-1111-111111111111",
      created_at: "2026-10-08T00:00:00.000Z",
      referral_code: "REF12345",
      email: "referrer@example.com",
      source: "default",
    };
    tables.muse_waitlist.push(referrer);

    const r = await POST(mockReq({ email: "invited@example.com", ref: "REF12345" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    const invited = tables.muse_waitlist.find((x) => x.email === "invited@example.com");
    expect(invited).toBeDefined();
    expect(invited!.referred_by).toBe(referrer.id);
    // Second signup of the day: you arrive #2, then your own credit is 0.
    expect(body.position).toBe(2);
    expect(body.total).toBe(2);
  });

  it("ignores an unknown ref so a stale link can never block a signup", async () => {
    const r = await POST(mockReq({ email: "plain@example.com", ref: "ZZZZ9999" }));
    expect(r.status).toBe(200);
    const row = tables.muse_waitlist.find((x) => x.email === "plain@example.com");
    expect(row).toBeDefined();
    expect(row!.referred_by).toBeNull();
  });

  it("rejects a malformed ref code with 400", async () => {
    const r = await POST(mockReq({ email: "badref@example.com", ref: "not a code!" }));
    expect(r.status).toBe(400);
    expect(tables.muse_waitlist.length).toBe(0);
  });

  it("does not leak the existing slot when the email repeats (unauth disclosure guard)", async () => {
    await POST(mockReq({ email: "again@example.com" }));
    const code = tables.muse_waitlist[0].referral_code;

    const r = await POST(mockReq({ email: "again@example.com" }));
    expect(r.status).toBe(409);
    const body = await r.json();
    expect(body.code).toBe("ALREADY_ON_LIST");
    // This endpoint is unauthenticated: anyone could post a stranger's address
    // and, before this guard existed, read back its position and referral code.
    // The response must carry neither.
    expect(body).not.toHaveProperty("position");
    expect(body).not.toHaveProperty("total");
    expect(body).not.toHaveProperty("referralCode");
    expect(body).not.toHaveProperty("shareUrl");
    expect(JSON.stringify(body)).not.toContain(code!);
    expect(tables.muse_waitlist.length).toBe(1);
  });

  it("keeps sendEmail fail-open on every path", async () => {
    await POST(mockReq({ email: "a1@example.com" }));
    await POST(mockReq({ email: "a2@example.com", ref: "REF12345" }));
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});
