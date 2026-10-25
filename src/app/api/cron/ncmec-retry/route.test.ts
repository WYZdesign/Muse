import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockTransmit, mockConfigured, mockDemo } = vi.hoisted(() => ({
  mockTransmit: vi.fn(async () => ({ submitted: 2, failed: 1 })),
  mockConfigured: vi.fn(() => true),
  mockDemo: vi.fn(() => false),
}));

vi.mock("@/lib/contentScan", () => ({
  transmitPendingNcmecReports: mockTransmit,
  ncmecConfigured: mockConfigured,
}));
vi.mock("@/lib/demo-mode", () => ({ isDemoMode: mockDemo }));

import { GET } from "@/app/api/cron/ncmec-retry/route";

function req(auth?: string) {
  return {
    headers: { get: (n: string) => (n === "authorization" ? auth ?? null : null) },
  } as unknown as NextRequest;
}

describe("ncmec-retry cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "s3cret");
    mockDemo.mockReturnValue(false);
    mockTransmit.mockResolvedValue({ submitted: 2, failed: 1 });
  });

  it("401 without the bearer secret", async () => {
    const r = await GET(req());
    expect(r.status).toBe(401);
    expect(mockTransmit).not.toHaveBeenCalled();
  });

  it("401 with the wrong secret", async () => {
    const r = await GET(req("Bearer nope"));
    expect(r.status).toBe(401);
  });

  it("401 when CRON_SECRET is unset (fail closed)", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const r = await GET(req("Bearer undefined"));
    expect(r.status).toBe(401);
    expect(mockTransmit).not.toHaveBeenCalled();
  });

  it("no-ops in demo mode", async () => {
    mockDemo.mockReturnValue(true);
    const r = await GET(req("Bearer s3cret"));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ demo: true, submitted: 0, failed: 0 });
    expect(mockTransmit).not.toHaveBeenCalled();
  });

  it("returns the transmission counts", async () => {
    const r = await GET(req("Bearer s3cret"));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ success: true, configured: true, submitted: 2, failed: 1 });
    expect(mockTransmit).toHaveBeenCalledTimes(1);
  });

  it("500 when transmission throws", async () => {
    mockTransmit.mockRejectedValueOnce(new Error("boom"));
    const r = await GET(req("Bearer s3cret"));
    expect(r.status).toBe(500);
  });
});
