/** Single tier vocabulary shared by client UI and server-side entitlement gates. */

export const PAID_TIER_IDS = ["muse_pro", "pro", "muse_studio"] as const;

const PAID_TIERS = new Set<string>(PAID_TIER_IDS);

export function isPaidTier(tier: string | null | undefined): boolean {
  return !!tier && PAID_TIERS.has(tier);
}

/** Studio-only tier (saved-talent-list caps, priority support, etc.) — a
 *  strict subset of the paid tiers above. Kept here, not redefined per
 *  call site, so a future Studio alias only needs to be added once. */
export const STUDIO_TIER_IDS = ["muse_studio"] as const;

const STUDIO_TIERS = new Set<string>(STUDIO_TIER_IDS);

export function isStudioTier(tier: string | null | undefined): boolean {
  return !!tier && STUDIO_TIERS.has(tier);
}
