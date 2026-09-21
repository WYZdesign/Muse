import { describe, it, expect, vi, beforeEach } from "vitest";

// Must run BEFORE the route module is evaluated — it reads LIVEKIT_* into
// module-level constants at import time, and ESM imports are hoisted.
vi.hoisted(() => {
  process.env.LIVEKIT_URL = "wss://test.livekit.cloud";
  process.env.LIVEKIT_API_KEY = "key";
  process.env.LIVEKIT_API_SECRET = "secret";
});

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: async () => (globalThis as any).__authUser } },
  getServiceClient: () => (globalThis as any).__sbMock,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/http", () => ({
  safeServerError: (e: any, ctx: string) =>
    ({ status: 500, json: async () => ({ error: `${ctx} failed` }) }) as any,
}));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => {} }));
vi.mock("@/lib/muse-actions/shared", async () => {
  const actual = await vi.importActual<any>("@/lib/muse-actions/shared");
  return { ...actual, emailProfile: async () => {} };
});
vi.mock("livekit-server-sdk", () => ({
  AccessToken: class {
    addGrant() { /* noop */ }
    async toJwt() { return "jwt_test"; }
  },
  RoomServiceClient: class {
    async createRoom() { /* noop */ }
    async deleteRoom() { /* noop */ }
  },
}));

import { POST } from "@/app/api/muse/call/route";

const ME = "11111111-1111-1111-1111-111111111111";
const PEER = "22222222-2222-2222-2222-222222222222";
const COMM = "33333333-3333-3333-3333-333333333333";

const state: any = { tables: {}, inserts: [] };

(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      select: () => q,
      insert: (v: any) => { state.inserts.push({ tbl, v }); return q; },
      update: (v: any) => { state.inserts.push({ tbl, v }); return q; },
      eq: () => q,
      in: () => q,
      or: () => q,
      gte: () => q,
      lt: () => q,
      order: () => q,
      limit: () => q,
      single: async () => ({ data: state.tables[tbl] ?? null, error: null }),
      maybeSingle: async () => ({ data: state.tables[tbl] ?? null, error: null }),
    };
    q.then = (resolve: any) => resolve({ data: state.tables[tbl] ?? null, error: null });
    return q;
  },
};

function req(body: unknown, token = "tok") {
  return {
    headers: {
      get: (n: string) =>
        n.toLowerCase() === "authorization" ? "Bearer " + token
          : n.toLowerCase() === "content-type" ? "application/json"
            : null,
    },
    json: async () => body,
  } as any;
}

beforeEach(() => {
  state.tables = {};
  state.inserts = [];
  // Authenticated, age-verified caller by default.
  (globalThis as any).__authUser = { data: { user: { id: "auth-1" } } };
  state.tables.muse_profiles = { id: ME, name: "Tester", email: "t@example.com", suspended: false };
});

describe("call route", () => {
  it("rejects unauthenticated callers with 401", async () => {
    (globalThis as any).__authUser = { data: { user: null } };
    const r = await POST(req({ action: "start", toId: PEER, kind: "voice" }));
    expect(r.status).toBe(401);
  });

  it("rejects an invalid target id", async () => {
    const r = await POST(req({ action: "start", toId: "nope", kind: "voice" }));
    expect(r.status).toBe(400);
  });

  it("starts a call and returns a token + callId", async () => {
    // both parties age-verified, no block, no busy call
    const now = new Date().toISOString();
    state.tables.muse_profiles = [
      { id: ME, name: "Tester", age_verified: true, age_verified_at: now },
      { id: PEER, age_verified: true, age_verified_at: now },
    ];
    const r = await POST(req({ action: "start", toId: PEER, kind: "video" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.token).toBe("jwt_test");
    expect(body.url).toBe("wss://test.livekit.cloud");
    expect(body.kind).toBe("video");
    expect(body.room).toContain("muse-");
  });

  it("blocks a call when the caller is not age verified", async () => {
    // The .in() lookup returns the caller without verification.
    state.tables.muse_profiles = [
      { id: ME, age_verified: false, age_verified_at: null },
      { id: PEER, age_verified: true, age_verified_at: new Date().toISOString() },
    ];
    const r = await POST(req({ action: "start", toId: PEER, kind: "voice" }));
    expect(r.status).toBe(403);
    const body = await r.json();
    expect(body.code).toBe("AGE_VERIFICATION_REQUIRED");
  });

  it("records a lifecycle update", async () => {
    const r = await POST(req({ action: "answer", toId: PEER, kind: "voice", callId: "44444444-4444-4444-4444-444444444444" }));
    expect(r.status).toBe(200);
    expect(state.inserts.some((i: any) => i.tbl === "muse_calls")).toBe(true);
  });

  it("rejects a lifecycle update without a valid callId", async () => {
    const r = await POST(req({ action: "answer", toId: PEER, kind: "voice", callId: "bad" }));
    expect(r.status).toBe(400);
  });

  it("returns call history", async () => {
    const r = await POST(req({ action: "history", toId: PEER, kind: "voice" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.calls)).toBe(true);
  });

  it("requires membership for a community voice room", async () => {
    state.tables.muse_community_members = null; // not a member
    const r = await POST(req({ action: "start-room", communityId: COMM }));
    expect(r.status).toBe(403);
  });

  it("rejects an unknown action", async () => {
    const r = await POST(req({ action: "nonsense", toId: PEER }));
    expect(r.status).toBe(400);
  });
});
