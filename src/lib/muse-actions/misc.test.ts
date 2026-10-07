import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSb, tableCalls, eqOf, insertValue, updateValue, type SbCall } from "@/test-support/sb";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));

const state: any = { row: null, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import {
  preferencesSave, promoApply, notificationsMarkRead, clientSync, paymentsGet, searchAll,
  boostActivate, boostStatus, saveBoostPurchase, boostAnalytics, savedSearchSave, savedSearchList,
  savedSearchDelete, savedSearchAlerts, togglePhotoLike, isBoostActive, spendBoost, getBoostStatus,
  addBoostInventory, BOOST_DURATIONS,
} from "@/lib/muse-actions/misc";

function install(handlers: Record<string, (calls: SbCall[]) => any>) {
  const sb: any = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  (globalThis as any).__sbMock = sb;
  return sb;
}
function act(rest: any) {
  return { sb: (globalThis as any).__sbMock, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}
const UUID = "11111111-1111-4111-8111-111111111111";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
    delete: () => q, maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
function ctx(rest: any, row: any) {
  state.row = row;
  return { sb: { from: () => makeQuery() }, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; state.deletes = []; });

describe("misc actions", () => {
  it("promoApply requires a code (400)", async () => {
    const r = await promoApply(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("promoApply rejects an unknown code (404)", async () => {
    const r = await promoApply(ctx({ code: "NOTREAL" }, null));
    expect((r as Response).status).toBe(404);
  });

  it("promoApply lets a regular (non-admin) user redeem MUSEBETA — regression for the audit fix that removed the isAdminEmail gate this was previously (and wrongly) hidden behind", async () => {
    // ctx()'s profile has no email at all, so this would fail an admin check
    // if one were still present.
    const r = await promoApply(ctx({ code: "musebeta" }, null));
    expect((r as Response).status).toBe(200);
    const body = await (r as Response).json();
    expect(body.tier).toBe("muse_pro");
  });

  it("preferencesSave accepts valid prefs (200)", async () => {
    const r = await preferencesSave(ctx({ ageMin: 18, distance: 50 }, null));
    expect((r as Response).status).toBe(200);
  });
});

describe("preferencesSave — filtering + merging", () => {
  it("400s when nothing allowed was supplied", async () => {
    install({});
    expect((await preferencesSave(act({ hackTheGibson: true })) as Response).status).toBe(400);
  });
  it("drops disallowed keys and merges with existing preferences", async () => {
    const sb = install({ muse_profiles: () => ({ data: { preferences: { nsfw: true, stale: 1 } } }) });
    const r = await preferencesSave(act({ preferences: { nsfw: false, evil: "x" } }));
    expect((r as Response).status).toBe(200);
    const upd = updateValue(tableCalls(sb.__log, "muse_profiles"));
    expect(upd.preferences).toEqual({ nsfw: false, stale: 1 });
  });
  it("merges a nested notification toggle", async () => {
    const sb = install({ muse_profiles: () => ({ data: { preferences: { notifications: { match: true } } } }) });
    await preferencesSave(act({ toggleNotificationPref: { key: "match", value: false } }));
    expect(updateValue(tableCalls(sb.__log, "muse_profiles")).preferences).toEqual({ notifications: { match: false } });
  });
  it("ignores an unknown notification toggle key", async () => {
    install({});
    expect((await preferencesSave(act({ toggleNotificationPref: { key: "evil", value: false } })) as Response).status).toBe(400);
  });
  it("persists portfolioVisibility in the server's enforcement vocabulary", async () => {
    const sb = install({ muse_profiles: () => ({ data: { preferences: {} } }) });
    const r = await preferencesSave(act({ preferences: { portfolioVisibility: "private" } }));
    expect((r as Response).status).toBe(200);
    expect(updateValue(tableCalls(sb.__log, "muse_profiles")).preferences.portfolioVisibility).toBe("private");
  });
  it("collapses an unknown portfolioVisibility value to the default", async () => {
    const sb = install({ muse_profiles: () => ({ data: { preferences: {} } }) });
    await preferencesSave(act({ preferences: { portfolioVisibility: "invite" } }));
    expect(updateValue(tableCalls(sb.__log, "muse_profiles")).preferences.portfolioVisibility).toBe("everyone");
  });
  it("persists the structured availability/travel keys in the preferences blob (display back-compat)", async () => {
    const sb = install({ muse_profiles: () => ({ data: { preferences: {} } }) });
    const r = await preferencesSave(act({ preferences: {
      availabilityStatus: "busy",
      availabilityNote: "Booking 2 weeks out",
      travelDates: [{ from: "2026-10-01", to: "2026-10-15" }],
      travelDestinations: ["NYC", "LA"],
      budgetRange: "$500–$2,000",
    } }));
    expect((r as Response).status).toBe(200);
    expect(updateValue(tableCalls(sb.__log, "muse_profiles")).preferences).toEqual({
      availabilityStatus: "busy",
      availabilityNote: "Booking 2 weeks out",
      travelDates: [{ from: "2026-10-01", to: "2026-10-15" }],
      travelDestinations: ["NYC", "LA"],
      budgetRange: "$500–$2,000",
    });
  });
});

describe("notificationsMarkRead", () => {
  it("markAll sets read on every unread row", async () => {
    const sb = install({ muse_notifications: () => ({ data: null }) });
    const body = await (await notificationsMarkRead(act({ markAll: true })) as Response).json();
    expect(body).toEqual({ success: true, marked: "all" });
    const calls = tableCalls(sb.__log, "muse_notifications");
    expect(calls.some((c) => c.method === "update")).toBe(true);
    expect(eqOf(calls, "read")).toBe(false);
  });
  it("filters invalid ids and updates the valid UUIDs", async () => {
    const sb = install({ muse_notifications: () => ({ data: null }) });
    await notificationsMarkRead(act({ notificationIds: [UUID, "not-a-uuid", 5] }));
    const inCall = tableCalls(sb.__log, "muse_notifications").find((c) => c.method === "in");
    expect(inCall?.args[1]).toEqual([UUID]);
  });
  it("no-ops safely for an empty id list", async () => {
    const sb = install({ muse_notifications: () => ({ data: null }) });
    expect((await notificationsMarkRead(act({ notificationIds: [] })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_notifications")).toHaveLength(0);
  });
});

describe("clientSync", () => {
  it("upserts matches and sanitizes stats", async () => {
    const sb = install({
      muse_matches: () => ({ data: null }),
      muse_profiles: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { stats: { likes: 1 } } }),
    });
    const body = await (await clientSync(act({ matches: [{ id: "t1" }], stats: { likes: 4, passes: -2, bogus: 7, bookingsCompleted: 1.9 } })) as Response).json();
    expect(body.synced).toEqual(["matches", "stats"]);
    expect(updateValue(tableCalls(sb.__log, "muse_profiles")).stats).toEqual({ likes: 4, bookingsCompleted: 1 });
  });
  it("returns an empty synced list when nothing valid is sent", async () => {
    install({});
    expect(await (await clientSync(act({})) as Response).json()).toEqual({ success: true, synced: [] });
  });
});

describe("paymentsGet", () => {
  it("dedupes payee/payer rows and sorts newest first", async () => {
    install({
      muse_booking_payments: (calls) => (eqOf(calls, "payee_id") ? { data: [{ id: "p1", created_at: "2026-01-01T00:00:00Z" }, { id: "p2", created_at: "2026-03-01T00:00:00Z" }] } : { data: [{ id: "p2", created_at: "2026-03-01T00:00:00Z" }, { id: "p3", created_at: "2026-05-01T00:00:00Z" }] }),
    });
    const body = await (await paymentsGet(act({})) as Response).json();
    expect(body.payments.map((p: any) => p.id)).toEqual(["p3", "p2", "p1"]);
  });
});

describe("searchAll", () => {
  it("400s for a query shorter than 2 chars", async () => {
    install({});
    expect((await searchAll(act({ query: "a" })) as Response).status).toBe(400);
  });
  it("escapes wildcards/commas in the ilike pattern", async () => {
    const sb = install({ muse_profiles: () => ({ data: [] }), muse_briefs: () => ({ data: [] }), muse_communities: () => ({ data: [] }), muse_forum_posts: () => ({ data: [] }) });
    await searchAll(act({ query: '50%, a"(b)' }));
    const orCall = tableCalls(sb.__log, "muse_profiles").find((c) => c.method === "or");
    expect(orCall?.args[0]).toContain('\\%');
    expect(orCall?.args[0]).toContain('\\"');
    expect(orCall?.args[0]).toContain('"%');
  });
  it("applies user filters (type, verified, online, availability, destination, sort)", async () => {
    const sb = install({ muse_profiles: () => ({ data: [{ id: "u1" }] }), muse_briefs: () => ({ data: [] }), muse_communities: () => ({ data: [] }), muse_forum_posts: () => ({ data: [] }) });
    await searchAll(act({ query: "photo", styles: ["editorial"], creativeType: "Model", loc: "LA", verified: true, online: "true", availability: "available", destination: "NYC", sort: "popular" }));
    const calls = tableCalls(sb.__log, "muse_profiles");
    expect(calls.some((c) => c.method === "ilike" && c.args[0] === "type")).toBe(true);
    expect(calls.some((c) => c.method === "eq" && c.args[0] === "verified")).toBe(true);
    expect(calls.some((c) => c.method === "gte" && c.args[0] === "last_seen_at")).toBe(true);
    expect(calls.some((c) => c.method === "contains" && c.args[0] === "travel_destinations")).toBe(true);
    expect(calls.some((c) => c.method === "order" && c.args[0] === "views_count")).toBe(true);
  });
  it("filters availability_status only for a valid status", async () => {
    const sb = install({ muse_profiles: () => ({ data: [] }), muse_briefs: () => ({ data: [] }), muse_communities: () => ({ data: [] }), muse_forum_posts: () => ({ data: [] }) });
    await searchAll(act({ query: "photo", availability: "busy" }));
    expect(tableCalls(sb.__log, "muse_profiles").some((c) => c.method === "eq" && c.args[0] === "availability_status" && c.args[1] === "busy")).toBe(true);
  });
  it("ignores an invalid availability value instead of filtering on it", async () => {
    const sb = install({ muse_profiles: () => ({ data: [] }), muse_briefs: () => ({ data: [] }), muse_communities: () => ({ data: [] }), muse_forum_posts: () => ({ data: [] }) });
    await searchAll(act({ query: "photo", availability: "online" }));
    expect(tableCalls(sb.__log, "muse_profiles").some((c) => c.method === "eq" && c.args[0] === "availability_status")).toBe(false);
  });
  it("sanitises the destination into a single canonical city before contains", async () => {
    const sb = install({ muse_profiles: () => ({ data: [] }), muse_briefs: () => ({ data: [] }), muse_communities: () => ({ data: [] }), muse_forum_posts: () => ({ data: [] }) });
    await searchAll(act({ query: "photo", destination: "  New York, LA  " }));
    const call = tableCalls(sb.__log, "muse_profiles").find((c) => c.method === "contains" && c.args[0] === "travel_destinations");
    expect(call?.args[1]).toEqual(["New York"]);
  });
  it("drops a blank destination filter", async () => {
    const sb = install({ muse_profiles: () => ({ data: [] }), muse_briefs: () => ({ data: [] }), muse_communities: () => ({ data: [] }), muse_forum_posts: () => ({ data: [] }) });
    await searchAll(act({ query: "photo", destination: "   " }));
    expect(tableCalls(sb.__log, "muse_profiles").some((c) => c.method === "contains" && c.args[0] === "travel_destinations")).toBe(false);
  });
  // Same "blocking was write-only" gap fixed across get.ts's list endpoints —
  // searchAll never consulted muse_blocks either, so a blocked user (or
  // their briefs/forum posts) could still turn up in search results.
  it("excludes a blocked user, their briefs, and their forum posts from search results", async () => {
    install({
      muse_profiles: () => ({ data: [{ id: "blocked" }, { id: "ok" }] }),
      muse_briefs: () => ({ data: [
        { id: "b1", author_id: { id: "blocked", name: "B" } },
        { id: "b2", author_id: { id: "ok", name: "O" } },
      ] }),
      muse_forum_posts: () => ({ data: [
        { id: "f1", author_id: { id: "blocked", name: "B" } },
        { id: "f2", author_id: { id: "ok", name: "O" } },
      ] }),
      muse_communities: () => ({ data: [] }),
      muse_blocks: () => ({ data: [{ user_id: "me1", target_id: "blocked" }] }),
    });
    const body = await (await searchAll(act({ query: "photo" })) as Response).json();
    expect(body.results.users.map((u: any) => u.id)).toEqual(["ok"]);
    expect(body.results.briefs.map((b: any) => b.id)).toEqual(["b2"]);
    expect(body.results.forum.map((f: any) => f.id)).toEqual(["f2"]);
  });

  it("search type=messages searches the caller's conversations and resolves peers", async () => {
    install({
      muse_messages: () => ({ data: [{ id: "m1", sender_id: "me1", receiver_id: "peer1", text: "hi" }] }),
      muse_profiles: () => ({ data: [{ id: "peer1", name: "Bo", avatar: "av" }] }),
    });
    const body = await (await searchAll(act({ query: "hi", type: "messages" })) as Response).json();
    expect(body.results.messages[0].peer).toEqual({ id: "peer1", name: "Bo", avatar: "av" });
  });
});

describe("boost — pure helpers", () => {
  it("isBoostActive handles null/past/future", () => {
    expect(isBoostActive(null)).toBe(false);
    expect(isBoostActive(new Date(Date.now() - 1000).toISOString())).toBe(false);
    expect(isBoostActive(new Date(Date.now() + 100000).toISOString())).toBe(true);
  });
  it("spendBoost returns null for an unknown duration or missing profile", async () => {
    install({ muse_profiles: () => ({ data: null }) });
    expect(await spendBoost((globalThis as any).__sbMock, "u1", "bogus")).toBeNull();
    expect(await spendBoost((globalThis as any).__sbMock, "u1", "24h")).toBeNull();
  });
  it("spendBoost consumes inventory first", async () => {
    const sb = install({ muse_profiles: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { tier: "free", boost_inventory: 2, boost_expires_at: null } }) });
    const expiry = await spendBoost(sb, "u1", "24h");
    expect(expiry).toBeTruthy();
    expect(updateValue(tableCalls(sb.__log, "muse_profiles")).boost_inventory).toBe(1);
    expect(BOOST_DURATIONS["24h"]).toBe(1);
  });
  it("spendBoost lets a Pro user use the weekly allowance once", async () => {
    const sb = install({
      muse_profiles: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { tier: "muse_pro", boost_inventory: 0, boost_expires_at: null } }),
      muse_activity_log: (calls) => (calls.some((c) => c.method === "insert") ? { data: null } : { count: 0, data: [] }),
    });
    expect(await spendBoost(sb, "u1", "24h")).toBeTruthy();
  });
  it("spendBoost refuses a Pro user who already used the weekly boost", async () => {
    const sb = install({
      muse_profiles: () => ({ data: { tier: "muse_pro", boost_inventory: 0, boost_expires_at: null } }),
      muse_activity_log: () => ({ count: 1, data: [] }),
    });
    expect(await spendBoost(sb, "u1", "24h")).toBeNull();
  });
  it("getBoostStatus + addBoostInventory work off the profile row", async () => {
    install({ muse_profiles: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { tier: "free", boost_inventory: 1, boost_expires_at: new Date(Date.now() + 100000).toISOString() } }) });
    const st = await getBoostStatus((globalThis as any).__sbMock, "u1");
    expect(st).toMatchObject({ isPro: false, inventory: 1, isBoosted: true });
    await addBoostInventory((globalThis as any).__sbMock, "u1", 3);
    expect(tableCalls((globalThis as any).__sbMock.__log, "muse_profiles").some((c) => c.method === "update")).toBe(true);
    await addBoostInventory((globalThis as any).__sbMock, "u1", 0);
  });
});

describe("boost actions", () => {
  it("boostActivate rejects an invalid duration", async () => {
    install({});
    expect((await boostActivate(act({ duration: "99h" })) as Response).status).toBe(400);
  });
  it("boostActivate 402s when no boosts are available", async () => {
    install({ muse_profiles: () => ({ data: { tier: "free", boost_inventory: 0, boost_expires_at: null } }) });
    const r = await boostActivate(act({ duration: "24h" }));
    expect((r as Response).status).toBe(402);
    expect((await (r as Response).json()).code).toBe("NO_BOOSTS");
  });
  it("boostActivate 429s when the Pro weekly boost was already spent", async () => {
    install({
      muse_profiles: () => ({ data: { tier: "muse_pro", boost_inventory: 0, boost_expires_at: null } }),
      muse_activity_log: () => ({ count: 1, data: [] }),
    });
    expect((await boostActivate(act({ duration: "24h" })) as Response).status).toBe(429);
  });
  it("boostActivate succeeds using inventory", async () => {
    install({ muse_profiles: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { tier: "free", boost_inventory: 1, boost_expires_at: null } }) });
    const body = await (await boostActivate(act({ duration: "24h" })) as Response).json();
    expect(body).toMatchObject({ success: true, duration: "24h" });
  });
  it("boostStatus returns shared state", async () => {
    install({ muse_profiles: () => ({ data: { tier: "free", boost_inventory: 4, boost_expires_at: null } }) });
    expect(await (await boostStatus(act({})) as Response).json()).toEqual({ isPro: false, inventory: 4, isBoosted: false, expiresAt: null });
  });
  it("saveBoostPurchase validates and only grants paid, ungranted rows", async () => {
    install({});
    expect((await saveBoostPurchase(act({})) as Response).status).toBe(400);
    install({ muse_boost_purchases: () => ({ data: null, error: null }) });
    expect((await saveBoostPurchase(act({ purchaseId: "p1" })) as Response).status).toBe(404);
    install({ muse_boost_purchases: () => ({ data: { status: "granted", quantity: 2 } }) });
    expect((await (await saveBoostPurchase(act({ purchaseId: "p1" })) as Response).json()).alreadyGranted).toBe(true);
    install({ muse_boost_purchases: () => ({ data: { status: "pending", quantity: 1 } }) });
    expect((await saveBoostPurchase(act({ purchaseId: "p1" })) as Response).status).toBe(402);
    const sb = install({
      muse_boost_purchases: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { status: "paid", quantity: 3 } }),
      muse_profiles: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { boost_inventory: 1 } }),
    });
    const body = await (await saveBoostPurchase(act({ purchaseId: "p1" })) as Response).json();
    expect(body).toEqual({ success: true, quantity: 3 });
    expect(tableCalls(sb.__log, "muse_boost_purchases").some((c) => c.method === "update")).toBe(true);
  });
  it("boostAnalytics aggregates the window stats", async () => {
    install({
      muse_profiles: () => ({ data: { tier: "free", boost_inventory: 1, boost_expires_at: null } }),
      muse_activity_log: (calls) => (calls.some((c) => c.method === "limit") ? { data: { created_at: "2026-06-01T00:00:00Z" } } : { count: 5 }),
      muse_matches: (calls) => (calls.some((c) => c.method === "in") ? { count: 2 } : { data: [{ user_id: "l1" }] }),
    });
    const body = await (await boostAnalytics(act({})) as Response).json();
    expect(body).toMatchObject({ isBoosted: false, inventory: 1 });
    expect(body.stats).toEqual({ profileViews: 5, matchesReceived: 2, likesReceived: 1 });
  });
});

describe("saved searches + photo likes", () => {
  it("savedSearchSave requires a name and inserts", async () => {
    install({});
    expect((await savedSearchSave(act({})) as Response).status).toBe(400);
    const sb = install({ muse_saved_searches: () => ({ data: null }) });
    await savedSearchSave(act({ name: "  Casting  ", query: "photo", filters: { verified: true } }));
    expect(insertValue(tableCalls(sb.__log, "muse_saved_searches"))).toMatchObject({ name: "Casting", query: "photo", filters: { verified: true } });
  });
  it("savedSearchList returns rows", async () => {
    install({ muse_saved_searches: () => ({ data: [{ id: "s1" }] }) });
    expect((await (await savedSearchList(act({})) as Response).json()).searches).toHaveLength(1);
  });
  it("savedSearchDelete requires an id", async () => {
    install({});
    expect((await savedSearchDelete(act({})) as Response).status).toBe(400);
    const sb = install({ muse_saved_searches: () => ({ data: null }) });
    expect((await savedSearchDelete(act({ searchId: "s1" })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_saved_searches").some((c) => c.method === "delete")).toBe(true);
  });
  it("savedSearchAlerts returns none without searches and alerts otherwise", async () => {
    install({ muse_saved_searches: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: [] }) });
    expect(await (await savedSearchAlerts({ sb: (globalThis as any).__sbMock, profile: { id: "me1" } } as any) as Response).json()).toEqual({ alerts: [] });
    install({
      muse_saved_searches: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: [{ id: "s1", name: "Casting", query: "photo", filters: { verified: true, styles: ["editorial"] }, last_notified_at: null }] }),
      muse_profiles: () => ({ data: [{ id: "u1" }] }),
    });
    const body = await (await savedSearchAlerts({ sb: (globalThis as any).__sbMock, profile: { id: "me1" } } as any) as Response).json();
    expect(body.alerts[0]).toMatchObject({ searchId: "s1", name: "Casting" });
  });
  it("togglePhotoLike requires a sane url and toggles", async () => {
    install({});
    expect((await togglePhotoLike(act({})) as Response).status).toBe(400);
    expect((await togglePhotoLike(act({ photoUrl: "x".repeat(1001) })) as Response).status).toBe(400);
    const sb = install({ muse_photo_likes: (calls) => (calls.some((c) => c.method === "delete") ? { data: null } : calls.some((c) => c.method === "insert") ? { data: null } : { data: { id: "l1" } }) });
    const body = await (await togglePhotoLike(act({ photoUrl: "https://cdn/p.jpg" })) as Response).json();
    expect(body.liked).toBe(false);
    expect(tableCalls(sb.__log, "muse_photo_likes").some((c) => c.method === "delete")).toBe(true);
  });
  it("togglePhotoLike inserts a fresh like and returns the count", async () => {
    const sb = install({ muse_photo_likes: (calls) => (calls.some((c) => c.method === "insert") ? { data: null } : calls.some((c) => c.method === "select" && (c.args[1] as any)?.count === "exact") ? { count: 5 } : { data: null }) });
    const body = await (await togglePhotoLike(act({ photoUrl: "https://cdn/p.jpg" })) as Response).json();
    expect(body).toEqual({ success: true, liked: true, count: 5 });
    expect(tableCalls((globalThis as any).__sbMock.__log, "muse_photo_likes").some((c) => c.method === "insert")).toBe(true);
  });
});
