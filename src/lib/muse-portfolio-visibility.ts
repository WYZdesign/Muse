// ══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO VISIBILITY — server-side enforcement of the owner's privacy choice.
//
// The owner's choice is stored in `muse_profiles.preferences.portfolioVisibility`
// (jsonb). The client's Settings → Portfolio Settings screen writes exactly these
// three values — see SettingsScreen.tsx's radio options:
//   "everyone"  — any signed-in Musa member may view the portfolio
//   "matches"   — only a user the owner has mutually matched with
//   "private"   — only the owner
// Absent / unknown falls back to "everyone" (the client default), so users who
// never opened the screen keep the behaviour they've always had.
//
// This is the OUTER gate on a user's portfolio. The per-album
// `muse_albums.access_level` (public | invite | private) still applies INSIDE it,
// so making the portfolio "matches" does not implicitly grant access to an album
// that was marked invite-only. Vocabulary bridge to the album column is the single
// explicit map in `albumAccessEquivalent()` below.
//
// SECURITY: the read routes use the service-role client, which bypasses RLS by
// design. Application code is therefore the ONLY enforcement point. Every server
// path that returns another user's albums/photos must consult `resolvePortfolioGate`
// before returning rows, and must never emit a private storage locator/signed URL
// to a viewer the gate denies.
// ══════════════════════════════════════════════════════════════════════════════
import type { getServiceClient } from "@/lib/supabase";

type Sb = ReturnType<typeof getServiceClient>;

export type PortfolioVisibility = "everyone" | "matches" | "private";

export const PORTFOLIO_VISIBILITY_KEY = "portfolioVisibility";
export const DEFAULT_PORTFOLIO_VISIBILITY: PortfolioVisibility = "everyone";

/** Canonicalise any stored value to the client's vocabulary. Unknown == default. */
export function normalizePortfolioVisibility(raw: unknown): PortfolioVisibility {
  return raw === "private" || raw === "matches" ? raw : DEFAULT_PORTFOLIO_VISIBILITY;
}

/** Read the preference off a `muse_profiles.preferences` blob. */
export function portfolioVisibilityFromPreferences(preferences: unknown): PortfolioVisibility {
  if (!preferences || typeof preferences !== "object") return DEFAULT_PORTFOLIO_VISIBILITY;
  return normalizePortfolioVisibility((preferences as Record<string, unknown>)[PORTFOLIO_VISIBILITY_KEY]);
}

/**
 * The ONE place the client's portfolio vocabulary is bridged to the
 * `muse_albums.access_level` vocabulary (public | invite | private).
 * everyone → public, matches → invite (matches the "who, explicitly" semantics),
 * private → private.
 */
export function albumAccessEquivalent(visibility: PortfolioVisibility): "public" | "invite" | "private" {
  if (visibility === "private") return "private";
  if (visibility === "matches") return "invite";
  return "public";
}

/** Load the owner's portfolio visibility (defaults to everyone on any failure). */
export async function getProfilePortfolioVisibility(sb: Sb, ownerId: string): Promise<PortfolioVisibility> {
  const { data } = await sb.from("muse_profiles").select("preferences").eq("id", ownerId).maybeSingle();
  return portfolioVisibilityFromPreferences((data as { preferences?: unknown } | null)?.preferences);
}

/**
 * True only for a MUTUAL match: both the viewer→owner and owner→viewer like
 * rows exist. `muse_matches` stores one-directional likes, so a single row is
 * "someone liked someone", not a match — the same reciprocal rule matchCreate
 * uses to decide `matched`.
 */
export async function areMutuallyMatched(sb: Sb, viewerId: string, ownerId: string): Promise<boolean> {
  if (!viewerId || !ownerId || viewerId === ownerId) return false;
  const { data } = await sb.from("muse_matches")
    .select("user_id, target_id")
    .or(`and(user_id.eq.${viewerId},target_id.eq.${ownerId}),and(user_id.eq.${ownerId},target_id.eq.${viewerId})`);
  const rows = (data || []) as { user_id?: unknown; target_id?: unknown }[];
  const viewerLikesOwner = rows.some((r) => String(r.user_id) === viewerId && String(r.target_id) === ownerId);
  const ownerLikesViewer = rows.some((r) => String(r.user_id) === ownerId && String(r.target_id) === viewerId);
  return viewerLikesOwner && ownerLikesViewer;
}

export type PortfolioGate = { allowed: boolean; visibility: PortfolioVisibility };

/**
 * Decide whether `viewerId` may see ANY of `ownerId`'s portfolio. The owner
 * always passes (and no lookup is done for them). Every other viewer is gated by
 * the owner's preference; "matches" additionally requires a real mutual match.
 */
export async function resolvePortfolioGate(
  sb: Sb,
  ownerId: string,
  viewerId: string | null | undefined,
): Promise<PortfolioGate> {
  const isOwner = !!viewerId && String(viewerId) === String(ownerId);
  if (isOwner) return { allowed: true, visibility: DEFAULT_PORTFOLIO_VISIBILITY };
  const visibility = await getProfilePortfolioVisibility(sb, ownerId);
  if (visibility === "private") return { allowed: false, visibility };
  if (visibility === "matches") {
    const matched = await areMutuallyMatched(sb, String(viewerId ?? ""), String(ownerId));
    return { allowed: matched, visibility };
  }
  return { allowed: true, visibility };
}
