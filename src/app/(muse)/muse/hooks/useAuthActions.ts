"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { CurrentUser, AuthUser } from "../page-models";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Screen } from "../components/types";
import { analytics } from "../lib/analytics";
import { fetchWithTimeout } from "../lib/api";
import type { MuseToastInput } from "./useMuseActions";

/**
 * Auth action handlers, extracted verbatim from page.tsx: the email/password
 * submit (`handleAuthClick`), the OAuth kickoff (`handleOAuth`), full logout
 * (`doLogout`) and the logout-and-close-menu variant (`doLogoutFull`).
 * Pure relocation: auth/onboarding state, the supabase client, storage
 * helpers and the navigation/quest helpers they close over all arrive through
 * one options object. `doLogout` keeps its `[showToast]` dependency so its
 * identity is exactly as stable as before (useSessionRefresh depends on it).
 */
export type UseAuthActionsArgs = {
  authMode: "login" | "signup";
  authEmail: string;
  authPass: string;
  authName: string;
  authLoading: boolean;
  authRemember: boolean;
  setAuthMode: Dispatch<SetStateAction<"login" | "signup">>;
  setAuthPass: Dispatch<SetStateAction<string>>;
  setAuthLoading: Dispatch<SetStateAction<boolean>>;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setAuthUser: Dispatch<SetStateAction<AuthUser>>;
  setCurrentUser: Dispatch<SetStateAction<CurrentUser>>;
  setUserTier: Dispatch<SetStateAction<string>>;
  setObStep: Dispatch<SetStateAction<number>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  screenHistoryRef: { current: Screen[] };
  setHamburgerScreen: Dispatch<SetStateAction<string>>;
  setShowHamburger: Dispatch<SetStateAction<boolean>>;
  supabase: SupabaseClient;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  safeSetItem: (key: string, value: string) => boolean;
  safeRemoveItem: (key: string) => void;
  setRefreshToken: (tok: string) => void;
  clearRefreshToken: () => void;
  flash: (color: string) => void;
  showToast: (msg: MuseToastInput) => void;
};

export function useAuthActions({
  authMode,
  authEmail,
  authPass,
  authName,
  authLoading,
  authRemember,
  setAuthMode,
  setAuthPass,
  setAuthLoading,
  setFormErrors,
  setAuthUser,
  setCurrentUser,
  setUserTier,
  setObStep,
  setScreen,
  screenHistoryRef,
  setHamburgerScreen,
  setShowHamburger,
  supabase,
  authFetch,
  safeSetItem,
  safeRemoveItem,
  setRefreshToken,
  clearRefreshToken,
  flash,
  showToast,
}: UseAuthActionsArgs) {
  const doLogout = useCallback(async (message: string = "Logged out") => {
    try { await authFetch("/api/muse/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }); } catch { console.debug("[muse] remote logout request failed"); }
    // Kill the CLIENT-side supabase session too — without this, the persisted
    // supabase-js session survives and silently re-logs the user on next load
    // (shared-device risk). The backend call alone was a no-op for this.
    try { await supabase.auth.signOut(); } catch { console.debug("[muse] local logout cleanup failed"); }
    clearRefreshToken();
    const keys = ["muse_user","muse_state","muse_v1","muse_geo","muse_boost","muse_last_reset","muse_local","muse_premium","muse_referral_code","muse_open_count","muse_hide_premium"];
    keys.forEach(k => { try { safeRemoveItem(k); } catch { console.debug("[muse] local logout key could not be cleared"); } });
    setAuthUser(null); setCurrentUser(prev => ({ ...prev, name:"", email:"", avatar:"", type:"", tier:"free", foundingTier:"", proExpiresAt:"" })); setUserTier("free"); setScreen("auth"); screenHistoryRef.current = []; showToast(message);
  }, [showToast]);

  const doLogoutFull = useCallback(async () => {
    await doLogout(); setHamburgerScreen(""); setShowHamburger(false);
  }, [doLogout, setShowHamburger]);

  const handleOAuth = useCallback(async (provider: "google" | "facebook" | "x") => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/muse`,
        },
      });
      if (error) { showToast(error.message); setAuthLoading(false); }
    } catch { showToast("OAuth failed"); setAuthLoading(false); }
  }, [setAuthLoading, showToast]);

  const handleAuthClick = useCallback(async () => {
    if (authLoading) return;
    const e: Record<string,string> = {};
    if (!authEmail.trim()) e.email = "Email required";
    if (!authPass.trim()) e.pass = "Password required";
    // Sign-up password complexity is enforced server-side (validatePassword in
    // /api/muse/auth) and guided by the live strength meter here. It is
    // deliberately NOT hard-blocked client-side: an existing account whose
    // password predates these rules (or was created via OAuth) must still be
    // able to submit, so it can be recognised and sent to Log In instead of
    // dead-ending on "Needs a symbol".
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setAuthLoading(true);
    try {
      // Was a bare fetch() with no timeout — a hung request here (the
      // server accepts the connection but never responds) left authLoading
      // stuck true forever: the Log In button stays on "Loading..."
      // indefinitely with no way out except a manual reload. Matches the
      // exact shape of the earliest "froze after clicking Log In" reports
      // from this engagement. fetchWithTimeout aborts and rejects into the
      // existing catch block below instead.
      // Try the credentials as a LOGIN first — on BOTH tabs. On the Sign Up tab
      // this is what stops the "spaz": entering a pre-existing account's
      // credentials signs the user straight in instead of dead-ending on
      // sign-up rules. A genuinely new email fails this login and falls through
      // to register below. This is a UX pre-check only; a login succeeds solely
      // with valid credentials, so it reveals nothing about which emails exist.
      let effectiveAction: "login" | "register" = "login";
      let r = await fetchWithTimeout("/api/muse/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: authEmail.trim(), password: authPass }),
      });
      if (!r.ok && authMode === "signup") {
        r = await fetchWithTimeout("/api/muse/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register",
            email: authEmail.trim(),
            password: authPass,
            name: authName || authEmail.split("@")[0],
          }),
        });
        effectiveAction = "register";
      }
      const j = await r.json();
      // Sign-up attempted with an email that already has an account: move the
      // user to the tab that can actually help them and say so plainly.
      if (r.status === 409 && j?.code === "ACCOUNT_EXISTS") {
        setAuthMode("login");
        const msg = j.error || "You already have an account — log in instead.";
        setFormErrors({ email: msg });
        showToast({ msg, type: "error" });
        setAuthLoading(false);
        return;
      }
      if (!r.ok) { setFormErrors({ email: j.error || "Auth failed" }); setAuthLoading(false); return; }
      if (j.registrationPending) {
        setAuthMode("login");
        setAuthPass("");
        showToast(j.message || "Check your email to continue, then sign in.");
        setAuthLoading(false);
        return;
      }
      // The login endpoint now returns the session token directly — use it.
      const accessToken = j.session?.access_token || "";
      const refreshToken = j.session?.refresh_token || "";
      const userObj = { id: j.user.id, email: j.user.email, profile: j.profile || null };
      setAuthUser(userObj);
      if (refreshToken) setRefreshToken(refreshToken);
      safeSetItem("muse_user", JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, user: userObj }));
      // "Remember me": only pre-fill the email next time when opted in. The
      // session itself is persisted separately — see saveState(), which writes
      // `authUser: authRemember ? authUser : null`.
      try {
        if (authRemember) localStorage.setItem("muse_remember_email", authEmail.trim());
        else localStorage.removeItem("muse_remember_email");
      } catch { /* storage unavailable */ }
      // Attach session to browser supabase client so realtime works under RLS.
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch(() => {});
      }
      if (j.profile) {
        setCurrentUser(prev => ({ ...prev, name: j.profile.name || prev.name, avatar: j.profile.avatar || prev.avatar, type: j.profile.type || prev.type }));
      }
      setScreen(effectiveAction === "register" ? "onboard" : "discover");
      if (effectiveAction === "register") setObStep(0);
      analytics[effectiveAction === "register" ? "signup" : "login"]("email");
      flash("#FFD700");
    } catch { showToast({ msg: "Login failed — check your credentials", type: "error" }); }
    setAuthLoading(false);
  }, [authMode, authEmail, authPass, authName, authLoading, authRemember, flash, setAuthLoading, setAuthMode, setAuthPass, setFormErrors, setObStep, showToast]);

  return { doLogout, doLogoutFull, handleOAuth, handleAuthClick };
}
