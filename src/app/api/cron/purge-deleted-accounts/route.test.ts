import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getServiceClient: vi.fn() }));

import { GET } from "@/app/api/cron/purge-deleted-accounts/route";

function req(authorization?: string) {
  return { headers: { get: (name: string) => name === "authorization" ? authorization || null : null } } as any;
}

describe("deleted-account purge cron", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("MUSE_DEMO_MODE", "false");
  });

  it("rejects a request without the cron secret", async () => {
    const response = await GET(req());
    expect(response.status).toBe(401);
  });

  it("is a no-op in demo mode even with valid cron authentication", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const response = await GET(req("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, demo: true, purged: 0 });
  });
});
