import { describe, it, expect } from "vitest";
import { validateRest, MUSE_REST_SCHEMAS } from "./restSchemas";

describe("validateRest", () => {
  it("rejects prototype-pollution keys", () => {
    const polluted = JSON.parse('{"__proto__":{"isAdmin":true}}') as Record<string, unknown>;
    expect(Object.keys(polluted)).toContain("__proto__");
    expect(validateRest("feed", polluted).ok).toBe(false);
  });

  it("caps the total payload size", () => {
    expect(validateRest("feed", { text: "x".repeat(60000) }).ok).toBe(false);
  });

  it("validates a known action's field format", () => {
    expect(validateRest("track-view", { target_id: "not-a-uuid" }).ok).toBe(false);
    expect(validateRest("track-view", { target_id: "11111111-1111-1111-1111-111111111111" }).ok).toBe(true);
  });

  it("enforces bounds on a known action field", () => {
    expect(validateRest("apply-promo", { code: "x".repeat(100) }).ok).toBe(false);
    expect(validateRest("apply-promo", { code: "WELCOME10" }).ok).toBe(true);
  });

  it("accepts extra fields on a mapped action (passthrough)", () => {
    expect(validateRest("feed", { text: "hi", futureField: 1 }).ok).toBe(true);
  });

  it("passes unknown actions through the universal guards only", () => {
    expect(validateRest("some-unmapped-action", { anything: true }).ok).toBe(true);
  });

  it("enforces bounds on the extended mutating-action schemas", () => {
    expect(validateRest("create-community", { name: "x".repeat(200) }).ok).toBe(false);
    expect(validateRest("create-community", { name: "LA Shooters", is_private: true }).ok).toBe(true);
    expect(validateRest("set-community-role", { role: "owner" }).ok).toBe(false);
    expect(validateRest("set-community-role", { role: "moderator" }).ok).toBe(true);
    expect(validateRest("boost", { quantity: 0 }).ok).toBe(false);
    expect(validateRest("boost", { quantity: 3, duration: "24h" }).ok).toBe(true);
    expect(validateRest("create-session", { title: "x".repeat(300) }).ok).toBe(false);
    expect(validateRest("forum", { vote: "sideways" }).ok).toBe(false);
    expect(validateRest("forum", { vote: "up" }).ok).toBe(true);
    expect(validateRest("join-community", { communityId: "abc", future: 1 }).ok).toBe(true);
    expect(validateRest("profile", { life_path: 999 }).ok).toBe(false);
    expect(validateRest("profile", { life_path: 7, name: "Ada" }).ok).toBe(true);
  });
});

// Realistic minimal payloads for the 39 mutating actions added in this pass.
const NEW_ACTION_PAYLOADS: Record<string, Record<string, unknown>> = {
  // albums
  "create-album": { title: "My Portfolio", access_level: "public" },
  "update-album": { albumId: "11111111-1111-1111-1111-111111111111", access_level: "private" },
  "delete-album": { albumId: "11111111-1111-1111-1111-111111111111" },
  "add-album-photo": { albumId: "11111111-1111-1111-1111-111111111111", img_url: "https://x.supabase.co/storage/v1/object/public/muse-uploads/a/b.png" },
  "remove-album-photo": { photoId: "22222222-2222-2222-2222-222222222222" },
  "grant-album-access": { albumId: "11111111-1111-1111-1111-111111111111", viewerProfileId: "33333333-3333-3333-3333-333333333333" },
  "revoke-album-access": { albumId: "11111111-1111-1111-1111-111111111111", viewerProfileId: "33333333-3333-3333-3333-333333333333" },
  "like-album": { albumId: "11111111-1111-1111-1111-111111111111" },
  // disclosures + strikes
  "create-disclosure": { responderId: "44444444-4444-4444-4444-444444444444", compensationAmount: "TFP", contentTypePortrait: true, locationType: "studio" },
  "confirm-disclosure": { disclosureId: "55555555-5555-5555-5555-555555555555" },
  "appeal-strike": { strikeId: "66666666-6666-6666-6666-666666666666", appealText: "This was a misunderstanding." },
  // sessions: bookings, reviews, check-ins + safety
  "respond-booking": { bookingId: "77777777-7777-7777-7777-777777777777", response: "accept" },
  "cancel-booking": { bookingId: "77777777-7777-7777-7777-777777777777" },
  "complete-booking": { bookingId: "77777777-7777-7777-7777-777777777777" },
  "toggle-session-availability": { sessionId: "88888888-8888-8888-8888-888888888888", available: true },
  "submit-review": { bookingId: "77777777-7777-7777-7777-777777777777", rating: 5, body: "Great shoot." },
  "respond-checkin": { checkinId: "99999999-9999-9999-9999-999999999999", response: "confirmed", sharedWithContact: true },
  "save-safety-profile": { emergencyContactName: "Sam", autoShareEnabled: true },
  "share-safety-details": { bookingId: "", shareMethod: "sms" },
  "save-prompt-response": { promptId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", responseText: "Hello there.", responseChoices: ["Option A"] },
  // quests
  "track-quest": { action_keys: ["post_feed"] },
  "claim-quest": { quest_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" },
  "notify-claimable-quests": {},
  // notifications
  "mark-all-notifications-read": {},
  "delete-notification": { id: "cccccccc-cccc-cccc-cccc-cccccccccccc" },
  "clear-all-notifications": {},
  // admin
  "admin-brain": { query: "How many users do we have?" },
  "admin-content-scans": {},
  "admin-custom-values": {},
  "admin-refunds": {},
  "admin-reports": {},
  "admin-strikes": {},
  "admin-resolve-appeal": { strikeId: "66666666-6666-6666-6666-666666666666", resolution: "overturned" },
  "admin-resolve-incident": { incidentId: "dddddddd-dddd-dddd-dddd-dddddddddddd" },
  "admin-resolve-refund": { requestId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", resolve: "refund", note: "Duplicate charge." },
  "admin-resolve-report": { reportId: "ffffffff-ffff-ffff-ffff-ffffffffffff", resolution: "actioned" },
  "admin-review-custom-value": { targetUserId: "44444444-4444-4444-4444-444444444444", field: "type" },
  "admin-scan-nsfw": { all: true },
  "admin-suspend-user": { targetUserId: "44444444-4444-4444-4444-444444444444", reason: "Reported: harassment", durationDays: 7 },
  // saved-talent lists
  "talent-lists-get": {},
  "talent-list-create": { name: "Favorites" },
  "talent-list-delete": { listId: "11111111-1111-1111-1111-111111111111" },
  "talent-list-items": { listId: "11111111-1111-1111-1111-111111111111", profileId: "22222222-2222-2222-2222-222222222222", remove: true },
  // human support tickets
  "support-ticket-create": { subject: "Need help", body: "My payment did not go through." },
  "support-tickets-get": {},
  "admin-support-tickets": {},
  "admin-resolve-support-ticket": { ticketId: "33333333-3333-3333-3333-333333333333" },
};

describe("extended mutating-action schemas", () => {
  const actions = Object.keys(NEW_ACTION_PAYLOADS);

  it("adds a schema for every targeted mutating action", () => {
    expect(actions.length).toBe(47);
    for (const action of actions) expect(MUSE_REST_SCHEMAS[action]).toBeDefined();
  });

  for (const [action, payload] of Object.entries(NEW_ACTION_PAYLOADS)) {
    it(`${action}: realistic payload parses`, () => {
      expect(validateRest(action, payload).ok).toBe(true);
    });

    it(`${action}: unknown fields pass through untouched`, () => {
      const res = validateRest(action, { ...payload, futureField: "kept" });
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.futureField).toBe("kept");
    });

    it(`${action}: rejects a polluted __proto__ key`, () => {
      const polluted = JSON.parse('{"__proto__":{"isAdmin":true}}') as Record<string, unknown>;
      expect(validateRest(action, polluted).ok).toBe(false);
    });

    it(`${action}: rejects an oversize payload`, () => {
      expect(validateRest(action, { blob: "x".repeat(60000) }).ok).toBe(false);
    });

    it(`${action}: parses with none of the known fields present`, () => {
      expect(validateRest(action, {}).ok).toBe(true);
    });
  }

  it("keeps real frontend payloads valid (null durationDays, empty bookingId, snake_case safety profile)", () => {
    expect(validateRest("admin-suspend-user", { targetUserId: "44444444-4444-4444-4444-444444444444", reason: "Reported: spam", durationDays: null }).ok).toBe(true);
    expect(validateRest("share-safety-details", { bookingId: "", shareMethod: "sms" }).ok).toBe(true);
    expect(validateRest("save-safety-profile", { emergency_contact_name: "Sam", auto_share_enabled: true }).ok).toBe(true);
    expect(validateRest("track-quest", { action_key: "post_feed" }).ok).toBe(true);
    expect(validateRest("respond-checkin", { checkinId: "99999999-9999-9999-9999-999999999999", response: "cancelled", sharedWithContact: false, reason: "Cancelled during pre-shoot check-in" }).ok).toBe(true);
    expect(validateRest("create-disclosure", { responderId: "44444444-4444-4444-4444-444444444444", compensationAmount: "TFP", contentTypePortrait: true, agreeTerms: true }).ok).toBe(true);
  });

  it("still rejects invalid enum, number, and oversize fields on the new actions", () => {
    expect(validateRest("respond-booking", { response: "maybe" }).ok).toBe(false);
    expect(validateRest("admin-resolve-report", { resolution: "deleted" }).ok).toBe(false);
    expect(validateRest("submit-review", { rating: 6 }).ok).toBe(false);
    expect(validateRest("toggle-session-availability", { available: "yes" }).ok).toBe(false);
    expect(validateRest("create-album", { title: "x".repeat(300) }).ok).toBe(false);
    expect(validateRest("track-quest", { action_keys: ["a".repeat(65)] }).ok).toBe(false);
    expect(validateRest("talent-list-create", { name: "x".repeat(200) }).ok).toBe(false);
    expect(validateRest("support-ticket-create", { subject: "x".repeat(200), body: "ok" }).ok).toBe(false);
  });
});
