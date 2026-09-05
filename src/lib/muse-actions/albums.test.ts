import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));

const state: any = { rows: {}, upserts: [], inserts: [], deletes: [], updates: [], singles: {} };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { albumDelete, albumUpdate, albumView, albumLike, albumGrantAccess } from "@/lib/muse-actions/albums";

function makeQuery() {
  const q: any = {
    select: (cols: any) => {
      // Capture the columns so maybeSingle returns the right row per table
      q._cols = cols;
      return q;
    },
    eq: () => q, in: () => q, limit: () => q, delete: () => q, or: () => q,
    upsert: (v: any) => { state.upserts.push(v); return q; },
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
    maybeSingle: async () => ({ data: q._single ?? null }),
    single: async () => ({ data: q._single ?? null }),
  };
  return q;
}

function ctx(rest: any, single: any) {
  const q = makeQuery();
  q._single = single;
  return { sb: { from: () => q }, profile: { id: "owner1" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.rows = {}; state.upserts = []; state.inserts = []; state.deletes = []; state.updates = []; });

describe("albums actions (ownership gate)", () => {
  it("albumUpdate rejects a non-owner (403)", async () => {
    const r = await albumUpdate(ctx({ albumId: "a1" }, { profile_id: "someone-else" }));
    expect((r as Response).status).toBe(403);
  });

  it("albumUpdate allows the owner (200)", async () => {
    const r = await albumUpdate(ctx({ albumId: "a1", title: "New" }, { profile_id: "owner1" }));
    expect((r as Response).status).toBe(200);
  });

  it("albumDelete rejects a non-owner (403)", async () => {
    const r = await albumDelete(ctx({ albumId: "a1" }, { profile_id: "someone-else" }));
    expect((r as Response).status).toBe(403);
  });

  it("albumDelete requires albumId (400)", async () => {
    const r = await albumDelete(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("albumGrantAccess requires albumId + viewerProfileId (400)", async () => {
    const r = await albumGrantAccess(ctx({ albumId: "a1" }, { profile_id: "owner1" }));
    expect((r as Response).status).toBe(400);
  });

  it("albumView returns 404 when album not found", async () => {
    const r = await albumView(ctx({ albumId: "a1" }, null));
    expect((r as Response).status).toBe(404);
  });

  it("albumLike returns 404 when album not found", async () => {
    const r = await albumLike(ctx({ albumId: "a1" }, null));
    expect((r as Response).status).toBe(404);
  });
});
