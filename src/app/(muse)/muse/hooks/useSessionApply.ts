"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Screen } from "../components/types";

/**
 * Auth/session restoration, extracted verbatim from page.tsx's `applySession`
 * useCallback. Pure relocation: every state setter, ref and module helper it
 * closed over is now supplied through a single options object so the hook does
 * not reach into page scope. The dependency array is unchanged, so the
 * callback identity/rerun semantics are identical to the original.
 */
export type UseSessionApplyArgs = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  supabase: SupabaseClient;
  safeSetItem: (key: string, value: string) => boolean;
  safeGetItem: (key: string) => string | null;
  safeRemoveItem: (key: string) => void;
  setRefreshToken: (tok: string) => void;
  clearRefreshToken: () => void;
  setAnalyticsUser: (profileId: string) => void;
  ensureMusePushRegistered: () => Promise<void>;
  OWNER_EMAIL: string;
  AGE_VERIFICATION_VALID_DAYS: number;
  setAuthUser: Dispatch<SetStateAction<{ id: string; email: string; profile?: { id: string; [key: string]: unknown } } | null>>;
  setCurrentUser: (updater: (prev: any) => any) => void;
  setPushEnabled: Dispatch<SetStateAction<boolean>>;
  setUserTier: Dispatch<SetStateAction<string>>;
  setAgeVerified: Dispatch<SetStateAction<boolean>>;
  setVerificationExpiringSoon: Dispatch<SetStateAction<boolean>>;
  setNotifPrefs: Dispatch<SetStateAction<Record<string, boolean>>>;
  setObStep: Dispatch<SetStateAction<number>>;
  setFilterStyles: Dispatch<SetStateAction<string[]>>;
  setFilterScore: Dispatch<SetStateAction<number>>;
  setDiscoveryPrefs: Dispatch<SetStateAction<{ ageMin: number; ageMax: number; distance: number; gender: string }>>;
  setSavedBriefs: Dispatch<SetStateAction<number[]>>;
  setAppliedBriefs: Dispatch<SetStateAction<number[]>>;
  setSavedSessionIds: Dispatch<SetStateAction<(string | number)[]>>;
  setSavedProfileIds: Dispatch<SetStateAction<(string | number)[]>>;
  setShowOnline: Dispatch<SetStateAction<boolean>>;
  setShowDistance: Dispatch<SetStateAction<boolean>>;
  setShowZodiac: Dispatch<SetStateAction<boolean>>;
  setShowAge: Dispatch<SetStateAction<boolean>>;
  setShowMbti: Dispatch<SetStateAction<boolean>>;
  setShowLifePath: Dispatch<SetStateAction<boolean>>;
  setShowChinese: Dispatch<SetStateAction<boolean>>;
  setShowMatchPercent: Dispatch<SetStateAction<boolean>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  syncingSdkSessionRef: { current: boolean };
};

export function useSessionApply({
  authFetch,
  supabase,
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
  setRefreshToken,
  clearRefreshToken,
  setAnalyticsUser,
  ensureMusePushRegistered,
  OWNER_EMAIL,
  AGE_VERIFICATION_VALID_DAYS,
  setAuthUser,
  setCurrentUser,
  setPushEnabled,
  setUserTier,
  setAgeVerified,
  setVerificationExpiringSoon,
  setNotifPrefs,
  setObStep,
  setFilterStyles,
  setFilterScore,
  setDiscoveryPrefs,
  setSavedBriefs,
  setAppliedBriefs,
  setSavedSessionIds,
  setSavedProfileIds,
  setShowOnline,
  setShowDistance,
  setShowZodiac,
  setShowAge,
  setShowMbti,
  setShowLifePath,
  setShowChinese,
  setShowMatchPercent,
  setScreen,
  syncingSdkSessionRef,
}: UseSessionApplyArgs) {
  const applySession = useCallback((accessToken: string, refreshToken?: string, attempt = 0, fromAuthStateChange = false) => {
      // Re-entrancy guard: if we're already in applySession from an auth-state-change callback,
      // skip the redundant setSession calls in the failure branches below.
      if (fromAuthStateChange) {
        // We already are in the chain triggered by authStateChange; we must not call setSession
        // here, which would cause an infinite loop. Return early.
        return;
      }
      // Refresh the session first — access tokens expire after 1hr, but refresh tokens
      // can silently fail (revoked, expired, etc). We try to get a fresh token before
      // validating so the user doesn't get bounced to login while actively using the app.
      let pendingToken = accessToken;
      let pendingRefresh = refreshToken || "";
      const doSessionCheck = () => {
        authFetch("/api/muse/auth", { method: "POST", body: JSON.stringify({ action: "session", access_token: pendingToken }) })
          .then(r => r.json().then(d => ({ status: r.status, d })))
          .then(({ status, d }) => {
            if (d.success && d.user) {
              const userObj = { id: d.user.id, email: d.user.email, profile: d.profile };
              setAuthUser(userObj);
              setAnalyticsUser(d.profile?.id || d.user.id);
              if (pendingRefresh) setRefreshToken(pendingRefresh);
              safeSetItem("muse_user", JSON.stringify({ access_token: pendingToken, refresh_token: pendingRefresh, user: userObj }));
              ensureMusePushRegistered();
              // Sync the Settings toggle with the browser's actual push
              // subscription state — previously always initialized to false
              // even when push was already active from a prior session.
              (async () => {
                try {
                  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
                    const reg = await navigator.serviceWorker.getRegistration();
                    const sub = await reg?.pushManager.getSubscription();
                    if (sub) setPushEnabled(true);
                  }
                } catch { console.debug("[muse] deferred client refresh failed"); }
              })();
              if (d.profile) {
                const isOwner = d.user.email === OWNER_EMAIL;
                const effTier = isOwner ? "muse_pro" : (d.profile.tier || "free");
                setCurrentUser(prev => {
                  // Merge server-persisted stats (source of truth across devices) with
                  // whatever's already in local state, taking the max per field so an
                  // active session's in-progress count is never clobbered backwards by
                  // a slightly-stale server value.
                  const serverStats = (d.profile.stats && typeof d.profile.stats === "object") ? d.profile.stats : {};
                  const mergedStats = { ...prev.stats };
                  for (const k of Object.keys(prev.stats) as (keyof typeof prev.stats)[]) {
                    const sv = serverStats[k];
                    if (typeof sv === "number" && sv > (mergedStats[k] || 0)) mergedStats[k] = sv;
                  }
                  return { ...prev, name: d.profile.name || prev.name, avatar: d.profile.avatar || prev.avatar, audience: d.profile.audience || "creative", type: d.profile.type || prev.type, foundingTier: isOwner ? "founding" : (d.profile.founding_tier || ""), proExpiresAt: isOwner ? "" : (d.profile.pro_expires_at || ""), tier: effTier, stats: mergedStats, status: d.profile.status ?? prev.status };
                });
                if (effTier) setUserTier(effTier);
                // Mirrors the server's isAgeVerificationCurrent (shared.ts) —
                // a verification older than AGE_VERIFICATION_VALID_DAYS is
                // treated as expired client-side too, so the same "show
                // AgeVerificationModal before a paid action" flow that already
                // exists naturally re-prompts for re-verification instead of
                // needing new UI. The server is still the real enforcement;
                // this only keeps the local gate from lying about it.
                if (d.profile.age_verified && d.profile.age_verified_at) {
                  const verifiedAt = new Date(d.profile.age_verified_at).getTime();
                  const isCurrent = !Number.isNaN(verifiedAt) && (Date.now() - verifiedAt < AGE_VERIFICATION_VALID_DAYS * 24 * 60 * 60 * 1000);
                  const daysSince = Number.isNaN(verifiedAt) ? 0 : (Date.now() - verifiedAt) / (24 * 60 * 60 * 1000);
                  setAgeVerified(isCurrent);
                  // Expiring in ≤30 days but still valid: warn with banner.
                  // isCurrent must hold here — an already-expired verification
                  // (isCurrent === false) is a separate, more severe state and
                  // must fall through to the red "expired" banner below, not
                  // get relabeled as the softer orange "expiring soon" one.
                  setVerificationExpiringSoon(isCurrent && daysSince >= (AGE_VERIFICATION_VALID_DAYS - 30) && daysSince < AGE_VERIFICATION_VALID_DAYS);
                }
                // Restore notifPrefs from server (source of truth across devices)
                if (d.profile.preferences?.notifications && typeof d.profile.preferences.notifications === "object") {
                  setNotifPrefs(prev => ({ ...prev, ...d.profile.preferences.notifications }));
                }
                // Restore obStep from server (cross-device onboarding resume)
                if (d.profile.preferences?.onboardingStep && typeof d.profile.preferences.onboardingStep === "number") {
                  setObStep(d.profile.preferences.onboardingStep);
                }
                // Restore filterStyles/filterScore from server (cross-device discovery filters)
                if (d.profile.preferences?.filterStyles && (Array.isArray(d.profile.preferences.filterStyles) || typeof d.profile.preferences.filterStyles === "string")) {
                  setFilterStyles(Array.isArray(d.profile.preferences.filterStyles) ? d.profile.preferences.filterStyles : d.profile.preferences.filterStyles.split(",").filter(Boolean));
                }
                if (d.profile.preferences?.filterScore != null && typeof d.profile.preferences.filterScore === "number") {
                  setFilterScore(d.profile.preferences.filterScore);
                }
                // Restore Discovery Preferences (age range/distance/gender) from
                // server — previously localStorage-only despite the Save button
                // claiming to save them, so a new device or cleared storage always
                // reset to the 18-50/50mi/all defaults.
                {
                  const dp = d.profile.preferences;
                  if (dp && (typeof dp.ageMin === "number" || typeof dp.ageMax === "number" || typeof dp.distance === "number" || typeof dp.gender === "string")) {
                    setDiscoveryPrefs(prev => ({
                      ageMin: typeof dp.ageMin === "number" ? dp.ageMin : prev.ageMin,
                      ageMax: typeof dp.ageMax === "number" ? dp.ageMax : prev.ageMax,
                      distance: typeof dp.distance === "number" ? dp.distance : prev.distance,
                      gender: typeof dp.gender === "string" ? dp.gender : prev.gender,
                    }));
                  }
                }
                if (d.profile.preferences?.savedBriefs && Array.isArray(d.profile.preferences.savedBriefs)) {
                  setSavedBriefs(d.profile.preferences.savedBriefs);
                }
                if (Array.isArray(d.profile.preferences?.appliedBriefs)) {
                  setAppliedBriefs(d.profile.preferences.appliedBriefs);
                }
                if (Array.isArray(d.profile.preferences?.savedSessionIds)) {
                  setSavedSessionIds(d.profile.preferences.savedSessionIds);
                }
                if (Array.isArray(d.profile.preferences?.savedProfileIds)) {
                  setSavedProfileIds(d.profile.preferences.savedProfileIds);
                }
                if (typeof d.profile.preferences?.showOnline === "boolean") {
                  setShowOnline(d.profile.preferences.showOnline);
                }
                if (typeof d.profile.preferences?.showDistance === "boolean") {
                  setShowDistance(d.profile.preferences.showDistance);
                }
                if (typeof d.profile.preferences?.showZodiac === "boolean") {
                  setShowZodiac(d.profile.preferences.showZodiac);
                }
                if (typeof d.profile.preferences?.showAge === "boolean") {
                  setShowAge(d.profile.preferences.showAge);
                }
                if (typeof d.profile.preferences?.showMbti === "boolean") {
                  setShowMbti(d.profile.preferences.showMbti);
                }
                if (typeof d.profile.preferences?.showLifePath === "boolean") {
                  setShowLifePath(d.profile.preferences.showLifePath);
                }
                if (typeof d.profile.preferences?.showChinese === "boolean") {
                  setShowChinese(d.profile.preferences.showChinese);
                }
                if (typeof d.profile.preferences?.showMatchPercent === "boolean") {
                  setShowMatchPercent(d.profile.preferences.showMatchPercent);
                }
                setScreen(prev => (prev === "auth" || prev === "onboard") ? (d.profile.name && d.profile.type ? "discover" : "onboard") : prev);
              } else {
                setScreen(prev => (prev === "auth") ? "onboard" : prev);
              }
            } else {
              // Retry once before giving up — network hiccup, not invalid token
              if (attempt < 1) {
                setTimeout(() => { try { applySession(accessToken, refreshToken, attempt + 1); } catch { console.debug("[muse] session retry could not be scheduled"); } }, 1000);
                return;
              }
              // Suspended accounts were silently bounced to the login screen with no
              // explanation — tell the user why, and clear the dead token so reloads
              // don't loop through the same rejection. (Event, not showToast: this
              // callback is defined before showToast's declaration.)
              if (d.code === "ACCOUNT_SUSPENDED") {
                try { safeRemoveItem("muse_user"); } catch { console.debug("[muse] suspended session could not be cleared from storage"); }
                clearRefreshToken();
                try { window.dispatchEvent(new CustomEvent("muse:toast", { detail: "Your account has been suspended. Contact support@wyzdesign.com" })); } catch { console.debug("[muse] suspension toast event could not be dispatched"); }
                setAuthUser(null);
                setScreen("auth");
              } else if (status === 401) {
                // Server explicitly rejected the token itself (getUser() failed) —
                // this is the only case that actually means "not logged in."
                setAuthUser(null);
                setScreen("auth");
              } else {
                // Anything else (429 rate-limited, 500, a malformed response, etc.)
                // is a failure of THIS check, not proof the token is invalid — the
                // token in storage is untouched and may well still be good. Bouncing
                // to the login screen here was the "logged out even though I'm
                // logged in" bug: a single flaky /api/muse/auth call (e.g. hitting
                // the 30/window session rate limit after repeated app opens) wiped
                // authUser and forced the auth screen even though nothing about the
                // session was actually invalid. Leave the current screen/authUser
                // alone; real API calls elsewhere already handle their own 401s via
                // authFetch's refresh-and-retry, and a genuinely dead token will
                // surface there instead of on every load.
                try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); }
                return;
              }
            }
            // Session resolved — splash can hide regardless of outcome
            try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); }
          })
          .catch(() => {
            if (attempt < 1) {
              setTimeout(() => { try { applySession(accessToken, refreshToken, attempt + 1); } catch { console.debug("[muse] session retry could not be scheduled"); } }, 1000);
            } else {
              try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); }
            }
          });
      };
      // Sync the SDK's own client-side session without re-entering applySession:
      // setSession() fires the onAuthStateChange "SIGNED_IN" listener, which
      // would otherwise call applySession() again — and if refreshSession()
      // above keeps failing with the same dead refresh token, that becomes an
      // unbounded setSession -> SIGNED_IN -> applySession -> setSession loop
      // that never throws (see syncingSdkSessionRef's declaration comment).
      // The listener clears the flag itself once it sees the echoed event;
      // this timeout is just a safety net in case that event never fires at
      // all (e.g. the call rejects before emitting anything).
      const syncSdkSession = (token: string, refresh: string) => {
        syncingSdkSessionRef.current = true;
        setTimeout(() => { syncingSdkSessionRef.current = false; }, 5000);
        supabase.auth.setSession({ access_token: token, refresh_token: refresh }).catch(() => {});
      };
      // If we have a refresh token, try to get a fresh session first
      // A definitively dead refresh token (already rotated/consumed, revoked,
      // or genuinely expired — GoTrue's "invalid_grant" / "Refresh Token Not
      // Found" family of errors) is not a transient hiccup worth retrying: on
      // top of our own logic, the SDK's autoRefreshToken background timer
      // (src/lib/supabase.ts) will keep retrying the SAME dead token on its
      // own schedule for as long as it holds one, independent of anything
      // here — confirmed live (a stale token produces a steady drip of
      // internal supabase-js refresh calls for the rest of the session).
      // Recognize this case and log out cleanly instead of feeding the SDK a
      // token we already know will never work.
      const isDeadRefreshTokenError = (err: unknown): boolean => {
        const msg = String(err instanceof Error ? err.message : err || "").toLowerCase();
        return msg.includes("refresh_token_not_found") || msg.includes("invalid_grant") || msg.includes("invalid refresh token") || msg.includes("refresh token not found") || msg.includes("already used");
      };
      const cleanLogoutDeadToken = () => {
        // Multi-tab/multi-device guard: Supabase rotates the refresh token on
        // every use, so if the SAME account is open in another tab (or the
        // installed PWA alongside a browser tab) and that tab refreshed first,
        // OUR refresh token is now "already used" even though the account is
        // still very much logged in — just somewhere else. Before nuking this
        // tab's session, check whether muse_user in localStorage already holds
        // a newer token than the one we just tried (another tab's TOKEN_REFRESHED
        // handler writes there — see below) and silently adopt it instead of
        // bouncing to the auth screen. This is the fix for "logs me out too
        // often" when the account is open in more than one place at once.
        try {
          const raw = safeGetItem("muse_user");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.access_token && parsed.access_token !== pendingToken) {
              pendingToken = parsed.access_token;
              pendingRefresh = parsed.refresh_token || "";
              if (pendingRefresh) setRefreshToken(pendingRefresh);
              syncSdkSession(pendingToken, pendingRefresh);
              doSessionCheck();
              return;
            }
          }
        } catch { console.debug("[muse] remote sign-out cleanup failed"); }
        try { safeRemoveItem("muse_user"); } catch { console.debug("[muse] local session could not be cleared"); }
        try { clearRefreshToken(); } catch { console.debug("[muse] refresh token could not be cleared"); }
        // scope:'local' clears the SDK's own in-memory/persisted session and
        // cancels its autoRefreshToken timer without a network round-trip —
        // exactly what's needed here since the token is already known-dead.
        try { supabase.auth.signOut({ scope: "local" }).catch(() => console.debug("[muse] local Supabase sign-out failed")); } catch { console.debug("[muse] local Supabase sign-out could not start"); }
        setAuthUser(null);
        setScreen("auth");
        try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); }
      };
      if (pendingRefresh) {
        supabase.auth.refreshSession({ refresh_token: pendingRefresh })
          .then(({ data: { session }, error }) => {
            if (session?.access_token) {
              pendingToken = session.access_token;
              pendingRefresh = session.refresh_token || pendingRefresh;
              // Update storage with fresh tokens
              safeSetItem("muse_user", JSON.stringify({ access_token: pendingToken, refresh_token: pendingRefresh }));
              setRefreshToken(pendingRefresh);
              doSessionCheck();
            } else if (isDeadRefreshTokenError(error)) {
              cleanLogoutDeadToken();
            } else {
              // Refresh failed, fall back to original token. The SDK's own
              // session was never set in this branch (refreshSession() only
              // populates it on success) — without an explicit setSession
              // here, supabase.auth.getSession()/onAuthStateChange never see
              // a live session, so the TOKEN_REFRESHED auto-sync above never
              // fires for this login and the client silently stops being able
              // to tell the SDK apart from "logged out" (see doLogout's
              // signOut() comment — it depends on the SDK actually holding a
              // session to have anything to clear).
              //
              // Deliberately pass "" for the refresh token here, NOT
              // pendingRefresh: we just learned pendingRefresh doesn't work.
              // The SDK (createClient with autoRefreshToken: true, see
              // src/lib/supabase.ts) schedules its OWN internal background
              // refresh using whatever refresh token setSession() hands it —
              // re-arming it with the same dead token here just makes the SDK
              // independently retry-and-fail on its own timer forever, on top
              // of (and regardless of) our own retry logic above. Access token
              // alone is enough for realtime/RLS; there's nothing usable to
              // refresh with, so don't hand the SDK a token we know is dead.
              syncSdkSession(pendingToken, "");
              doSessionCheck();
            }
          })
          .catch((err) => {
            if (isDeadRefreshTokenError(err)) {
              cleanLogoutDeadToken();
              return;
            }
            // Refresh failed, fall back to original token — same reasoning as above.
            syncSdkSession(pendingToken, "");
            doSessionCheck();
          });
      } else {
        // No refresh token — still give the SDK the access token so its own
        // session state matches what we're actually treating as logged in.
        syncSdkSession(pendingToken, pendingRefresh);
        doSessionCheck();
      }
    }, [setAppliedBriefs, setFilterScore, setFilterStyles, setObStep, setSavedBriefs, setSavedProfileIds, setSavedSessionIds]);
  return applySession;
}
