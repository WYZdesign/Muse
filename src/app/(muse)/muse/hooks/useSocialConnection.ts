"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

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
  // Fetch connected accounts status from server on mount (overrides stale localStorage)
  useEffect(() => {
    authFetch("/api/muse/social?action=status")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.connected) setObConnectedSocials(d.connected); })
      .catch(() => {});
  }, [setObConnectedSocials]);

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
