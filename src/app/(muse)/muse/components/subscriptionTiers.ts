// Audit fix (2026-09-08): several client-side "is this user Pro" checks used
// a strict `tier === "muse_pro"` comparison, so a muse_studio subscriber (a
// higher paid tier added in the boost/discovery-gaps backend round) would be
// treated as Free — blurred Likes photos, a "PRO" upsell badge, and a "Free"
// plan label despite paying more than Pro. The server side already treats
// muse_studio as Pro-equivalent everywhere (misc.ts's getBoostStatus,
// spendBoost, and the Stripe webhook's KNOWN_TIERS) — this is the one place
// client code should ask the same question, instead of each screen
// reimplementing (and drifting from) that allowlist.
//
// Plain, non-JSX module so this can be unit-tested directly (same pattern as
// sessionTiers.ts / searchMatch.ts).
export function isPaidTier(tier: string | null | undefined): boolean {
  return tier === "muse_pro" || tier === "pro" || tier === "muse_studio";
}
