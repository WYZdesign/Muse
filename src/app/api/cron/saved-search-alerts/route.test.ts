import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getServiceClient: vi.fn() }));
vi.mock("@/lib/muse-actions/misc", () => ({ savedSearchAlerts: vi.fn() }));

import { getServiceClient } from "@/lib/supabase";
import { savedSearchAlerts } from "@/lib/muse-actions/misc";
import { GET } from "@/app/api/cron/saved-search-alerts/route";

function req(authorization?: string) {
  return { headers: { get: (name: string) => name === "authorization" ? authorization || null : null } } as any;
}

// Supabase query builders are thenable — resolving the await yields the rows.
function listService(rows: Array<Record<string, unknown>>) {
  const query: any = {
    select: () => query,
    order: () => query,
    limit: () => query,
    then: (resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: rows, error: null })),
  };
  return { from: () => query };
}

describe("saved-search-alerts cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    vi.mocked(getServiceClient).mockReturnValue(listService([]) as any);
  });

  it("rejects missing and incorrect credentials", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
  });

  it("fails closed when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req("Bearer undefined"))).status).toBe(401);
  });

  it("does no work in demo mode with valid authorization", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const response = await GET(req("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, demo: true, users: 0, alerts: 0 });
  });

  it("dedupes owners and runs the per-user handler once each", async () => {
    vi.mocked(getServiceClient).mockReturnValue(listService([{ user_id: "u1" }, { user_id: "u1" }, { user_id: "u2" }]) as any);
    vi.mocked(savedSearchAlerts).mockImplementation(async ({ profile }: any) => ({
      json: async () => ({ alerts: profile.id === "u1" ? [{ searchId: "s1", name: "N", newMatches: [] }] : [] }),
    }) as any);

    const response = await GET(req("Bearer test-cron-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, users: 1, alerts: 1, checked: 2 });
    expect(savedSearchAlerts).toHaveBeenCalledTimes(2);
  });

  it("continues the sweep when one user's alert fails", async () => {
    vi.mocked(getServiceClient).mockReturnValue(listService([{ user_id: "bad" }, { user_id: "ok" }]) as any);
    vi.mocked(savedSearchAlerts).mockImplementation(async ({ profile }: any) => {
      if (profile.id === "bad") throw new Error("boom");
      return { json: async () => ({ alerts: [{ searchId: "s", name: "N", newMatches: [] }] }) } as any;
    });

    const response = await GET(req("Bearer test-cron-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, users: 1, alerts: 1, checked: 2 });
  });
});
