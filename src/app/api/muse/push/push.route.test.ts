import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  checkRateUser: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/push", () => ({
  getVapidPublicKey: vi.fn(() => "vapid-public"),
  sendPushToUser: vi.fn(async () => ({ success: true, delivered: 1 })),
}));
vi.mock("@/lib/muse-actions/shared", () => ({
  isAdminEmail: vi.fn((email?: string) => email === "admin@example.com"),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async (token: string) =>
        token === "bad"
          ? { data: { user: null }, error: { message: "invalid" } }
          : { data: { user: { id: "auth-1", email: "user@example.com" } }, error: null },
      ),
    },
  },
  getServiceClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "muse_profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => (globalThis as any).__profile || { data: null, error: null },
            }),
          }),
        };
      }
      if (table === "muse_push_subscriptions") {
        return {
          upsert: (row: any) => ({
            select: async () =>
              (globalThis as any).__pushUpsertError
                ? { data: null, error: (globalThis as any).__pushUpsertError }
                : { data: [row], error: null },
          }),
          delete: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      return {};
    },
  })),
}));

import { GET, POST } from "@/app/api/muse/push/route";
import { checkRate } from "@/lib/rate-limit";
import { sendPushToUser, getVapidPublicKey } from "@/lib/push";

function req(body: unknown, headers: Record<string, string> = {}) {
  return {
    json: async () => body,
    headers: { get: (n: string) => headers[n] ?? null },
  } as any;
}

const goodSub = { endpoint: "https://push.example/e", p256dh: "p", auth: "a" };

describe("push route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    (globalThis as any).__profile = { data: { id: "p1", tier: "free" }, error: null };
    (globalThis as any).__pushUpsertError = null;
  });

  it("GET returns VAPID public key", async () => {
    const r = await GET();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ publicKey: "vapid-public" });
    expect(getVapidPublicKey).toHaveBeenCalled();
  });

  it("409 demo mode on POST", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await POST(req({ action: "subscribe", subscription: goodSub, access_token: "tok" }));
    expect(r.status).toBe(409);
  });

  it("401 without access token", async () => {
    const r = await POST(req({ action: "subscribe", subscription: goodSub }));
    expect(r.status).toBe(401);
  });

  it("401 on invalid token", async () => {
    const r = await POST(req({ action: "subscribe", subscription: goodSub, access_token: "bad" }));
    expect(r.status).toBe(401);
  });

  it("404 when profile missing", async () => {
    (globalThis as any).__profile = { data: null, error: null };
    const r = await POST(req({ action: "subscribe", subscription: goodSub, access_token: "tok" }));
    expect(r.status).toBe(404);
  });

  it("400 missing action/subscription fields", async () => {
    const r = await POST(req({ access_token: "tok" }));
    expect(r.status).toBe(400);
  });

  it("subscribe success", async () => {
    const r = await POST(
      req({ action: "subscribe", subscription: goodSub, access_token: "tok" }),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).success).toBe(true);
  });

  it("subscribe treats 23505 unique violation as success", async () => {
    (globalThis as any).__pushUpsertError = { code: "23505" };
    const r = await POST(
      req({ action: "subscribe", subscription: goodSub, access_token: "tok" }),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).success).toBe(true);
  });

  it("unsubscribe success", async () => {
    const r = await POST(
      req({ action: "unsubscribe", subscription: goodSub, access_token: "tok" }),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).success).toBe(true);
  });

  it("send forbids targeting another user", async () => {
    const r = await POST(
      req({ action: "send", userId: "someone-else", payload: { title: "t", body: "b" }, access_token: "tok" }),
    );
    expect(r.status).toBe(403);
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("send allows self", async () => {
    const r = await POST(
      req({ action: "send", userId: "p1", payload: { title: "t", body: "b" }, access_token: "tok" }),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).success).toBe(true);
    expect(sendPushToUser).toHaveBeenCalledWith("p1", { title: "t", body: "b" });
  });

  it("unknown action → 400", async () => {
    const r = await POST(
      req({ action: "nope", subscription: goodSub, access_token: "tok" }),
    );
    expect(r.status).toBe(400);
  });

  it("429 when send rate limited", async () => {
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await POST(
      req({ action: "send", userId: "p1", payload: { title: "t", body: "b" }, access_token: "tok" }),
    );
    expect(r.status).toBe(429);
  });
});
