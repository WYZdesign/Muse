/** Social connection hook: fetches the connected-accounts status on mount and handles the OAuth return query parameter with a success toast. */
"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { getAccessToken } from "../lib/api";
import { MUSE_CLOSED_BETA_HIDE_SOCIAL } from "@/lib/config";

/**
 * Social-connection lifecycle, extracted verbatim from page.tsx: fetching the
 * server-side connected-accounts status on mount, and handling the OAuth
 * `?connected=` return. The mount fetch originally sat much earlier (before
 * showToast was declared); it now runs at the OAuth effect's position, where
 * showToast is in scope, so both live in one hook. Internal order and dep
 * arrays are unchanged.
 */
export type SocialToastInput = string | { msg: string; onTap?: () => void; type?: "info" | "success" | "error" };

export type UseSocialConnectionArgs = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  setObConnectedSocials: Dispatch<SetStateAction<Record<string, boolean>>>;
  showToast: (msg: SocialToastInput) => void;
};

export function useSocialConnection({
  authFetch,
  setObConnectedSocials,
  showToast,
}: UseSocialConnectionArgs) {
  // Fetch connected accounts status from server on mount (overrides stale localStorage).
  // Social is hidden during closed beta, where this call is pointless. When it
  // is not hidden, wait for the session token before calling: the mount effect
  // runs before the token is attached, so firing immediately sent an
  // unauthenticated request that always 401'd and logged a console error on
  // every load (observed live on /muse).
  useEffect(() => {
    if (MUSE_CLOSED_BETA_HIDE_SOCIAL) return;
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      if (cancelled) return;
      if (!getAccessToken()) {
        if (++tries > 40) return; // ~10s, then give up quietly
        setTimeout(tick, 250);
        return;
      }
      try {
        const r = await authFetch("/api/muse/social?action=status");
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled && d?.connected) setObConnectedSocials(d.connected);
      } catch {
        // Best effort; localStorage state is the fallback.
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [authFetch, setObConnectedSocials]);

  // Check for OAuth callback on mount. Was previously (incorrectly) a React.useEffect
  // call nested inside loadState's async body — a Rules-of-Hooks violation that threw
  // "Invalid hook call" any time a returning user had persisted state, i.e. almost
  // every real login/reload. Hoisted to a proper top-level effect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected) {
      setObConnectedSocials(prev => ({ ...prev, [connected]: true }));
      showToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setObConnectedSocials, showToast]);
}
