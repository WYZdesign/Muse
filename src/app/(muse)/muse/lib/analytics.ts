"use client";

/**
 * Muse Full Instrumentation
 * 
 * Every user-facing action flows through track(). Events land in
 * muse_events_log via POST /api/muse { action: "track-event" }.
 * 
 * Schema: { name, props, ua, ip, created_at }
 * Rate limit: 120/min per IP (already enforced in route.ts).
 */

import { getAccessToken } from "./api";
import { safeGetItem } from "./safe-storage";

let _screen = "unknown";
let _profileId = "";
let _sessionId = "";

/** Set the current active screen (call on every screen transition). */
export function setAnalyticsScreen(screen: string) {
  _screen = screen;
}

/** Set the authenticated user's profile ID (call on login/profile load). */
export function setAnalyticsUser(profileId: string) {
  _profileId = profileId;
}

/** Generate and store a session ID for this browser session. */
export function initAnalyticsSession() {
  if (typeof window === "undefined") return;
  try {
    let sid = sessionStorage.getItem("_muse_sid");
    if (!sid) {
      sid = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("_muse_sid", sid);
    }
    _sessionId = sid;
  } catch {
    _sessionId = "unknown";
  }
}

/**
 * Track any event. Fire-and-forget — never blocks the UI.
 * 
 * @param name  Event name (snake_case, max 100 chars)
 * @param props Arbitrary metadata (max 10KB JSON)
 */
export function track(name: string, props?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return;

    const body = JSON.stringify({
      action: "track-event",
      name,
      props: {
        ...props,
        screen: _screen,
        pid: _profileId || undefined,
        sid: _sessionId || undefined,
        ts: Date.now(),
      },
    });

    // Use keepalive so in-flight events survive page navigation
    fetch("/api/muse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // swallow — analytics must never break the app
  }
}

// ─── Convenience wrappers ──────────────────────────────────────────

export const analytics = {
  // Auth
  signup: (method: string) => track("auth_signup", { method }),
  login: (method: string) => track("auth_login", { method }),
  logout: () => track("auth_logout"),

  // Onboarding
  onboardStart: () => track("onboard_start"),
  onboardStep: (step: number, data?: string) => track("onboard_step", { step, data }),
  onboardComplete: (role: string) => track("onboard_complete", { role }),
  onboardPersonality: (payload: Record<string, string>) => track("onboard_personality", payload),
  onboardPhoto: (count: number) => track("onboard_photo", { count }),

  // Discover
  discoverView: (targetId: string, targetType: string) => track("discover_view", { target_id: targetId, target_type: targetType }),
  discoverSwipe: (direction: "left" | "right" | "super", targetId: string, targetType: string) => track("discover_swipe", { direction, target_id: targetId, target_type: targetType }),
  discoverMatch: (targetId: string, targetType: string) => track("discover_match", { target_id: targetId, target_type: targetType }),
  discoverProfileTap: (targetId: string) => track("discover_profile_tap", { target_id: targetId }),
  discoverSave: (targetId: string) => track("discover_save", { target_id: targetId }),

  // Sessions / Bookings
  sessionView: (sessionId: string, title: string) => track("session_view", { session_id: sessionId, title }),
  sessionApply: (sessionId: string) => track("session_apply", { session_id: sessionId }),
  sessionBook: (sessionId: string, rate?: number) => track("session_book", { session_id: sessionId, rate }),
  bookingRespond: (bookingId: string, response: "accept" | "decline") => track("booking_respond", { booking_id: bookingId, response }),
  bookingPay: (bookingId: string, amount?: number) => track("booking_pay", { booking_id: bookingId, amount }),
  bookingComplete: (bookingId: string) => track("booking_complete", { booking_id: bookingId }),
  bookingCancel: (bookingId: string, reason?: string) => track("booking_cancel", { booking_id: bookingId, reason }),
  bookingReview: (bookingId: string, rating: number) => track("booking_review", { booking_id: bookingId, rating }),

  // Messaging
  messageSend: (targetId: string, hasImage: boolean) => track("message_send", { target_id: targetId, has_image: hasImage }),
  conversationOpen: (targetId: string) => track("conversation_open", { target_id: targetId }),

  // Profile
  profileView: (targetId: string) => track("profile_view", { target_id: targetId }),
  profileEdit: (fields: string[]) => track("profile_edit", { fields }),
  profileShare: (targetId: string, method: string) => track("profile_share", { target_id: targetId, method }),

  // Social connections
  socialConnect: (provider: string) => track("social_connect", { provider }),
  socialDisconnect: (provider: string) => track("social_disconnect", { provider }),

  // Search
  search: (query: string, resultCount: number) => track("search", { query: query.slice(0, 100), result_count: resultCount }),

  // Community
  forumPost: (category: string) => track("forum_post", { category }),
  forumComment: (postId: string) => track("forum_comment", { post_id: postId }),
  forumVote: (postId: string, direction: "up" | "down") => track("forum_vote", { post_id: postId, direction }),
  communityJoin: (communityId: string) => track("community_join", { community_id: communityId }),
  eventRsvp: (eventId: string) => track("event_rsvp", { event_id: eventId }),

  // Monetization
  subscriptionView: (tier: string) => track("subscription_view", { tier }),
  subscriptionStart: (tier: string, price: number) => track("subscription_start", { tier, price }),
  boostPurchase: (type: string, price: number) => track("boost_purchase", { type, price }),
  boostUse: (type: string) => track("boost_use", { type }),

  // Quests / Gamification
  questStart: (questId: string) => track("quest_start", { quest_id: questId }),
  questComplete: (questId: string, reward: string) => track("quest_complete", { quest_id: questId, reward }),
  questClaim: (questId: string) => track("quest_claim", { quest_id: questId }),
  streakUpdate: (days: number) => track("streak_update", { days }),

  // Navigation
  screenView: (screen: string) => track("screen_view", { screen }),
  navTab: (tab: string) => track("nav_tab", { tab }),

  // Verification
  verificationStart: () => track("verification_start"),
  verificationComplete: () => track("verification_complete"),

  // Safety
  safetyCheckin: (bookingId: string) => track("safety_checkin", { booking_id: bookingId }),
  report: (targetId: string, targetType: string, reason: string) => track("report", { target_id: targetId, target_type: targetType, reason }),
  block: (targetId: string) => track("block", { target_id: targetId }),
  unmatch: (targetId: string) => track("unmatch", { target_id: targetId }),

  // Disclosure
  disclosureSubmit: (bookingId: string) => track("disclosure_submit", { booking_id: bookingId }),

  // Errors
  clientError: (name: string, info?: Record<string, unknown>) => track("client_error", { error_name: name, ...info }),
};
