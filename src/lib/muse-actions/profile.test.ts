import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));

const state: any = { updates: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { profileUpdate } from "@/lib/muse-actions/profile";

function makeQuery() {
  const q: any = {
    update: (v: any) => { state.updates.push(v); return q; },
    eq: () => q,
  };
  return q;
}
function ctx(rest: any) {
  return { sb: { from: () => makeQuery() }, profile: { id: "u1" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.updates = []; });

describe("profileUpdate (mass-assignment whitelist)", () => {
  it("allows whitelisted fields", async () => {
    const r = await profileUpdate(ctx({ name: "Ada", bio: "hi", audience: "creative" }));
    expect((r as Response).status).toBe(200);
    expect(state.updates[0]).toMatchObject({ name: "Ada", bio: "hi", audience: "creative" });
  });

  it("rejects no-updatable-fields with 400", async () => {
    const r = await profileUpdate(ctx({ tier: "muse_pro", verified: true }));
    expect((r as Response).status).toBe(400);
  });

  it("never writes non-whitelisted privilege fields (tier/verified)", async () => {
    await profileUpdate(ctx({ name: "Ada", tier: "sovereign", verified: true, suspended: false }));
    expect(state.updates[0].tier).toBeUndefined();
    expect(state.updates[0].verified).toBeUndefined();
    expect(state.updates[0].suspended).toBeUndefined();
    expect(state.updates[0].name).toBe("Ada");
  });

  it("accepts and canonicalises a valid birthdate", async () => {
    const r = await profileUpdate(ctx({ name: "Ada", birthdate: "1990-05-15" }));
    expect((r as Response).status).toBe(200);
    expect(state.updates[0].birthdate).toBe("1990-05-15");
  });

  it("drops an invalid birthdate (future / under-18 / malformed)", async () => {
    for (const bad of ["2999-01-01", "2015-01-01", "1990-13-40", "not-a-date", 12345]) {
      state.updates = [];
      const r = await profileUpdate(ctx({ name: "Ada", birthdate: bad }));
      expect((r as Response).status).toBe(200);
      expect(state.updates[0].birthdate).toBeUndefined();
    }
  });

  it("400s when birthdate is the only field and it is invalid", async () => {
    const r = await profileUpdate(ctx({ birthdate: "2015-01-01" }));
    expect((r as Response).status).toBe(400);
  });
});
