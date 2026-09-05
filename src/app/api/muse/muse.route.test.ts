import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/request-safety", () => ({
  enforceRequestSafety: async () => null,
  sanitizeText: (s: string) => s,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: async () => (globalThis as any).__authUser || { data: { user: null } } } },
  getServiceClient: () => (globalThis as any).__sbMock,
}));
vi.mock("@/lib/http", () => ({ safeServerError: (e: any) => ({ error: e?.message || "err" }) }));
vi.mock("@/lib/aiDocs", () => ({ askMuseAI: async () => ({ answer: "" }) }));
vi.mock("@/lib/aiModeration", () => ({ screenText: async () => ({ allowed: true }), moderateText: async () => ({ allowed: true }) }));
vi.mock("@/lib/money", () => ({ parseRateToCents: (n: number) => n * 100 }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));
vi.mock("@/lib/content-check", () => ({ scanWithRekognition: async () => ({ safe: true }), logScan: async () => ({}) }));
vi.mock("@/lib/questEngine", () => ({ bumpQuest: async () => ({}), questPeriodKey: () => "daily", awardQuestXp: async () => ({}), setQuestProgress: async () => ({}), setReferralQuestProgress: async () => ({}), bumpLoginStreak: async () => ({}), getQuestDefinitions: () => [], questsForPeriod: () => [], rotateQuests: () => [], seededHash: () => 0 }));
vi.mock("stripe", () => ({ default: function () { return {}; } }));

import { POST } from "@/app/api/muse/route";

const state: any = { inserts: [] };
(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      insert: (v: any) => { state.inserts.push({ tbl, v }); return q; },
      select: () => q, eq: () => q, maybeSingle: async () => ({ data: (tbl === "muse_profiles" ? { id: "p1", suspended: false } : null) }),
      update: () => q, upsert: () => q, single: async () => ({ data: null }), in: () => q, rpc: async () => ({ data: true }),
    };
    return q;
  },
};

function req(body: unknown) {
  return { headers: { get: (n: string) => (n.toLowerCase() === "content-type" ? "application/json" : null) }, json: async () => body } as any;
}

beforeEach(() => { vi.clearAllMocks(); (globalThis as any).__authUser = { data: { user: { id: "u1" } } }; state.inserts = []; });

describe("muse dispatcher (integration)", () => {
  it("rejects track-event without a name with 400", async () => {
    const r = await POST(req({ action: "track-event", props: {} }));
    expect(r.status).toBe(400);
  });

  it("records a valid track-event", async () => {
    const r = await POST(req({ action: "track-event", name: "test_event", props: { a: 1 } }));
    expect(r.status).toBe(200);
    expect(state.inserts.some((i: any) => i.tbl === "muse_events_log")).toBe(true);
  });

  it("rejects a track-event with a non-string name with 400", async () => {
    const r = await POST(req({ action: "track-event", name: 12345 }));
    expect(r.status).toBe(400);
  });
});
