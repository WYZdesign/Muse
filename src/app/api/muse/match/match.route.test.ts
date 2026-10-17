import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

type MatchCandidateRow = {
  id: string;
  name?: string;
  type?: string;
  bio?: string;
  styles?: string[];
  looking?: string[];
  zodiac?: string | null;
  chinese?: string | null;
  mbti?: string | null;
  life_path?: number | string | null;
  avatar?: string;
  loc?: string;
  photos?: string[];
  collabs?: number;
  verified?: boolean;
  tier?: string;
  profile_completion_pct?: number;
  embedding?: number[] | null;
  preferences?: Record<string, unknown>;
  birthdate?: string;
  last_seen_at?: string;
  nsfw?: boolean;
  suspended?: boolean;
};
type MatchViewerRow = {
  id: string;
  name?: string | null;
  type?: string | null;
  bio?: string | null;
  styles?: string[] | null;
  looking?: string[] | null;
  zodiac?: string | null;
  chinese?: string | null;
  mbti?: string | null;
  life_path?: number | string | null;
  avatar?: string | null;
  loc?: string | null;
  tier?: string | null;
  embedding?: number[] | null;
};
type MatchTestGlobals = {
  __profile?: { data: MatchViewerRow | null; error?: unknown };
  __candidates?: MatchCandidateRow[];
  __ownMatches?: { target_id: string }[];
};

const TG = globalThis as unknown as MatchTestGlobals;

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
              maybeSingle: async () => (globalThis as unknown as MatchTestGlobals).__profile || { data: null, error: null },
            }),
            limit: async () => ({ data: (globalThis as unknown as MatchTestGlobals).__candidates || [], error: null }),
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
      if (table === "muse_matches") {
        return {
          select: () => ({
            eq: async () => ({ data: (globalThis as unknown as MatchTestGlobals).__ownMatches || [], error: null }),
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
  } as unknown as NextRequest;
}

describe("match route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    TG.__profile = {
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
    TG.__candidates = [
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
        birthdate: "1990-05-15",
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
    vi.mocked(checkRate).mockResolvedValueOnce(false);
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
    TG.__profile = { data: null, error: null };
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
    // Age is derived from birthdate, exposed, and the raw date never leaks.
    expect(typeof body.profiles[0].age).toBe("number");
    expect(body.profiles[0].age).toBeGreaterThanOrEqual(18);
    expect(body.profiles[0].birthdate).toBeUndefined();
    expect(body.profiles[0].showAge).toBe(true);
  });

  it("hides age (and never leaks birthdate) when the candidate opts out", async () => {
    TG.__candidates = [
      {
        id: "c2",
        name: "Private",
        type: "creator",
        avatar: "b.jpg",
        photos: ["p.jpg"],
        collabs: 1,
        verified: false,
        tier: "free",
        embedding: null,
        preferences: { showAge: false },
        birthdate: "1990-05-15",
        nsfw: false,
        suspended: false,
      },
    ];
    const r = await GET(req({ authorization: "Bearer tok" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.profiles[0].age).toBeUndefined();
    expect(body.profiles[0].showAge).toBe(false);
    expect(body.profiles[0].birthdate).toBeUndefined();
  });

  it("honors a paid candidate's match-percent privacy setting", async () => {
    TG.__candidates![0] = {
      ...TG.__candidates![0],
      tier: "muse_studio",
      preferences: { showMatchPercent: false },
    };

    const r = await GET(req({ authorization: "Bearer tok" }));

    expect(r.status).toBe(200);
    expect((await r.json()).profiles[0].showMatchPercent).toBe(false);
  });

  it("does not let an unknown tier hide match percentage", async () => {
    TG.__candidates![0] = {
      ...TG.__candidates![0],
      tier: "legacy_unknown",
      preferences: { showMatchPercent: false },
    };

    const r = await GET(req({ authorization: "Bearer tok" }));

    expect(r.status).toBe(200);
    expect((await r.json()).profiles[0].showMatchPercent).toBe(true);
  });

  // Known open issue (DELIVERY_STATUS.md): a candidate the viewer already
  // liked/matched kept resurfacing indefinitely — this endpoint never
  // consulted muse_matches at all. Locks in the fix.
  it("excludes a candidate the viewer already liked/matched (muse_matches row)", async () => {
    TG.__ownMatches = [{ target_id: "c1" }];
    const r = await GET(req({ authorization: "Bearer tok" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.total).toBe(0);
    expect(body.profiles.map((p: { id: string }) => p.id)).not.toContain("c1");
  });
});
