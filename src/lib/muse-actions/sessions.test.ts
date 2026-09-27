import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSb, tableCalls, eqOf, insertValue, updateValue, type SbCall } from "@/test-support/sb";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/questEngine", () => ({ bumpQuest: async () => ({}), setQuestProgress: async () => ({}), bumpLoginStreak: async () => ({}), setReferralQuestProgress: async () => ({}), questPeriodKey: () => "daily", awardQuestXp: async () => ({}), refreshMetaQuest: async () => ({}), getQuestDefinitions: () => [], questsForPeriod: () => [], rotateQuests: () => [], seededHash: () => 0 }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));
vi.mock("stripe", () => ({ default: function () { return (globalThis as any).__stripe ?? {}; } }));

const state: any = { rows: {}, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import {
  bookingCancel, bookingRespond, sessionBook, sessionCreate, bookingComplete, reviewSubmit,
  checkinRespond, checkinsGet, safetyDetailsShare, safetyProfileSave, safetyProfileGet,
  promptsGet, bookingReminders, promptResponseSave, promptResponsesGet, hostAvailability,
  sessionAvailabilityToggle,
} from "@/lib/muse-actions/sessions";

function install(handlers: Record<string, (calls: SbCall[]) => any>) {
  const sb: any = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  (globalThis as any).__sbMock = sb;
  return sb;
}
function act(rest: any) {
  return { sb: (globalThis as any).__sbMock, profile: { id: "me1", name: "Ada", avatar: "av" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}
const UUID = "11111111-1111-4111-8111-111111111111";
const VERIFIED = { age_verified: true, age_verified_at: new Date().toISOString() };

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, limit: () => q, order: () => q, range: () => q,
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
    delete: () => q, or: () => q, maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
function ctx(rest: any, row: any) {
  state.row = row;
  return { sb: { from: () => makeQuery() }, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; state.deletes = []; });

describe("sessions/booking actions (party gate)", () => {
  it("bookingCancel requires bookingId (400)", async () => {
    const r = await bookingCancel(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("bookingCancel returns 404 when booking missing", async () => {
    const r = await bookingCancel(ctx({ bookingId: "b1" }, null));
    expect((r as Response).status).toBe(404);
  });

  it("bookingCancel rejects a non-party (403)", async () => {
    const r = await bookingCancel(ctx({ bookingId: "b1" }, { id: "b1", user_id: "someone", host_id: "else" }));
    expect((r as Response).status).toBe(403);
  });

  it("bookingCancel allows the booker (200)", async () => {
    const r = await bookingCancel(ctx({ bookingId: "b1" }, { id: "b1", user_id: "me1", host_id: "h1" }));
    expect((r as Response).status).toBe(200);
  });

  it("bookingRespond rejects a non-host (403)", async () => {
    const r = await bookingRespond(ctx({ bookingId: "b1", response: "accept" }, { id: "b1", user_id: "u1", host_id: "someone" }));
    expect((r as Response).status).toBe(403);
  });

  it("sessionBook requires fields (400)", async () => {
    const r = await sessionBook(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });
});

beforeEach(() => { (globalThis as any).__stripe = undefined; });

describe("sessionBook — verification + host resolution", () => {
  it("403s with VERIFICATION_REQUIRED when the booker is not verified", async () => {
    install({ muse_profiles: () => ({ data: { age_verified: false, age_verified_at: null } }) });
    const r = await sessionBook(act({ sessionId: UUID }));
    expect((r as Response).status).toBe(403);
    expect((await (r as Response).json()).code).toBe("VERIFICATION_REQUIRED");
  });
  it("demo-stubs a non-uuid session id after verification", async () => {
    install({ muse_profiles: () => ({ data: VERIFIED }) });
    expect(await (await sessionBook(act({ sessionId: "stub" })) as Response).json()).toMatchObject({ demo: true });
  });
  it("400s when the session or host is missing", async () => {
    install({ muse_profiles: () => ({ data: VERIFIED }), muse_sessions: () => ({ data: null }) });
    expect((await sessionBook(act({ sessionId: UUID })) as Response).status).toBe(400);
    install({ muse_profiles: (calls) => (eqOf(calls, "id") === "h1" ? { data: null } : { data: VERIFIED }), muse_sessions: () => ({ data: { id: UUID, host_id: "h1" } }) });
    expect((await sessionBook(act({ sessionId: UUID })) as Response).status).toBe(400);
  });
  it("books, notifies the host and includes the sanitized note", async () => {
    const sb = install({ muse_profiles: (calls) => (eqOf(calls, "id") === "h1" ? { data: { id: "h1" } } : { data: VERIFIED }), muse_sessions: () => ({ data: { id: UUID, host_id: "h1" } }), muse_notifications: () => ({ data: null }) });
    const r = await sessionBook(act({ sessionId: UUID, note: "bring lights" }));
    expect((r as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_bookings").some((c) => c.method === "upsert")).toBe(true);
    expect(insertValue(tableCalls(sb.__log, "muse_notifications")).body).toContain("bring lights");
  });
});

describe("sessionCreate", () => {
  it("400s without a title and rejects ambiguous rates", async () => {
    install({});
    expect((await sessionCreate(act({})) as Response).status).toBe(400);
    expect((await sessionCreate(act({ title: "Shoot", rate: "$50-100" })) as Response).status).toBe(400);
  });
  it("inserts a sanitized session", async () => {
    const sb = install({ muse_sessions: () => ({ data: { id: "s1" } }) });
    const r = await sessionCreate(act({ title: "  Studio Day  ", rate: "$150", skills: ["lighting"] }));
    expect((r as Response).status).toBe(200);
    expect(insertValue(tableCalls(sb.__log, "muse_sessions"))).toMatchObject({ host_id: "me1", title: "Studio Day", rate: "$150", available: true });
  });
});

describe("bookingRespond", () => {
  it("validates fields, response and ownership", async () => {
    install({});
    expect((await bookingRespond(act({})) as Response).status).toBe(400);
    expect((await bookingRespond(act({ bookingId: "b1", response: "maybe" })) as Response).status).toBe(400);
    install({ muse_bookings: () => ({ data: null }) });
    expect((await bookingRespond(act({ bookingId: "b1", response: "accept" })) as Response).status).toBe(404);
    install({ muse_bookings: () => ({ data: { id: "b1", host_id: "other", user_id: "u" } }) });
    expect((await bookingRespond(act({ bookingId: "b1", response: "accept" })) as Response).status).toBe(403);
  });
  it("accept confirms + creates two safety check-ins", async () => {
    const sb = install({ muse_bookings: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "b1", host_id: "me1", user_id: "u2" } }), muse_safety_checkins: () => ({ data: null }), muse_notifications: () => ({ data: null }), muse_profiles: () => ({ data: null }) });
    const r = await bookingRespond(act({ bookingId: "b1", response: "accept" }));
    expect((r as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_safety_checkins").filter((c) => c.method === "insert")).toHaveLength(2);
    expect(updateValue(tableCalls(sb.__log, "muse_bookings")).status).toBe("confirmed");
  });
  it("decline and reschedule set the expected columns", async () => {
    const sb = install({ muse_bookings: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "b1", host_id: "me1", user_id: "u2" } }), muse_notifications: () => ({ data: null }), muse_profiles: () => ({ data: null }) });
    await bookingRespond(act({ bookingId: "b1", response: "decline" }));
    expect(updateValue(tableCalls(sb.__log, "muse_bookings"))).toMatchObject({ status: "cancelled", cancel_reason: "Host declined" });
    await bookingRespond(act({ bookingId: "b1", response: "reschedule", newDate: "2026-08-01" }));
    expect(updateValue(tableCalls(sb.__log, "muse_bookings"))).toMatchObject({ status: "pending", reschedule_date: "2026-08-01" });
  });
});

describe("bookingCancel / bookingComplete — payments", () => {
  it("cancels a pending PaymentIntent and still cancels the booking", async () => {
    (globalThis as any).__stripe = { paymentIntents: { cancel: vi.fn(async () => ({})), capture: vi.fn(async () => ({})) } };
    const sb = install({
      muse_bookings: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "b1", user_id: "me1", host_id: "h1" } }),
      muse_booking_payments: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "p1", stripe_payment_intent: "pi_1", status: "held" } }),
      muse_notifications: () => ({ data: null }),
    });
    const r = await bookingCancel(act({ bookingId: "b1", reason: "changed mind" }));
    expect((r as Response).status).toBe(200);
    expect((globalThis as any).__stripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_1");
    expect(tableCalls(sb.__log, "muse_booking_payments").some((c) => c.method === "update")).toBe(true);
  });
  it("bookingComplete 400s when not confirmed and 404s when missing", async () => {
    install({ muse_bookings: () => ({ data: null }) });
    expect((await bookingComplete(act({ bookingId: "b1" })) as Response).status).toBe(404);
    install({ muse_bookings: () => ({ data: { id: "b1", user_id: "me1", host_id: "h1", status: "pending" } }) });
    expect((await bookingComplete(act({ bookingId: "b1" })) as Response).status).toBe(400);
  });
  it("bookingComplete captures a held payment then completes", async () => {
    (globalThis as any).__stripe = { paymentIntents: { capture: vi.fn(async () => ({})), cancel: vi.fn() } };
    const sb = install({
      muse_bookings: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "b1", user_id: "me1", host_id: "h1", status: "confirmed" } }),
      muse_booking_payments: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: [{ id: "p1", stripe_payment_intent: "pi_1", status: "held" }] }),
      muse_notifications: () => ({ data: null }),
    });
    expect((await bookingComplete(act({ bookingId: "b1" })) as Response).status).toBe(200);
    expect((globalThis as any).__stripe.paymentIntents.capture).toHaveBeenCalledWith("pi_1");
  });
  it("bookingComplete returns 402 when capture fails", async () => {
    (globalThis as any).__stripe = { paymentIntents: { capture: vi.fn(async () => { throw new Error("declined"); }), cancel: vi.fn() } };
    install({
      muse_bookings: () => ({ data: { id: "b1", user_id: "me1", host_id: "h1", status: "confirmed" } }),
      muse_booking_payments: () => ({ data: [{ id: "p1", stripe_payment_intent: "pi_1", status: "held" }] }),
    });
    expect((await bookingComplete(act({ bookingId: "b1" })) as Response).status).toBe(402);
  });
});

describe("reviewSubmit", () => {
  it("validates id, rating, existence, status, party and reviewee", async () => {
    install({});
    expect((await reviewSubmit(act({})) as Response).status).toBe(400);
    expect((await reviewSubmit(act({ bookingId: "b1", rating: 9 })) as Response).status).toBe(400);
    install({ muse_bookings: () => ({ data: null }) });
    expect((await reviewSubmit(act({ bookingId: "b1", rating: 5 })) as Response).status).toBe(404);
    install({ muse_bookings: () => ({ data: { id: "b1", status: "pending", user_id: "me1", host_id: "h1" } }) });
    expect((await reviewSubmit(act({ bookingId: "b1", rating: 5 })) as Response).status).toBe(400);
    install({ muse_bookings: () => ({ data: { id: "b1", status: "completed", user_id: "x", host_id: "y" } }) });
    expect((await reviewSubmit(act({ bookingId: "b1", rating: 5 })) as Response).status).toBe(403);
    install({ muse_bookings: () => ({ data: { id: "b1", status: "completed", user_id: "me1", host_id: null } }) });
    expect((await reviewSubmit(act({ bookingId: "b1", rating: 5 })) as Response).status).toBe(400);
  });
  it("upserts a review with valid criteria and notifies", async () => {
    const sb = install({
      muse_bookings: () => ({ data: { id: "b1", status: "completed", user_id: "me1", host_id: "h1" } }),
      muse_reviews: () => ({ data: { id: "rev1" } }),
      muse_notifications: () => ({ data: null }),
    });
    const r = await reviewSubmit(act({ bookingId: "b1", rating: 5, body: "great", criteria: { communication: 5, reliability: 3, bogus: 9 } }));
    expect((r as Response).status).toBe(200);
    const upsert = tableCalls(sb.__log, "muse_reviews").find((c) => c.method === "upsert");
    expect(upsert?.args[0]).toMatchObject({ reviewer_id: "me1", reviewee_id: "h1", rating: 5, criteria_communication: 5, criteria_reliability: 3 });
    expect(upsert?.args[0]).not.toHaveProperty("criteria_bogus");
  });
});

describe("checkins", () => {
  it("checkinRespond validates and enforces ownership", async () => {
    install({});
    expect((await checkinRespond(act({})) as Response).status).toBe(400);
    install({ muse_safety_checkins: () => ({ data: null }) });
    expect((await checkinRespond(act({ checkinId: "c1", response: "ok" })) as Response).status).toBe(404);
    install({ muse_safety_checkins: () => ({ data: { id: "c1", user_id: "other", booking_id: null } }) });
    expect((await checkinRespond(act({ checkinId: "c1", response: "ok" })) as Response).status).toBe(403);
  });
  it("checkinRespond records the response", async () => {
    const sb = install({ muse_safety_checkins: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "c1", user_id: "me1", booking_id: null } }) });
    expect((await checkinRespond(act({ checkinId: "c1", response: "ok", sharedWithContact: true })) as Response).status).toBe(200);
    expect(updateValue(tableCalls(sb.__log, "muse_safety_checkins"))).toMatchObject({ status: "ok", shared_with_contact: true });
  });
  it("cancelling a check-in also cancels the booking", async () => {
    (globalThis as any).__stripe = { paymentIntents: { cancel: vi.fn(async () => ({})), capture: vi.fn() } };
    const sb = install({
      muse_safety_checkins: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "c1", user_id: "me1", booking_id: "b1" } }),
      muse_booking_payments: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "p1", stripe_payment_intent: "pi_1", status: "held" } }),
      muse_bookings: () => ({ data: null }),
    });
    await checkinRespond(act({ checkinId: "c1", response: "cancelled", reason: "unsafe" }));
    expect(tableCalls(sb.__log, "muse_bookings").some((c) => c.method === "update")).toBe(true);
  });
  it("checkinsGet returns the caller's check-ins", async () => {
    install({ muse_safety_checkins: () => ({ data: [{ id: "c1" }] }) });
    expect((await (await checkinsGet(act({})) as Response).json()).checkins).toHaveLength(1);
  });
});

describe("safety shares / profile / prompts", () => {
  it("safetyDetailsShare forbids a non-party booking and inserts otherwise", async () => {
    install({ muse_bookings: () => ({ data: { user_id: "x", host_id: "y" } }) });
    expect((await safetyDetailsShare(act({ bookingId: UUID })) as Response).status).toBe(403);
    const sb = install({
      muse_bookings: (calls) => (eqOf(calls, "id") === UUID ? { data: { user_id: "me1", host_id: "h1" } } : { data: { session_id: "s1", host_id: "me1", user_id: "h1" } }),
      muse_safety_shares: () => ({ data: null }),
      muse_profiles: () => ({ data: [{ id: "me1", name: "Ada" }] }),
      muse_sessions: () => ({ data: { title: "Shoot", location: "LA", date: "2026-08-01", time: "10:00" } }),
      muse_notifications: () => ({ data: null }),
    });
    const r = await safetyDetailsShare(act({ bookingId: UUID, recipientEmail: "trusted@x.com", recipientName: "Mom" }));
    expect((r as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_safety_shares").some((c) => c.method === "insert")).toBe(true);
  });
  it("safetyProfileSave upserts and flags the profile", async () => {
    const sb = install({ muse_safety_profiles: () => ({ data: null }), muse_profiles: () => ({ data: null }) });
    expect((await safetyProfileSave(act({ emergencyContactName: "Mom", autoShareEnabled: true })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_safety_profiles").some((c) => c.method === "upsert")).toBe(true);
    expect(tableCalls(sb.__log, "muse_profiles").some((c) => c.method === "update")).toBe(true);
  });
  it("safetyProfileGet returns null when none exists", async () => {
    install({ muse_safety_profiles: () => ({ data: null }) });
    expect(await (await safetyProfileGet(act({})) as Response).json()).toEqual({ safety: null });
  });
  it("promptsGet filters by category when supplied", async () => {
    const sb = install({ muse_prompt_bank: () => ({ data: [{ id: "p1" }] }) });
    await promptsGet(act({ category: "creative" }));
    expect(eqOf(tableCalls(sb.__log, "muse_prompt_bank"), "category")).toBe("creative");
  });
  it("promptResponseSave stores, recomputes pct and fires an embed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    const sb = install({
      muse_prompt_responses: (calls) => (calls.some((c) => c.method === "upsert") ? { data: null } : { count: 3 }),
      muse_prompt_bank: () => ({ count: 6 }),
      muse_profiles: () => ({ data: null }),
    });
    const r = await promptResponseSave(act({ promptId: "p1", responseText: "hello" }));
    expect(await (r as Response).json()).toMatchObject({ success: true, completionPct: 50 });
    expect(tableCalls(sb.__log, "muse_prompt_responses").some((c) => c.method === "upsert")).toBe(true);
  });
  it("promptResponsesGet returns rows", async () => {
    install({ muse_prompt_responses: () => ({ data: [{ id: "r1" }] }) });
    expect((await (await promptResponsesGet(act({})) as Response).json()).responses).toHaveLength(1);
  });
});

describe("bookingReminders / hostAvailability / sessionAvailabilityToggle", () => {
  it("bookingReminders tags host vs booker rows and filters by date", async () => {
    const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const far = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
    install({
      muse_bookings: (calls) => (eqOf(calls, "user_id") === "me1"
        ? { data: [{ id: "b1", status: "confirmed", session_id: { date: soon, title: "T" }, host_id: { id: "h1" } }] }
        : { data: [{ id: "b2", status: "pending", session_id: { date: far, title: "F" }, user_id: { id: "u2" } }] }),
    });
    const body = await (await bookingReminders(act({})) as Response).json();
    expect(body.reminders).toHaveLength(1);
    expect(body.reminders[0]).toMatchObject({ bookingId: "b1", isHost: false });
  });
  it("hostAvailability resolves the session's real host", async () => {
    const sb = install({
      muse_sessions: () => ({ data: { id: UUID, host_id: "h1" } }),
      muse_bookings: () => ({ data: [{ id: "b1" }], count: 1 }),
    });
    const body = await (await hostAvailability(act({ sessionId: UUID })) as Response).json();
    expect(body.activeBookingCount).toBe(1);
    expect(eqOf(tableCalls(sb.__log, "muse_bookings"), "host_id")).toBe("h1");
  });
  it("hostAvailability 400s / 404s", async () => {
    install({});
    expect((await hostAvailability(act({})) as Response).status).toBe(400);
    install({ muse_sessions: () => ({ data: null }) });
    expect((await hostAvailability(act({ sessionId: UUID })) as Response).status).toBe(404);
  });
  it("sessionAvailabilityToggle enforces strict boolean and host ownership", async () => {
    install({});
    expect((await sessionAvailabilityToggle(act({ sessionId: UUID, available: "yes" })) as Response).status).toBe(400);
    install({ muse_sessions: () => ({ data: null }) });
    expect((await sessionAvailabilityToggle(act({ sessionId: UUID, available: true })) as Response).status).toBe(404);
    install({ muse_sessions: () => ({ data: { id: UUID, host_id: "other" } }) });
    expect((await sessionAvailabilityToggle(act({ sessionId: UUID, available: true })) as Response).status).toBe(403);
    const sb = install({ muse_sessions: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: UUID, host_id: "me1" } }) });
    expect(await (await sessionAvailabilityToggle(act({ sessionId: UUID, available: false })) as Response).json()).toEqual({ success: true, available: false });
    expect(tableCalls(sb.__log, "muse_sessions").some((c) => c.method === "update")).toBe(true);
  });
});
