import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import type { ActionContext } from "@/lib/muse-actions/shared";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: unknown[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));

type TestGlobals = { __sbMock: unknown };
const g = vi.hoisted(() => globalThis as unknown as TestGlobals);

const state: { params: Record<string, unknown>; inserts: Record<string, unknown>[]; updates: Record<string, unknown>[] } = { params: {}, inserts: [], updates: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => g.__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { feedbackGetNotifications, feedbackReportBug, feedbackSubmitIdea, feedbackMarkAllRead } from "@/lib/muse-actions/feedback";

type MockQuery = {
  select: () => MockQuery;
  eq: () => MockQuery;
  order: () => MockQuery;
  range: () => MockQuery;
  insert: (value: Record<string, unknown>) => MockQuery;
  update: (value: Record<string, unknown>) => MockQuery;
};
function makeQuery(): MockQuery {
  const q: MockQuery = {
    select: () => q, eq: () => q, order: () => q, range: () => q,
    insert: (v) => { state.inserts.push(v); return q; },
    update: (v) => { state.updates.push(v); return q; },
  };
  return q;
}
const req = {} as unknown as NextRequest;
function ctx(rest: Record<string, unknown>): ActionContext {
  return { sb: { from: () => makeQuery() } as unknown as ActionContext["sb"], profile: { id: "u1", name: "Ada" }, rest, ip: "10.0.0.1", req };
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
    expect(state.inserts.some((i) => i.action === "bug-report")).toBe(true);
  });

  it("submitIdea requires title + description (400)", async () => {
    const r = await feedbackSubmitIdea(ctx({ title: "hi" }));
    expect((r as Response).status).toBe(400);
  });

  it("submitIdea accepts valid input (200) and logs idea-submission", async () => {
    const r = await feedbackSubmitIdea(ctx({ title: "New feature", description: "please" }));
    expect((r as Response).status).toBe(200);
    expect(state.inserts.some((i) => i.action === "idea-submission")).toBe(true);
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
