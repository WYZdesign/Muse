"use client";

import { useEffect, useRef } from "react";

/**
 * Session refresh / expiry listeners, extracted verbatim from page.tsx's three
 * effects: cross-tab storage sync (another tab's TOKEN_REFRESHED adopting the
 * fresh token), the `muse:session-expired` logout handler, and the re-arm of
 * its once-per-dead-session guard on each fresh login. sessionExpiredHandledRef
 * moves with them. Internal order, guards and dependency arrays are unchanged.
 *
 * Placement note: the hook is called where the expiry pair originally sat (so
 * `doLogout` is already declared — it is a later useCallback than the storage
 * effect was). The storage effect therefore runs in the same commit a few
 * effects later than before; it only registers a window listener, so this is
 * behaviour-neutral.
 */
export type UseSessionRefreshArgs = {
  applySession: (accessToken: string, refreshToken?: string, attempt?: number, fromAuthStateChange?: boolean) => void;
  setRefreshToken: (tok: string) => void;
  doLogout: (message?: string) => void;
  authUser: unknown;
};

export function useSessionRefresh({
  applySession,
  setRefreshToken,
  doLogout,
  authUser,
}: UseSessionRefreshArgs) {
  // Cross-tab session sync: when the SAME browser has this account open in
  // more than one tab (or the installed PWA running alongside a regular
  // browser tab), each tab refreshes its access token on its own 1hr timer.
  // Supabase rotates the refresh token on every use, so whichever tab
  // refreshes second gets an "already used" error on a token another tab
  // already rotated away — previously that read as a dead session and force-
  // logged that tab out even though the account was still perfectly logged
  // in next door. The `storage` event fires in every OTHER tab the instant
  // one tab's TOKEN_REFRESHED handler (above) writes the new tokens to
  // muse_user, so listening for it lets every other tab adopt the fresh
  // token proactively instead of racing its own stale one and losing.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "muse_user" || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.access_token) {
          if (parsed.refresh_token) setRefreshToken(parsed.refresh_token);
          applySession(parsed.access_token, parsed.refresh_token || "");
        }
      } catch { console.debug("[muse] client preference refresh failed"); }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applySession]);

  // authFetch (lib/api.ts) dispatches this when a request 401s, the user HAD
  // a token, and a refresh attempt still couldn't produce a usable one — the
  // session is genuinely dead (e.g. an expired access token surviving in
  // localStorage while sessionStorage's refresh token is gone). Without this,
  // every caller just shows its own generic "X failed" toast with no hint
  // that re-login is what's actually needed (found via Sessions' "Book
  // Session", but authFetch is used for every authenticated action, so it
  // isn't Sessions-specific). Multiple in-flight requests can all 401 at
  // once, so guard against logging out more than once per dead session.
  const sessionExpiredHandledRef = useRef(false);
  useEffect(() => {
    const onSessionExpired = () => {
      if (sessionExpiredHandledRef.current) return;
      sessionExpiredHandledRef.current = true;
      doLogout("Your session expired — please log in again");
    };
    window.addEventListener("muse:session-expired", onSessionExpired);
    return () => window.removeEventListener("muse:session-expired", onSessionExpired);
  }, [doLogout]);
  // Re-arm the guard above on every fresh login, so a session that expires,
  // gets logged out, and is then logged back into (same tab) still gets the
  // clear "please log in again" handling if THAT session later expires too.
  useEffect(() => { if (authUser) sessionExpiredHandledRef.current = false; }, [authUser]);
}
