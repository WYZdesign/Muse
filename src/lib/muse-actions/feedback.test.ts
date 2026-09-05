import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));

const state: any = { params: {}, inserts: [], updates: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { feedbackGetNotifications, feedbackReportBug, feedbackSubmitIdea, feedbackMarkAllRead } from "@/lib/muse-actions/feedback";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, order: () => q, range: () => q,
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
  };
  return q;
}
function ctx(rest: any) {
  return { sb: { from: () => makeQuery() }, profile: { id: "u1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.inserts = []; state.updates = []; });

describe("feedback actions", () => {
  it("reportBug requires category + description (400)", async () => {
    const r = await feedbackReportBug(ctx({ category: "crash" }));
    expect((r as Response).status).toBe(400);
  });

  it("reportBug accepts valid input (200) and logs to activity_log", async () => {
    const r = await feedbackReportBug(ctx({ category: "crash", description: "it broke" }));
    expect((r as Response).status).toBe(200);
    expect(state.inserts.some((i: any) => i.action === "bug-report")).toBe(true);
  });

  it("submitIdea requires title + description (400)", async () => {
    const r = await feedbackSubmitIdea(ctx({ title: "hi" }));
    expect((r as Response).status).toBe(400);
  });

  it("submitIdea accepts valid input (200) and logs idea-submission", async () => {
    const r = await feedbackSubmitIdea(ctx({ title: "New feature", description: "please" }));
    expect((r as Response).status).toBe(200);
    expect(state.inserts.some((i: any) => i.action === "idea-submission")).toBe(true);
  });

  it("getNotifications returns success (200)", async () => {
    const r = await feedbackGetNotifications(ctx({}));
    expect((r as Response).status).toBe(200);
  });

  it("markAllRead returns success (200)", async () => {
    const r = await feedbackMarkAllRead(ctx({}));
    expect((r as Response).status).toBe(200);
  });
});
