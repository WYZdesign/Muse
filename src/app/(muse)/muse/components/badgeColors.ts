// Badge color taxonomy — consistent meaning across all screens.
// Users learn: gold = primary, green = success, blue = info, lavender = premium, red = urgent.

export const BADGE_COLORS = {
  // Primary / featured / active state
  gold: {
    bg: "rgba(255,215,0,0.12)",
    bd: "rgba(255,215,0,0.25)",
    c: "var(--gold)",
  },
  // Informational / neutral / category
  blue: {
    bg: "rgba(100,181,246,0.12)",
    bd: "rgba(100,181,246,0.3)",
    c: "#90caf9",
  },
  // Premium / elevated / veteran / pro
  lavender: {
    bg: "rgba(212,165,255,0.14)",
    bd: "rgba(212,165,255,0.3)",
    c: "#e6d3ff",
  },
  // Success / active / joined / going
  green: {
    bg: "rgba(76,221,136,0.12)",
    bd: "rgba(76,221,136,0.3)",
    c: "#4cdd88",
  },
  // Urgent / NSFW / warning / alert
  red: {
    bg: "rgba(255,69,0,0.15)",
    bd: "rgba(255,69,0,0.3)",
    c: "#ff6b6b",
  },
  // Default / muted / inactive
  muted: {
    bg: "rgba(255,255,255,0.06)",
    bd: "rgba(255,255,255,0.12)",
    c: "var(--muted)",
  },
} as const;

export type BadgeColorKey = keyof typeof BADGE_COLORS;
