// Pure helpers extracted from page.tsx.
//
// page.tsx is the app controller. It had grown to ~4,000 lines / 310 KB, which
// made it hard to work on. These four helpers are dependency-free given their
// arguments, so they lift out with zero behaviour change.
//
// Keep this module PURE — no React, no state, no I/O. That is what makes the
// extraction risk-free and lets the functions be unit-tested directly.

import { ICEBREAKERS } from "./components/types";

/** Deterministic icebreaker pick: same seed always yields the same line. */
export function getIcebreaker(type: string, seed?: string): string {
  const pool = ICEBREAKERS[type] || ICEBREAKERS.default;
  const hash = seed ? seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
  return pool[hash % pool.length];
}

export type ReferralTier = {
  tier: string;
  discount: number;
  perks: string;
  nextThreshold: number | null;
};

export function getReferralTier(c: number): ReferralTier {
  return c >= 50
    ? { tier: "Platinum", discount: 20, perks: "20% off all services", nextThreshold: null }
    : c >= 20
      ? { tier: "Gold", discount: 15, perks: "15% off all services", nextThreshold: 50 }
      : c >= 5
        ? { tier: "Silver", discount: 10, perks: "10% off all services", nextThreshold: 20 }
        : c >= 1
          ? { tier: "Bronze", discount: 0, perks: "Exclusive badge", nextThreshold: 5 }
          : { tier: "None", discount: 0, perks: "Invite friends to earn", nextThreshold: 1 };
}

export type ProfileBadge = { name: string; desc: string; icon: string; color: string };

export function checkProfileBadges(
  stats: Partial<{ bookingsCompleted: number; matchesReceived: number; messagesSent: number }>,
  createdAt: number,
): ProfileBadge[] {
  const b: ProfileBadge[] = [];
  if (createdAt && Date.now() - createdAt > 31536000000) b.push({ name: "Full Moon", icon: "🌕", color: "#C0C0FF", desc: "1 year on Musa" });
  if ((stats.bookingsCompleted ?? 0) >= 50) b.push({ name: "Golden Hour", icon: "☀️", color: "#FFD700", desc: "50+ shoots completed" });
  else if ((stats.bookingsCompleted ?? 0) >= 10) b.push({ name: "Collab King", icon: "👑", color: "#FFD700", desc: "10+ bookings completed" });
  if ((stats.matchesReceived ?? 0) >= 100) b.push({ name: "Rising Star", icon: "⭐", color: "#FFBF00", desc: "100+ matches" });
  if ((stats.messagesSent ?? 0) >= 500) b.push({ name: "Social Butterfly", icon: "🦋", color: "#FF69B4", desc: "500+ messages" });
  return b;
}

/** Strip angle brackets and cap length before anything is persisted/rendered. */
export function sanitizeInput(text: string): string {
  return text.replace(/[<>]/g, "").slice(0, 500);
}

/**
 * Brief id -> title lookup used by the hamburger's Activity > Applied/Saved rows.
 * Both lists only carry ids, so without this every row fell back to a generic
 * "Quest #1" label. Mirrors CollabScreen's merge order: user briefs first, then
 * live briefs, then the static demo set — first writer wins per id.
 */
export function buildBriefTitleMap(
  userBriefs: { id?: unknown; title?: string }[],
  liveBriefs: { id?: unknown; title?: string }[] | null | undefined,
  fallbackBriefs: { id?: unknown; title?: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const b of userBriefs) if (b?.id != null && b.title) map[String(b.id)] = b.title;
  for (const b of (liveBriefs?.length ? liveBriefs : fallbackBriefs)) {
    if (b?.id != null && b.title && !map[String(b.id)]) map[String(b.id)] = b.title;
  }
  return map;
}

/** Unread badge = the larger of the local unread count and the server count. */
export function computeUnreadCount(
  activityFeed: { read?: boolean }[],
  serverNotifCount: number,
): number {
  return Math.max(activityFeed.filter(n => !n.read).length, serverNotifCount || 0);
}

