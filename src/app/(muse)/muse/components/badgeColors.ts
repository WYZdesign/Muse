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

export type ProBadge = { icon: string; label: string; c: string; bg: string; bd: string };

// Shared badge-derivation logic for a "Professional" card — used by both
// NetworkScreen's pro-card list and its detail modal. These two call sites
// previously duplicated this exact if/else chain, with the modal re-deriving
// its own hardcoded hex colors instead of sharing BADGE_COLORS (the "Pro"
// badge alone had two different gold hex values depending on which view you
// were in). Consolidated here so both views always agree on which badges
// show and what color each one is.
export function buildProfessionalBadges(
  p: { exp?: string | number | null; openings?: number | null; skills?: string[] | null },
  opts: { connected?: boolean } = {}
): ProBadge[] {
  const badges: ProBadge[] = [];
  const yrs = parseInt(String(p.exp ?? ""), 10) || 0;
  if (yrs >= 10) badges.push({ icon: "🏅", label: "Pro", ...BADGE_COLORS.gold });
  else if (yrs >= 5) badges.push({ icon: "⭐", label: "Experienced", ...BADGE_COLORS.lavender });
  else badges.push({ icon: "🌱", label: "Rising", ...BADGE_COLORS.blue });
  if ((p.openings ?? 0) >= 5) badges.push({ icon: "🔥", label: "Hiring", ...BADGE_COLORS.red });
  const skills = p.skills || [];
  if (skills.includes("Fashion") || skills.includes("Editorial")) badges.push({ icon: "👗", label: "Fashion", ...BADGE_COLORS.lavender });
  if (skills.includes("Commercial") || skills.includes("Branding")) badges.push({ icon: "💼", label: "Commercial", ...BADGE_COLORS.gold });
  if (skills.includes("Music Video") || skills.includes("Film")) badges.push({ icon: "🎬", label: "Film", ...BADGE_COLORS.red });
  if (skills.includes("Fine Art") || skills.includes("Body Art")) badges.push({ icon: "🎨", label: "Fine Art", ...BADGE_COLORS.lavender });
  if (skills.includes("Experimental")) badges.push({ icon: "🧪", label: "Experimental", ...BADGE_COLORS.blue });
  if (skills.includes("Photography") || skills.includes("Editorial")) badges.push({ icon: "📸", label: "Photo", ...BADGE_COLORS.blue });
  if (opts.connected) badges.push({ icon: "🤝", label: "Connected", ...BADGE_COLORS.green });
  return badges;
}
