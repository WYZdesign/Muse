/** Single tier vocabulary shared by client UI and server-side entitlement gates. */

export const PAID_TIER_IDS = ["muse_pro", "pro", "muse_studio"] as const;

const PAID_TIERS = new Set<string>(PAID_TIER_IDS);

export function isPaidTier(tier: string | null | undefined): boolean {
  return !!tier && PAID_TIERS.has(tier);
}
