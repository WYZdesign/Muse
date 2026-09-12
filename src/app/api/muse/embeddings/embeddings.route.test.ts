import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: async (token: string) => (globalThis as any).__authUser || { data: { user: null } } } },
  getServiceClient: () => (globalThis as any).__sbMock,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/ai", () => ({
  embedText: async (text: string) => [0.1, 0.2, 0.3],
  cosineSimilarity: (a: number[], b: number[]) => 0.85,
  aiEnabled: () => true,
}));

import { POST } from "@/app/api/muse/embeddings/route";

(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      select: () => q,
      not: () => q,
      limit: () => q,
      eq: () => q,
      data: tbl === "muse_profiles" ? [
        { id: "p1", name: "Alice", type: "creator", embedding: [0.1, 0.2, 0.3] },
        { id: "p2", name: "Bob", type: "collaborator", embedding: [0.4, 0.5, 0.6] },
      ] : null,
      error: null,
      count: 10,
    };
    q.then = (resolve: any) => resolve({ data: q.data, error: q.error, count: q.count });
    return q;
  },
};

function req(body: unknown) {
  return {
    headers: {
      get: (n: string) =>
        n.toLowerCase() === "authorization"
          ? "Bearer tok"
          : n.toLowerCase() === "content-type"
            ? "application/json"
            : null,
    },
    json: async () => body,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).__authUser = { data: { user: { id: "u1" } } };
});

describe("embeddings route", () => {
  it("rejects missing auth with 401", async () => {
    (globalThis as any).__authUser = { data: { user: null } };
    const r = await POST(req({ action: "embed", text: "hello" }));
    expect(r.status).toBe(401);
  });

  it("embed returns vector and dims", async () => {
    const r = await POST(req({ action: "embed", text: "hello world" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.vector).toEqual([0.1, 0.2, 0.3]);
    expect(body.dims).toBe(3);
  });

  it("embed rejects missing text", async () => {
    const r = await POST(req({ action: "embed" }));
    expect(r.status).toBe(400);
  });

  it("search returns results", async () => {
    const r = await POST(req({ action: "search", vector: [0.1, 0.2, 0.3] }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.results).toBeDefined();
    expect(Array.isArray(body.results)).toBe(true);
  });

  it("batch-embed rejects empty array", async () => {
    const r = await POST(req({ action: "batch-embed", texts: [] }));
    expect(r.status).toBe(400);
  });

  it("batch-embed rejects >20 texts", async () => {
    const r = await POST(req({ action: "batch-embed", texts: Array(21).fill("text") }));
    expect(r.status).toBe(400);
  });

  it("info returns stats", async () => {
    const r = await POST(req({ action: "info" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.aiEnabled).toBe(true);
    expect(body.totalProfiles).toBe(10);
  });

  it("unknown action returns 400", async () => {
    const r = await POST(req({ action: "bogus" }));
    expect(r.status).toBe(400);
  });
});
