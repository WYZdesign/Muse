import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/ai", () => ({
  embedText: vi.fn(async () => null),
  cosineSimilarity: vi.fn(() => 0),
  aiEnabled: vi.fn(() => false),
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
          select: () => ({
            eq: () => ({
              maybeSingle: async () => (globalThis as any).__profile || { data: null, error: null },
            }),
            limit: async () => ({ data: (globalThis as any).__candidates || [], error: null }),
          }),
        };
      }
      if (table === "muse_blocks") {
        return {
          select: () => ({
            or: async () => ({ data: [], error: null }),
          }),
        };
      }
      return {};
    },
  })),
}));

import { GET } from "@/app/api/muse/match/route";
import { checkRate } from "@/lib/rate-limit";

function req(headers: Record<string, string> = {}, search = "") {
  return {
    headers: { get: (n: string) => headers[n] ?? null },
    nextUrl: new URL(`https://muse.test/api/muse/match${search}`),
  } as any;
}

describe("match route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    (globalThis as any).__profile = {
      data: {
        id: "me",
        name: "Me",
        type: "creator",
        bio: "b",
        styles: [],
        looking: [],
        zodiac: null,
        chinese: null,
        mbti: null,
        life_path: null,
        avatar: "a.jpg",
        loc: "LA",
        tier: "free",
        embedding: null,
      },
      error: null,
    };
    (globalThis as any).__candidates = [
      {
        id: "c1",
        name: "Other",
        type: "creator",
        bio: "x",
        styles: [],
        looking: [],
        zodiac: null,
        chinese: null,
        mbti: null,
        life_path: null,
        avatar: "b.jpg",
        loc: "NY",
        photos: ["p.jpg"],
        collabs: 10,
        verified: false,
        tier: "free",
        profile_completion_pct: 80,
        embedding: null,
        preferences: { showZodiac: false, showMbti: false },
        nsfw: false,
        suspended: false,
      },
      {
        id: "me",
        name: "Me",
        avatar: "a.jpg",
        photos: [],
        suspended: false,
        embedding: null,
        preferences: {},
      },
      {
        id: "suspended",
        name: "S",
        avatar: "a.jpg",
        photos: [],
        suspended: true,
        embedding: null,
        preferences: {},
      },
    ];
  });

  it("409 demo mode", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await GET(req({ authorization: "Bearer tok" }));
    expect(r.status).toBe(409);
    expect((await r.json()).code).toBe("DEMO_MODE");
  });

  it("429 when rate limited", async () => {
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await GET(req({ authorization: "Bearer tok" }));
    expect(r.status).toBe(429);
  });

  it("401 without bearer", async () => {
    const r = await GET(req());
    expect(r.status).toBe(401);
  });

  it("401 on invalid bearer", async () => {
    const r = await GET(req({ authorization: "Bearer bad" }));
    expect(r.status).toBe(401);
  });

  it("404 when profile missing", async () => {
    (globalThis as any).__profile = { data: null, error: null };
    const r = await GET(req({ authorization: "Bearer tok" }));
    expect(r.status).toBe(404);
  });

  it("returns scored candidates excluding self and suspended", async () => {
    const r = await GET(req({ authorization: "Bearer tok" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.total).toBe(1);
    expect(body.profiles[0].id).toBe("c1");
    expect(body.profiles[0].zodiac).toBe(""); // showZodiac false redacted
    expect(body.profiles[0].mbti).toBe("");
    expect(body.profiles[0].showDistance).toBe(true);
    expect(body.aiEnabled).toBe(false);
    expect(body.profiles[0].embedding).toBeUndefined();
    expect(body.profiles[0].preferences).toBeUndefined();
  });
});
