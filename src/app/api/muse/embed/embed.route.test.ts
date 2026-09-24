import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/ai", () => ({
  embedText: vi.fn(async () => [0.1, 0.2]),
  aiEnabled: vi.fn(() => true),
}));
vi.mock("@/lib/aiDocs", () => ({
  seedKnowledgeBase: vi.fn(async () => ({ seeded: 1 })),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async (token: string) =>
        token === "bad"
          ? { data: { user: null }, error: null }
          : { data: { user: { id: "auth-1" } }, error: null },
      ),
    },
  },
  getServiceClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "muse_profiles") {
        return {
          select: (cols?: string, opts?: any) => {
            if (opts?.count === "exact") {
              return {
                not: () => ({ count: 5 }),
                count: 10,
                then: (resolve: any) => resolve({ count: 10 }),
              };
            }
            return {
              eq: () => ({
                maybeSingle: async () => (globalThis as any).__profile || { data: null, error: null },
              }),
              limit: async () => ({ data: (globalThis as any).__profileList || [], error: null }),
              maybeSingle: async () => (globalThis as any).__profile || { data: null, error: null },
              not: () => ({ count: 5 }),
              count: 10,
              then: (resolve: any) => resolve({ count: 10 }),
            };
          },
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "muse_prompt_responses") {
        return {
          select: () => ({
            eq: () => ({ limit: async () => ({ data: [], error: null }) }),
          }),
        };
      }
      if (table === "muse_ai_docs") {
        return {
          select: () => ({
            count: 3,
            then: (resolve: any) => resolve({ count: 3 }),
          }),
        };
      }
      return {};
    },
  })),
}));

import { POST } from "@/app/api/muse/embed/route";
import { checkRate } from "@/lib/rate-limit";
import { aiEnabled, embedText } from "@/lib/ai";
import { seedKnowledgeBase } from "@/lib/aiDocs";

function req(body: unknown, headers: Record<string, string> = {}) {
  return {
    json: async () => body,
    headers: { get: (n: string) => headers[n] ?? null },
  } as any;
}

describe("embed route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    vi.stubEnv("ADMIN_EMAILS", "");
    (aiEnabled as any).mockReturnValue(true);
    (embedText as any).mockResolvedValue([0.1, 0.2]);
    (globalThis as any).__profile = {
      data: { id: "p1", name: "Me", email: "user@example.com", tier: "free", type: "creator", bio: "b", styles: [], looking: [] },
      error: null,
    };
    (globalThis as any).__profileList = [{ id: "p1" }, { id: "p2" }];
  });

  it("409 demo mode", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await POST(req({ action: "status" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(409);
  });

  it("429 when rate limited", async () => {
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await POST(req({ action: "status" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(429);
  });

  it("401 without auth", async () => {
    const r = await POST(req({ action: "status" }));
    expect(r.status).toBe(401);
  });

  it("404 profile missing", async () => {
    (globalThis as any).__profile = { data: null, error: null };
    const r = await POST(req({ action: "status" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(404);
  });

  it("embed-profile success for own profile", async () => {
    const r = await POST(req({ action: "embed-profile" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.dims).toBe(2);
  });

  it("embed-all forbidden for non-admin", async () => {
    const r = await POST(req({ action: "embed-all" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe("Admin only");
  });

  it("embed-all 503 when AI disabled", async () => {
    vi.stubEnv("ADMIN_EMAILS", "user@example.com");
    (aiEnabled as any).mockReturnValue(false);
    const r = await POST(req({ action: "embed-all" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(503);
  });

  it("seed-kb forbidden for non-admin", async () => {
    const r = await POST(req({ action: "seed-kb" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(403);
    expect(seedKnowledgeBase).not.toHaveBeenCalled();
  });

  it("status returns coverage stats", async () => {
    const r = await POST(req({ action: "status" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.totalProfiles).toBe(10);
    expect(body.embeddedProfiles).toBe(5);
    expect(body.knowledgeBaseDocs).toBe(3);
    expect(body.aiEnabled).toBe(true);
  });

  it("unknown action → 400", async () => {
    const r = await POST(req({ action: "nope" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(400);
  });
});
