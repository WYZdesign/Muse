import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createSb, tableCalls, insertValue, type SbCall, type SbMock, type SbResult } from "@/test-support/sb";
import type { ActionContext } from "@/lib/muse-actions/shared";

type TestGlobals = { __sbMock: unknown };
const g = vi.hoisted(() => globalThis as unknown as TestGlobals);

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => g.__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { supportTicketCreate, supportTicketsGet } from "@/lib/muse-actions/misc";
import { adminSupportTickets, adminResolveSupportTicket } from "@/lib/muse-actions/admin";

const req = {} as unknown as NextRequest;
const UUID = "11111111-1111-4111-8111-111111111111";

type Handler = (calls: SbCall[]) => SbResult;
function install(handlers: Record<string, Handler>): SbMock {
  const sb = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  g.__sbMock = sb;
  return sb;
}

function act(rest: Record<string, unknown>, tier?: string, email = "member@example.com"): ActionContext {
  return { sb: g.__sbMock as ActionContext["sb"], profile: { id: "me1", name: "Ada", tier, email }, rest, ip: "10.0.0.1", req };
}

function admin(rest: Record<string, unknown>): ActionContext {
  process.env.ADMIN_EMAILS = "admin@wyzdesign.com";
  return { sb: g.__sbMock as ActionContext["sb"], profile: { id: "staff1", name: "Staff", email: "admin@wyzdesign.com" }, rest, ip: "10.0.0.1", req };
}

describe("supportTicketCreate", () => {
  it("requires a subject and body", async () => {
    install({});
    const r = await supportTicketCreate(act({ subject: "", body: "" }));
    expect((r as Response).status).toBe(400);
  });

  it("derives priority from the submitter's CURRENT server-side tier, never from client input", async () => {
    const sb = install({
      muse_support_tickets: () => ({ data: { id: UUID, created_at: "2026-10-18T00:00:00Z" } }),
    });
    // A free-tier caller tries to spoof priority via the request body.
    const r = await supportTicketCreate(act({ subject: "Help", body: "Need help", priority: "high" }, "free"));
    const d = await (r as Response).json();
    expect(d.priority).toBe("normal");
    const insert = insertValue(tableCalls(sb.__log, "muse_support_tickets"));
    expect((insert as { priority?: string })?.priority).toBe("normal");
  });

  it("gives Musa Studio submitters 'high' priority", async () => {
    const sb = install({
      muse_support_tickets: () => ({ data: { id: UUID, created_at: "2026-10-18T00:00:00Z" } }),
    });
    const r = await supportTicketCreate(act({ subject: "Help", body: "Need help" }, "muse_studio"));
    const d = await (r as Response).json();
    expect(d.priority).toBe("high");
    const insert = insertValue(tableCalls(sb.__log, "muse_support_tickets"));
    expect((insert as { priority?: string })?.priority).toBe("high");
  });

  it("surfaces a db error", async () => {
    install({ muse_support_tickets: () => ({ data: null, error: { message: "boom" } }) });
    const r = await supportTicketCreate(act({ subject: "Help", body: "Need help" }));
    expect((r as Response).status).toBe(500);
  });
});

describe("supportTicketsGet", () => {
  it("returns only the caller's own tickets", async () => {
    const sb = install({
      muse_support_tickets: () => ({ data: [{ id: UUID, subject: "Help", status: "open", priority: "normal" }] }),
    });
    const r = await supportTicketsGet(act({}));
    const d = await (r as Response).json();
    expect(d.tickets).toHaveLength(1);
    const calls = tableCalls(sb.__log, "muse_support_tickets");
    expect(calls.some((c) => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "me1")).toBe(true);
  });
});

describe("admin support-ticket actions (isAdminEmail gate)", () => {
  it("adminSupportTickets returns 403 for a non-admin", async () => {
    install({});
    const r = await adminSupportTickets(act({}, undefined, "someone@example.com"));
    expect((r as Response).status).toBe(403);
  });

  it("adminResolveSupportTicket returns 403 for a non-admin", async () => {
    install({});
    const ctx = act({ ticketId: UUID }, undefined, "someone@example.com");
    const r = await adminResolveSupportTicket(ctx);
    expect((r as Response).status).toBe(403);
  });

  it("adminSupportTickets joins the submitter's name/email, so the admin can actually reply", async () => {
    // "We reply by email" (SupportModal.tsx's copy) needs the queue to
    // surface something to reply to — a bare user_id isn't it.
    const sb = install({
      muse_support_tickets: () => ({ data: [{ id: UUID, status: "open", priority: "normal", created_at: "2026-10-18T00:00:00Z", user_id: { id: "me1", name: "Ada", email: "ada@example.com" } }] }),
    });
    await adminSupportTickets(admin({}));
    const calls = tableCalls(sb.__log, "muse_support_tickets");
    expect(calls.some((c) => c.method === "select" && String(c.args[0]).includes("user_id(id, name, email)"))).toBe(true);
  });

  it("adminSupportTickets orders high-priority tickets first, oldest first within a band", async () => {
    // The real query orders by created_at ascending before this handler
    // re-sorts by priority, so the mock hands rows back already in that
    // order (id3 oldest .. id4 newest) the way Postgres would.
    install({
      muse_support_tickets: () => ({
        data: [
          { id: "3", status: "open", priority: "high", created_at: "2026-10-01T00:00:00Z" },
          { id: "1", status: "open", priority: "normal", created_at: "2026-10-02T00:00:00Z" },
          { id: "2", status: "open", priority: "high", created_at: "2026-10-03T00:00:00Z" },
          { id: "4", status: "resolved", priority: "high", created_at: "2026-10-04T00:00:00Z" },
        ],
      }),
    });
    const r = await adminSupportTickets(admin({}));
    const d = await (r as Response).json();
    const ids = (d.tickets as { id: string }[]).map((t) => t.id);
    // Both high-priority open tickets (3 then 2, oldest first) come before
    // the normal-priority open one (1); the resolved ticket (4) comes last
    // regardless of its priority — resolved tickets aren't in the live queue.
    expect(ids).toEqual(["3", "2", "1", "4"]);
    expect(d.openCount).toBe(3);
  });

  it("adminResolveSupportTicket requires a valid ticketId", async () => {
    const r = await adminResolveSupportTicket(admin({ ticketId: "nope" }));
    expect((r as Response).status).toBe(400);
  });

  it("adminResolveSupportTicket marks the ticket resolved", async () => {
    const sb = install({ muse_support_tickets: () => ({ data: null, error: null }) });
    const r = await adminResolveSupportTicket(admin({ ticketId: UUID }));
    expect((r as Response).status).toBe(200);
    const calls = tableCalls(sb.__log, "muse_support_tickets");
    expect(calls.some((c) => c.method === "update")).toBe(true);
  });
});
