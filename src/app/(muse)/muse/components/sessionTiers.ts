// Tier badges (audit finding taskrabbit-p2-2 — Torreé asked for a small
// ladder of tiers rather than one flat badge). Auto-computed entirely from
// data Muse already tracks (completed sessions + average rating) — no admin
// curation, nothing that can go stale, no new schema. Deliberately no badge
// below "Rising Muse": a visible low tier reads as a demerit for creatives
// still building a track record, which would work against onboarding new
// hosts. Only the single highest tier a listing qualifies for is shown.
//
// Pulled out of SessionsScreen.tsx into its own plain (non-JSX) module so
// the threshold logic can be unit-tested directly, the same way
// normalizers.ts is tested, without pulling React/next/image into a test.
export const SESSION_TIERS = [
  { key: "elite", label: "Muse Elite", icon: "✦", minSessions: 25, minRating: 4.8, bg: "rgba(255,215,0,0.16)", border: "rgba(255,215,0,0.4)", color: "var(--gold)" },
  { key: "top", label: "Top Rated", icon: "★", minSessions: 10, minRating: 4.5, bg: "rgba(255,215,0,0.14)", border: "rgba(255,215,0,0.35)", color: "var(--gold)" },
  { key: "rising", label: "Rising Muse", icon: "◆", minSessions: 3, minRating: 4.0, bg: "rgba(212,165,255,0.14)", border: "rgba(212,165,255,0.3)", color: "var(--lavender)" },
] as const;

export type SessionTier = typeof SESSION_TIERS[number];

export function sessionTier(s: { hostCompletedSessions?: number; rating?: number }): SessionTier | null {
  const sessions = s.hostCompletedSessions ?? 0;
  const rating = s.rating ?? 0;
  return SESSION_TIERS.find(t => sessions >= t.minSessions && rating >= t.minRating) ?? null;
}
