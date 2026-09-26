import { describe, it, expect, vi, beforeEach } from "vitest";

const deletes: string[] = [];
let emailResult: { sent: boolean; error?: string } = { sent: true };

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => emailResult),
  betaAccess: vi.fn((email: string) => ({ to: email, subject: "beta", html: "" })),
}));
vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token !== "owner-tok") return { data: { user: null }, error: { message: "bad" } };
        return {
          data: { user: { id: "auth-1", email: "torree.marcel@gmail.com" } },
          error: null,
        };
      }),
    },
    from: (table: string) => {
      if (table === "muse_waitlist") {
        return {
          delete: () => ({
            eq: (_c: string, v: string) => {
              deletes.push(v);
              return Promise.resolve({ error: null }).then(() => undefined).catch(() => undefined);
            },
          }),
        };
      }
      return {};
    },
  })),
}));

import { POST } from "@/app/api/muse/admin/promote-waitlist/route";
import { checkRate } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

function req(body: unknown, token?: string) {
  return {
    json: async () => body,
    headers: {
      get: (n: string) => (n === "authorization" && token ? `Bearer ${token}` : null),
    },
  } as any;
}

describe("admin promote-waitlist route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deletes.length = 0;
    emailResult = { sent: true };
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_OWNER_EMAIL", "torree.marcel@gmail.com");
  });

  it("409 demo mode", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await POST(req({ email: "a@b.c" }, "owner-tok"));
    expect(r.status).toBe(409);
  });

  it("429 when rate limited", async () => {
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await POST(req({ email: "a@b.c" }, "owner-tok"));
    expect(r.status).toBe(429);
  });

  it("401 without token", async () => {
    const r = await POST(req({ email: "a@b.c" }));
    expect(r.status).toBe(401);
  });

  it("401 on invalid token", async () => {
    const r = await POST(req({ email: "a@b.c" }, "bad"));
    expect(r.status).toBe(401);
  });

  it("400 when no email/emails", async () => {
    const r = await POST(req({}, "owner-tok"));
    expect(r.status).toBe(400);
  });

  it("promotes emails, sends beta access, removes from waitlist", async () => {
    const r = await POST(req({ emails: ["Foo@Example.com", "bad-email"] }, "owner-tok"));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.results[0]).toMatchObject({ email: "foo@example.com", sent: true });
    expect(body.results[1].error).toMatch(/Invalid email/i);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(deletes).toContain("foo@example.com");
  });

  it("single email field works", async () => {
    const r = await POST(req({ email: "one@example.com" }, "owner-tok"));
    expect(r.status).toBe(200);
    expect(deletes).toContain("one@example.com");
  });

  it("keeps a member on the waitlist when the access email fails", async () => {
    emailResult = { sent: false, error: "provider unavailable" };
    const r = await POST(req({ email: "retry@example.com" }, "owner-tok"));
    expect(r.status).toBe(200);
    expect((await r.json()).results[0]).toMatchObject({ email: "retry@example.com", sent: false });
    expect(deletes).not.toContain("retry@example.com");
  });

  it("rejects malformed request shapes and oversized batches", async () => {
    expect((await POST(req({ emails: "not-an-array" }, "owner-tok"))).status).toBe(400);
    expect((await POST(req({ emails: Array.from({ length: 51 }, (_, i) => `member${i}@example.com`) }, "owner-tok"))).status).toBe(400);
  });
});
