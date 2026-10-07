"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeoResult } from "@/app/muse-realtime";
import type { OnboardingData } from "./useAuthOnboardingState";

/**
 * One-shot bootstrap/hydration, extracted verbatim from page.tsx's mount
 * useEffect. Handles the build-version stale-code check (SW + cache purge +
 * hard reload), localStorage hydration via loadState, the remote cache-version
 * kill-switch, geolocation capture, checkout-return toasts, referral restore,
 * session application and the Supabase auth-state listener. Pure relocation:
 * every state setter, ref and module helper it closed over is supplied through
 * a single options object, so the hook does not reach into page scope. The
 * effect still registers exactly once (empty dependency array) at the same
 * point in the component's effect order, so hydration/reload semantics are
 * identical to the original.
 */
export type UseBootstrapHydrationArgs = {
  loadStateRef: { current: boolean };
  sessionAppliedRef: { current: boolean };
  syncingSdkSessionRef: { current: boolean };
  loadState: () => Promise<void>;
  initAnalyticsSession: () => void;
  getGeolocation: () => Promise<GeoResult>;
  safeSetItem: (key: string, value: string) => boolean;
  safeGetItem: (key: string) => string | null;
  safeRemoveItem: (key: string) => void;
  showToast: (msg: string) => void;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  setObData: Dispatch<SetStateAction<OnboardingData>>;
  supabase: SupabaseClient;
  applySession: (accessToken: string, refreshToken?: string, attempt?: number, fromAuthStateChange?: boolean) => void;
  getRefreshToken: () => string;
  bootstrapData: () => Promise<void>;
  setDiscoverLoading: Dispatch<SetStateAction<boolean>>;
  setRefreshToken: (tok: string) => void;
};

export function useBootstrapHydration({
  loadStateRef,
  sessionAppliedRef,
  syncingSdkSessionRef,
  loadState,
  initAnalyticsSession,
  getGeolocation,
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
  showToast,
  apiFetch,
  setObData,
  supabase,
  applySession,
  getRefreshToken,
  bootstrapData,
  setDiscoverLoading,
  setRefreshToken,
}: UseBootstrapHydrationArgs) {
  const [hydrated, setHydrated] = useState(false);
  const [myGeo, setMyGeo] = useState<{ lat: number; long: number; city: string; state: string; requiresIdVerification: boolean } | null>(null);

  useEffect(() => {
    if (loadStateRef.current) return;
    loadStateRef.current = true;

    // Build-version check: if stale code is detected, clear SW + caches and hard reload.
    // App Router does not set __NEXT_DATA__.buildId, so derive the deploy fingerprint
    // from Vercel's dpl= query param on the first /_next/ static chunk URL — it changes
    // on every deployment.
    try {
      const script = document.querySelector<HTMLScriptElement>('script[src*="/_next/static/"]');
      const m = script?.src.match(/dpl=([^&"']+)/);
      const bid = m ? m[1] : null;
      if (bid) {
        const prev = sessionStorage.getItem("muse_build");
        if (prev && prev !== bid) {
          sessionStorage.setItem("muse_build", bid);
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              regs.forEach(r => r.unregister());
              caches.keys().then(ks => {
                ks.forEach(k => caches.delete(k));
                window.location.reload();
              });
            });
          } else {
            window.location.reload();
          }
          return;
        }
        sessionStorage.setItem("muse_build", bid);
      }
    } catch { console.debug("[muse] startup data refresh failed"); }

    try { sessionStorage.setItem("muse_loaded", "1"); } catch { console.debug("[muse] load marker could not be persisted"); }
    loadState();
    initAnalyticsSession();
    setHydrated(true);
    try { window.dispatchEvent(new CustomEvent("muse:hydrated")); } catch { console.debug("[muse] hydrated event could not be dispatched"); }

    // Remote kill-switch: if MUSE_CACHE_VERSION changed server-side, purge SW +
    // caches and reload once. Non-blocking; only acts on an actual mismatch.
    try {
      const purgeAndReload = () => {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => r.unregister());
            caches.keys().then(ks => {
              ks.forEach(k => caches.delete(k));
              window.location.reload();
            });
          });
        } else {
          window.location.reload();
        }
      };
      fetch("/api/muse/cache-version", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .then((d: { version?: string } | null) => {
          if (!d || !d.version) return;
          const prev = sessionStorage.getItem("muse_cache_version");
          if (prev && prev !== d.version) {
            sessionStorage.setItem("muse_cache_version", d.version);
            purgeAndReload();
            return;
          }
          sessionStorage.setItem("muse_cache_version", d.version);
        })
        .catch(() => {});
    } catch { console.debug("[muse] scene preference could not be restored"); }

    // Capture geolocation for distance matching (best-effort, silent on denial).
    getGeolocation().then(g => { if (g) { setMyGeo(g); try { safeSetItem("muse_geo", JSON.stringify(g)); } catch { console.debug("[muse] location could not be persisted"); } } })
      .catch(() => { /* silently handled */ });

    // Handle post-checkout return: refresh tier from server
    const params = new URLSearchParams(window.location.search);
    const upgraded = params.get("upgraded");
    if (upgraded) showToast("Welcome to Musa " + (upgraded.charAt(0).toUpperCase() + upgraded.slice(1)) + "! ✨");

    // Handle Stripe Connect onboarding return
    const connected = params.get("connected");
    if (connected === "true") showToast("Stripe account connected! You can now receive payments. 💰");

    // Handle booking-checkout return (create-booking-checkout success_url/cancel_url)
    const paymentResult = params.get("payment");
    if (paymentResult === "success") showToast("Payment successful! Your session is booked. 🎉");
    else if (paymentResult === "cancelled") showToast("Payment cancelled");

    // Handle boost-checkout return (create-boost-checkout success_url/cancel_url).
    // The webhook only marks the purchase row "paid" — boost-purchase-complete
    // is what actually grants the credits, so it must be called here with the
    // purchaseId stashed before the redirect (see SubscriptionScreen buy-boost).
    const boostResult = params.get("boost");
    if (boostResult === "success") {
      const pendingBoostId = safeGetItem("muse_pending_boost_purchase");
      if (pendingBoostId) {
        apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "boost-purchase-complete", purchaseId: pendingBoostId }) })
          .then(r => r.json())
          .then(d => {
            if (d?.success) showToast("Boost credit added! ⚡");
            else if (d?.code === "NOT_PAID") showToast("Payment still processing — your boost will appear shortly");
            else showToast(d?.error || "Couldn't confirm boost purchase — contact support if you were charged");
          })
          .catch(() => showToast("Couldn't confirm boost purchase — contact support if you were charged"))
          .finally(() => { try { safeRemoveItem("muse_pending_boost_purchase"); } catch { console.debug("[muse] pending boost marker could not be cleared"); } });
      } else {
        showToast("Boost purchase successful! ⚡");
      }
    } else if (boostResult === "cancelled") {
    try { safeRemoveItem("muse_pending_boost_purchase"); } catch { console.debug("[muse] pending boost marker could not be cleared"); }
      showToast("Boost purchase cancelled");
    }

    // Handle referral code from URL
    const refCode = params.get("ref");
    if (refCode) {
      setObData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
      safeSetItem("muse_referral_code", refCode.toUpperCase());
    } else {
      // Load stored referral code from localStorage
      try {
        const stored = safeGetItem("muse_referral_code");
        if (stored) setObData(prev => ({ ...prev, referralCode: stored }));
      } catch { console.debug("[muse] referral code could not be restored"); }
    }

    // Handle OAuth redirect: Supabase returns tokens in URL hash or via getSession
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          if (!sessionAppliedRef.current) { sessionAppliedRef.current = true; applySession(session.access_token, session.refresh_token); }
          // Clean OAuth params from URL
          if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
            window.history.replaceState({}, document.title, "/muse");
          }
          return;
        }
      } catch { console.debug("[muse] persisted auth state could not be restored"); }

      const savedUser = safeGetItem("muse_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.access_token && !sessionAppliedRef.current) { sessionAppliedRef.current = true; applySession(parsed.access_token, getRefreshToken() || parsed.refresh_token || ""); }
        } catch { console.debug("[muse] persisted session could not be parsed"); }
      } else {
        // No session and no saved user — new visitor, show auth after brief splash
        setTimeout(() => { try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); } }, 1500);
      }
    })();

    // Pull real catalog data (profiles/briefs/feed/forum/events) with static fallback.
    bootstrapData();

    // Hard fallback: if bootstrapData hangs (network error, API unresponsive),
    // the UI must still become interactive after 30 seconds. Without this,
    // a stuck fetch leaves discoverLoading=true forever and the entire
    // Discover screen renders as a frozen blank state.
    setTimeout(() => { setDiscoverLoading(false); }, 30000);

    // Listen for auth state changes (OAuth completion)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.access_token) {
        // This SIGNED_IN is the echo of applySession's own internal
        // setSession() call (see syncingSdkSessionRef's declaration comment)
        // — applySession already ran doSessionCheck() for this exact token,
        // so re-entering it here would loop forever whenever the refresh
        // token keeps failing. Swallow it once and move on.
        if (syncingSdkSessionRef.current) {
          syncingSdkSessionRef.current = false;
          return;
        }
        if (sessionAppliedRef.current) {
          sessionAppliedRef.current = false;
        }
        sessionAppliedRef.current = true;
        applySession(session.access_token, session.refresh_token);
      }
      // Keep the cached token fresh — supabase-js auto-refreshes its own copy
      // but only SIGNED_IN was handled here, so after the JWT TTL every cached-
      // token API call silently 401'd even though a valid refreshed token existed.
      if (event === "TOKEN_REFRESHED" && session?.access_token) {
        try {
          const raw = safeGetItem("muse_user");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.access_token && parsed.access_token !== session.access_token) {
              if (session.refresh_token) setRefreshToken(session.refresh_token);
              safeSetItem("muse_user", JSON.stringify({
                ...parsed,
                access_token: session.access_token,
                refresh_token: session.refresh_token || parsed.refresh_token,
              }));
            }
          }
    } catch { console.debug("[muse] safety state refresh failed"); }
      }
    });
    return () => { authListener?.subscription?.unsubscribe(); };
  // This installs one subscription for the component lifetime. Including the
  // bootstrap callback would re-register it whenever bootstrapped data changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { hydrated, myGeo };
}
