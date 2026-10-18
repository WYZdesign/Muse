import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { ActionContext } from "@/lib/muse-actions/shared";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: unknown[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => ({}),
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { talentListCreate, talentListDelete, talentListItemSet, TALENT_LIST_CAP } from "@/lib/muse-actions/misc";

const UUID = "11111111-1111-4111-8111-111111111111";
const req = {} as unknown as NextRequest;

/** Minimal query object that is both chainable and awaitable (for head counts). */
function listSb(opts: { count?: number; owned?: boolean; calls?: string[] } = {}) {
  const chain = {
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    maybeSingle: () => Promise.resolve({ data: opts.owned === false ? null : { id: UUID, name: "Shortlist" } }),
    then: (res: (v: { count?: number; data?: unknown[]; error?: null }) => unknown) =>
      Promise.resolve({ count: opts.count ?? 0, data: [], error: null }).then(res),
  };
  const del = {
    eq: () => del,
    then: (res: (v: { error?: null }) => unknown) => {
      opts.calls?.push("delete");
      return Promise.resolve({ error: null }).then(res);
    },
  };
  return {
    from: () => ({
      select: () => chain,
      insert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: UUID, name: "New" }, error: null }) }) }),
      delete: () => del,
      upsert: () => {
        opts.calls?.push("upsert");
        return Promise.resolve({ error: null });
      },
    }),
  } as unknown as ActionContext["sb"];
}

const act = (sb: ActionContext["sb"], rest: Record<string, unknown>, tier = "free") =>
  ({ sb, profile: { id: "me1", name: "Ada", tier }, rest, ip: "10.0.0.1", req } as ActionContext);

describe("saved-talent lists", () => {
  it("requires a name to create a list", async () => {
    const r = await talentListCreate(act(listSb(), { name: "   " }));
    expect((r as Response).status).toBe(400);
  });

  it("blocks a non-Studio account at the cap", async () => {
    const r = await talentListCreate(act(listSb({ count: TALENT_LIST_CAP }), { name: "Shortlist" }));
    expect((r as Response).status).toBe(429);
    const body = await (r as Response).json();
    expect(body.code).toBe("TALENT_LIST_LIMIT");
    expect(body.limit).toBe(TALENT_LIST_CAP);
  });

  it("never caps Musa Studio", async () => {
    const r = await talentListCreate(act(listSb({ count: 999 }), { name: "Shortlist" }, "muse_studio"));
    expect((r as Response).status).toBe(200);
  });

  it("refuses to delete a list the caller does not own", async () => {
    const r = await talentListDelete(act(listSb({ owned: false }), { listId: UUID }));
    expect((r as Response).status).toBe(404);
  });

  it("rejects invalid ids when setting an item", async () => {
    const r = await talentListItemSet(act(listSb(), { listId: "nope", profileId: UUID }));
    expect((r as Response).status).toBe(400);
  });

  it("upserts a member and removes one on request", async () => {
    const upserts: string[] = [];
    await talentListItemSet(act(listSb({ calls: upserts }), { listId: UUID, profileId: UUID }));
    expect(upserts).toContain("upsert");

    const dels: string[] = [];
    const r = await talentListItemSet(act(listSb({ calls: dels }), { listId: UUID, profileId: UUID, remove: true }));
    expect((r as Response).status).toBe(200);
    expect(dels).toContain("delete");
  });
});
