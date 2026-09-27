import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSb, tableCalls, type SbCall } from "@/test-support/sb";

const webpush = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  generateVAPIDKeys: vi.fn(() => ({ publicKey: "gen-pub", privateKey: "gen-priv" })),
  sendNotification: vi.fn(async () => ({ statusCode: 201 })),
}));
vi.mock("web-push", () => ({ default: webpush }));

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
}));

interface State {
  subs: any[] | null;
  subsError: any;
  sends: any[];
  profile: any;
  deleted: any[];
}
const state: State = { subs: [], subsError: null, sends: [], profile: null, deleted: [] };

function installSb() {
  (globalThis as any).__sbMock = createSb((table, calls) => {
    if (calls.some((c) => c.method === "delete")) {
      state.deleted.push(calls.find((c) => c.method === "delete")!.args[0]);
      return { data: null, error: null };
    }
    if (table === "muse_push_subscriptions") return { data: state.subs, error: state.subsError };
    if (table === "muse_profiles") return { data: state.profile, error: null };
    return { data: null, error: null };
  });
}

async function loadPush(env: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return await import("./push");
}

beforeEach(() => {
  webpush.setVapidDetails.mockClear();
  webpush.generateVAPIDKeys.mockClear();
  webpush.sendNotification.mockClear();
  webpush.sendNotification.mockResolvedValue({ statusCode: 201 });
  state.subs = [];
  state.subsError = null;
  state.sends = [];
  state.profile = null;
  state.deleted = [];
  installSb();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const sub = { endpoint: "https://push/e1", p256dh: "p1", auth: "a1" };

describe("push module config", () => {
  it("exposes the configured VAPID public key", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub-123", VAPID_PRIVATE_KEY: "priv-123" });
    expect(mod.getVapidPublicKey()).toBe("pub-123");
    expect(webpush.setVapidDetails).toHaveBeenCalledTimes(1);
  });

  it("does not call setVapidDetails when keys are incomplete", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub-only" });
    expect(mod.getVapidPublicKey()).toBe("pub-only");
    expect(webpush.setVapidDetails).not.toHaveBeenCalled();
  });

  it("generateVapidKeys returns the web-push key pair", async () => {
    const mod = await loadPush({});
    expect(mod.generateVapidKeys()).toEqual({ publicKey: "gen-pub", privateKey: "gen-priv" });
  });
});

describe("sendPushNotification", () => {
  it("fails with a clear error when VAPID keys are not configured", async () => {
    const mod = await loadPush({});
    const r = await mod.sendPushNotification(sub, { title: "hi", body: "there" });
    expect(r).toEqual({ success: false, error: "VAPID keys not configured" });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("sends the serialized payload with vapid details and a 24h TTL", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", VAPID_SUBJECT: "mailto:x@y.z" });
    const r = await mod.sendPushNotification(sub, { title: "T", body: "B" });
    expect(r).toEqual({ success: true });
    const [subscription, body, opts] = webpush.sendNotification.mock.calls[0] as any[];
    expect(subscription).toEqual({ endpoint: sub.endpoint, keys: { p256dh: "p1", auth: "a1" } });
    expect(JSON.parse(body)).toMatchObject({ title: "T", body: "B" });
    expect(opts.TTL).toBe(24 * 60 * 60);
    expect(opts.vapidDetails).toMatchObject({ subject: "mailto:x@y.z", publicKey: "pub", privateKey: "priv" });
  });

  it("maps 410/404 responses to subscription_expired", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    webpush.sendNotification.mockRejectedValueOnce({ statusCode: 410 });
    expect((await mod.sendPushNotification(sub, { title: "T", body: "B" })).error).toBe("subscription_expired");
    webpush.sendNotification.mockRejectedValueOnce({ statusCode: 404 });
    expect((await mod.sendPushNotification(sub, { title: "T", body: "B" })).error).toBe("subscription_expired");
  });

  it("reports the underlying message for other send failures", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    webpush.sendNotification.mockRejectedValueOnce(new Error("socket hangup"));
    expect((await mod.sendPushNotification(sub, { title: "T", body: "B" })).error).toBe("socket hangup");
  });

  it("falls back to a generic message when the error has none", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    webpush.sendNotification.mockRejectedValueOnce({});
    expect((await mod.sendPushNotification(sub, { title: "T", body: "B" })).error).toBe("Push failed");
  });
});

describe("sendPushToUser", () => {
  it("returns zeros when the user has no subscriptions", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    state.subs = [];
    expect(await mod.sendPushToUser("u1", { title: "t", body: "b" })).toEqual({ sent: 0, failed: 0, expired: 0 });
  });

  it("returns zeros when the subscription read errors", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    state.subsError = new Error("db down");
    expect(await mod.sendPushToUser("u1", { title: "t", body: "b" })).toEqual({ sent: 0, failed: 0, expired: 0 });
  });

  it("counts sent and prunes expired subscriptions", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    state.subs = [
      { endpoint: "e1", p256dh: "p", auth: "a" },
      { endpoint: "e2", p256dh: "p", auth: "a" },
    ];
    webpush.sendNotification
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce({ statusCode: 410 });
    const r = await mod.sendPushToUser("u1", { title: "t", body: "b" });
    expect(r).toEqual({ sent: 1, failed: 0, expired: 1 });
    const deleted = tableCalls((globalThis as any).__sbMock.__log, "muse_push_subscriptions")
      .filter((c: SbCall) => c.method === "delete");
    expect(deleted).toHaveLength(1);
    expect(deleted[0].args[0]).toBeUndefined();
  });

  it("counts a non-expiry failure as failed", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    state.subs = [{ endpoint: "e1", p256dh: "p", auth: "a" }];
    webpush.sendNotification.mockRejectedValueOnce(new Error("boom"));
    expect(await mod.sendPushToUser("u1", { title: "t", body: "b" })).toEqual({ sent: 0, failed: 1, expired: 0 });
  });
});

describe("pushToProfile", () => {
  it("sends when the recipient has no push opt-out", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    state.profile = { preferences: { notifications: { push: true } } };
    state.subs = [{ endpoint: "e1", p256dh: "p", auth: "a" }];
    await mod.pushToProfile("u1", "Title", "Body", "/muse");
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it("does not send when push notifications are disabled", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    state.profile = { preferences: { notifications: { push: false } } };
    state.subs = [{ endpoint: "e1", p256dh: "p", auth: "a" }];
    await mod.pushToProfile("u1", "Title", "Body");
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("fails open when the preferences read throws", async () => {
    const mod = await loadPush({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    (globalThis as any).__sbMock = createSb((table) => {
      if (table === "muse_profiles") throw new Error("prefs down");
      if (table === "muse_push_subscriptions") return { data: [{ endpoint: "e1", p256dh: "p", auth: "a" }], error: null };
      return { data: null, error: null };
    });
    await mod.pushToProfile("u1", "Title", "Body");
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });
});
