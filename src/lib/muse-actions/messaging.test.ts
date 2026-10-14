import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { createSb } from "@/test-support/sb";
import type { ActionContext } from "@/lib/muse-actions/shared";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: unknown[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));

type TestGlobals = { __sbMock: unknown };
const g = vi.hoisted(() => globalThis as unknown as TestGlobals);

const state: { row: unknown; inserts: Record<string, unknown>[]; updates: unknown[] } = { row: null, inserts: [], updates: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => g.__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { messageSend, messageRequestsGet } from "@/lib/muse-actions/messaging";

type MockQuery = {
  select: () => MockQuery;
  eq: () => MockQuery;
  in: () => MockQuery;
  limit: () => MockQuery;
  order: () => MockQuery;
  or: () => MockQuery;
  insert: (value: Record<string, unknown>) => MockQuery;
  update: (value: Record<string, unknown>) => MockQuery;
  delete: () => MockQuery;
  maybeSingle: () => Promise<{ data: unknown }>;
  single: () => Promise<{ data: unknown }>;
};
function makeQuery(): MockQuery {
  const q: MockQuery = {
    select: () => q, eq: () => q, in: () => q, limit: () => q, order: () => q, or: () => q,
    insert: (v) => { state.inserts.push(v); return q; },
    update: (v) => { state.updates.push(v); return q; },
    delete: () => q, maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
const req = {} as unknown as NextRequest;
function ctx(rest: Record<string, unknown>, row: unknown): ActionContext {
  state.row = row;
  return { sb: { from: () => makeQuery() } as unknown as ActionContext["sb"], profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req };
}

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; });

describe("messageSend", () => {
  it("requires text or image (400)", async () => {
    const r = await messageSend(ctx({ toId: "u2" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("requires toId (400)", async () => {
    const r = await messageSend(ctx({ text: "hi" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("rejects an invalid toId", async () => {
    // non-UUID non-stub toId that doesn't resolve as a demo short-circuit
    const r = await messageSend(ctx({ toId: "not-a-real-id", text: "hi" }, null));
    // returns 400 (not found) or 403 (blocked) — either is a valid rejection,
    // just not a silent success
    expect((r as Response).status).not.toBe(200);
  });

  it("sends a first-contact request to a non-matched, non-demo-stub user (uuid toId, no existing match/request row)", async () => {
    const r = await messageSend(ctx({ toId: "22222222-2222-4222-8222-222222222222", text: "hi there" }, null));
    const body = await (r as Response).json();
    expect((r as Response).status).toBe(200);
    expect(body.pending).toBe(true);
  });
});

// wyzmind's message-request inbox (db281d4) let a first-contact request's
// text preview skip screenText() moderation entirely — it stored/notified/
// emailed the raw text and only ran screenText() later, on a branch this
// early-return never reached. Fixed to screen (and apply the same
// payment+NSFW disclosure gate matched messages get) before a request is
// ever created. These lock that in; flagged for wyzmind to independently
// confirm since this is content-moderation/safety logic.
describe("messageSend — message-request path is moderated like a real message", () => {
  it("blocks a first-contact request whose text screenText flags, and never creates the muse_message_requests row", async () => {
    vi.doMock("@/lib/aiModeration", () => ({ screenText: () => ({ block: true, categories: ["test-flag"] }) }));
    vi.resetModules();
    const { messageSend: messageSendFresh } = await import("@/lib/muse-actions/messaging");
    const r = await messageSendFresh(ctx({ toId: "33333333-3333-4333-8333-333333333333", text: "flagged content" }, null));
    expect((r as Response).status).toBe(403);
    const body = await (r as Response).json();
    expect(body.code).toBe("SAFETY_BLOCK");
    expect(state.inserts.some((i) => "message_preview" in (i || {}))).toBe(false);
    vi.doUnmock("@/lib/aiModeration");
    vi.resetModules();
  });

  it("requires disclosure before a first-contact request discussing paid NSFW work reaches the recipient", async () => {
    const r = await messageSend(ctx({ toId: "44444444-4444-4444-8444-444444444444", text: "I'll pay $200 for a nude boudoir shoot" }, null));
    expect((r as Response).status).toBe(409);
    const body = await (r as Response).json();
    expect(body.code).toBe("DISCLOSURE_REQUIRED");
    expect(state.inserts.some((i) => "message_preview" in (i || {}))).toBe(false);
  });
});

// Found while auditing this file's blocking/request-lifecycle coverage:
// messageRequestsGet never filtered by status, so a request the recipient
// already accepted, declined, or (via messageRequestBlock) blocked stayed in
// the "Inbox" list — and its unread-style badge count — forever instead of
// disappearing once handled. Locking in the fix: only "pending" requests
// should ever come back from this query.
describe("messageRequestsGet — only pending requests surface in the inbox", () => {
  it("queries muse_message_requests scoped to this recipient and status=pending", async () => {
    g.__sbMock = createSb((table, calls) => {
      if (table === "muse_message_requests") {
        const toCall = calls.find((c) => c.method === "eq" && c.args[0] === "request_to");
        const statusCall = calls.find((c) => c.method === "eq" && c.args[0] === "status");
        expect(toCall?.args[1]).toBe("me1");
        expect(statusCall?.args[1]).toBe("pending");
        return { data: [{ id: "req1", status: "pending" }], error: null };
      }
      return { data: null, error: null };
    });
    const r = await messageRequestsGet({ sb: g.__sbMock as ActionContext["sb"], profile: { id: "me1", name: "Ada" }, rest: {}, ip: "10.0.0.1", req });
    expect((r as Response).status).toBe(200);
    const body = await (r as Response).json();
    expect(body.requests).toEqual([{ id: "req1", status: "pending" }]);
  });
});
