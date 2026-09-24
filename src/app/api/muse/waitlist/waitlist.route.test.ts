import { describe, it, expect, vi, beforeEach } from "vitest";

const inserts: any[] = [];
let insertError: { code?: string } | null = null;

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ sent: true })),
  waitlistWelcome: vi.fn(() => ({ to: "a@b.c", subject: "welcome", html: "" })),
}));
vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "muse_waitlist") {
        return {
          insert: async (row: any) => {
            if (insertError) return { error: insertError };
            inserts.push(row);
            return { error: null };
          },
        };
      }
      if (table === "muse_landing_analytics") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { signups: 3 }, error: null }),
            }),
          }),
          upsert: async (row: any) => {
            inserts.push({ __analytics: row });
            return { error: null };
          },
        };
      }
      if (table === "muse_qr_events") {
        return {
          insert: async (row: any) => {
            inserts.push({ __qr: row });
            return { error: null };
          },
        };
      }
      return { insert: async () => ({ error: null }) };
    },
  })),
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

describe("waitlist route", () => {
  beforeEach(() => {
    inserts.length = 0;
    insertError = null;
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
  });

  it("409 demo mode", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await POST(mockReq({ email: "a@b.c" }));
    expect(r.status).toBe(409);
    expect((await r.json()).code).toBe("DEMO_MODE");
  });

  it("400 when email missing or invalid", async () => {
    expect((await POST(mockReq({}))).status).toBe(400);
    expect((await POST(mockReq({ email: "not-an-email" }))).status).toBe(400);
  });

  it("429 when rate limited", async () => {
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await POST(mockReq({ email: "ok@example.com" }));
    expect(r.status).toBe(429);
  });

  it("inserts lowercased email and returns success", async () => {
    const r = await POST(mockReq({ email: "Foo@Example.COM", source: "qr_home" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    const row = inserts.find((x) => x.email);
    expect(row.email).toBe("foo@example.com");
    expect(inserts.some((x) => x.__qr)).toBe(true);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("409 on unique violation (23505)", async () => {
    insertError = { code: "23505" };
    const r = await POST(mockReq({ email: "dup@example.com" }));
    expect(r.status).toBe(409);
    const body = await r.json();
    expect(body.error).toMatch(/already on waitlist/i);
  });

  it("500 on other insert errors", async () => {
    insertError = { code: "XX000" };
    const r = await POST(mockReq({ email: "x@example.com" }));
    expect(r.status).toBe(500);
  });
});
