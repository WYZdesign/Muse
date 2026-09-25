import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getServiceClient: vi.fn() }));

import { getServiceClient } from "@/lib/supabase";
import { GET } from "@/app/api/cron/storage-cleanup/route";

type CleanupJob = {
  id: string;
  bucket: string;
  path: string;
  attempts: number;
  status: string;
  next_attempt_at?: string | null;
  last_error?: string | null;
};

function req(authorization?: string) {
  return { headers: { get: (name: string) => name === "authorization" ? authorization || null : null } } as any;
}

function cleanupService(jobs: Array<Record<string, unknown>>, remove: () => Promise<{ error: unknown }>) {
  const from = () => {
    let update: Record<string, unknown> | null = null;
    const filters: Array<[string, unknown]> = [];
    const query: any = {
      select: () => query,
      update: (values: Record<string, unknown>) => { update = values; return query; },
      eq: (field: string, value: unknown) => { filters.push([field, value]); return query; },
      lte: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: async () => {
        const job = jobs.find((row) => filters.every(([field, value]) => row[field] === value));
        if (job && update) Object.assign(job, update);
        return { data: job || null, error: null };
      },
    };
    query.then = (resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown) => {
      const matched = jobs.filter((row) => filters.every(([field, value]) => row[field] === value));
      if (update) matched.forEach((row) => Object.assign(row, update));
      return Promise.resolve(resolve({ data: matched, error: null }));
    };
    return query;
  };
  return { from, storage: { from: () => ({ remove }) } };
}

describe("storage cleanup cron authorization", () => {
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

  it("does no work in demo mode with valid authorization", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const response = await GET(req("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, demo: true, cleaned: 0 });
  });

  it("claims and marks a due owned object cleanup job done", async () => {
    const jobs: CleanupJob[] = [{ id: "job-1", bucket: "muse-private", path: "profile-1/album/a.jpg", attempts: 0, status: "pending" }];
    vi.mocked(getServiceClient).mockReturnValue(cleanupService(jobs, async () => ({ error: null })) as any);

    const response = await GET(req("Bearer test-cron-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, cleaned: 1, retried: 0, failed: 0, checked: 1 });
    expect(jobs[0]).toMatchObject({ status: "done", attempts: 1, last_error: null });
  });

  it("returns a storage failure to pending with a retry timestamp", async () => {
    const jobs: CleanupJob[] = [{ id: "job-2", bucket: "muse-uploads", path: "profile-1/photo.jpg", attempts: 0, status: "pending" }];
    vi.mocked(getServiceClient).mockReturnValue(cleanupService(jobs, async () => ({ error: new Error("storage unavailable") })) as any);

    const response = await GET(req("Bearer test-cron-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, cleaned: 0, retried: 1, failed: 0, checked: 1 });
    expect(jobs[0]).toMatchObject({ status: "pending", attempts: 1, last_error: "storage unavailable" });
    expect(jobs[0].next_attempt_at).toEqual(expect.any(String));
  });
});
