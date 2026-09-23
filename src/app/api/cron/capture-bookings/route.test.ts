import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getServiceClient: vi.fn() }));

import { GET } from "@/app/api/cron/capture-bookings/route";

function req(authorization?: string) {
  return { headers: { get: (name: string) => name === "authorization" ? authorization || null : null } } as any;
}

describe("capture-bookings cron authorization", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("MUSE_DEMO_MODE", "false");
  });

  it("rejects missing and incorrect credentials", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
  });

  it("fails closed when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req("Bearer undefined"))).status).toBe(401);
  });

  it("does no work in demo mode with valid credentials", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const response = await GET(req("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, demo: true, captured: 0 });
  });
});
