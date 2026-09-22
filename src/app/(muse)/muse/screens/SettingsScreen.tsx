"use client";

import React, { memo, useState, useEffect, useRef } from "react";
import { FiArrowLeft, FiUser, FiLink, FiStar, FiUsers, FiShield, FiInstagram, FiTwitter, FiMusic, FiHeadphones, FiEye, FiMoreHorizontal, FiZap, FiDollarSign, FiGift, FiFile, FiX, FiLock, FiBell, FiHelpCircle, FiDownload, FiAlertTriangle, FiCompass, FiFacebook, FiBriefcase } from "react-icons/fi";
import { mfaStatus, mfaEnroll, mfaVerify, mfaUnenroll } from "../lib/api";
import { useFocusTrap } from "../hooks/useFocusTrap";
// Push subscribe/unsubscribe arrive as PROPS (page.tsx owns the real impls) —
// importing the module fns here too shadowed them and invited drift.
import type { Screen } from "../components/types";
import { BEHIND_CAMERA, IN_FRONT_CAMERA, AESTHETICS, lookingForOptions } from "../components/types";
import { STRINGS } from "@/lib/strings";
import { clearAllPageTourFlags } from "../components/pageTourContent";
import { getMuseRole, roleBadgeText, type MuseRole } from "@/lib/role";
import { isPaidTier } from "../components/subscriptionTiers";

const SUPPORT_EMAIL = "info@wyzdesign.com";

// See the theme-grid audit-fix comment below — unique 3-letter labels so no
// two theme swatches read the same.
const THEME_ABBR: Record<string, string> = { lasunset: "SUNSET", deepspace: "SPACE", nebula: "NEBULA", deepsea: "DEEPSEA", cinder: "CINDER", boreal: "BOREAL", sunrise: "SUNRISE", daylight: "DAY", sky: "SKY", rose: "ROSE", meadow: "MEADOW", frost: "FROST" };
const DARK_THEMES = ["lasunset", "deepspace", "nebula", "deepsea", "cinder", "boreal"] as const;
const LIGHT_THEMES = ["sunrise", "daylight", "sky", "rose", "meadow", "frost"] as const;

export interface SettingsScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  goBack?: () => void;
  currentUser: any;
  obData: any;
  showNsfw: boolean;
  setShowNsfw: (v: boolean) => void;
  notifPrefs: Record<string, boolean>;
  setNotifPrefs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  blockedUsers: string[];
  setBlockedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  obConnectedSocials: Record<string, boolean>;
  toggleSocial: (k: string) => void;
  theme: string;
  setTheme: (t: any) => void;
  openHamburger: () => void;
  unreadNotificationCount: number;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  doLogout: () => void;
  setShowEditProfile: (v: boolean) => void;
  setEditName: (v: string) => void;
  setEditBio: (v: string) => void;
  setEditLoc: (v: string) => void;
  setEditAvatar: (v: string) => void;
  setEditNsfw: (v: boolean) => void;
  setShowNotificationsSettings: (v: boolean) => void;
  showNotificationsSettings: boolean;
  setShowConnectedAccounts: (v: boolean) => void;
  showConnectedAccounts: boolean;
  pushEnabled: boolean;
  setPushEnabled: (v: boolean) => void;
  subscribeToMusePush: () => Promise<{ ok?: boolean; error?: string }>;
  unsubscribeFromMusePush: () => Promise<{ ok?: boolean; error?: string }>;
  setShowTerms: (v: boolean) => void;
  setShowPrivacy: (v: boolean) => void;
  setShowGuidelines: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  isUnlimited: boolean;
  setShowConnect: (v: boolean) => void;
  setShowPaymentHistory: (v: boolean) => void;
  setShowReferral: (v: boolean) => void;
  setShowSafetyCheckin: (v: boolean) => void;
  setShowPromptBank: (v: boolean) => void;
  promptResponses: any[];
  promptBankData: any[];
  myGeo: any;
  setShowAgeGate: (v: boolean) => void;
  setPendingNsfw: (v: boolean) => void;
  setShowAgeVerification: (v: boolean) => void;
  /** Persisted profile preferences (muse_profiles.preferences) — seeds the
   *  Portfolio & Availability sub-pages with the user's saved values. */
  preferences?: Record<string, unknown>;
  authUser?: any;
  showBlockedUsers?: boolean;
  setShowBlockedUsers?: (v: boolean | ((p: boolean) => boolean)) => void;
  setScreen?: (s: Screen) => void;
  setObStep?: (s: number) => void;
  apiFetch?: (url: string, opts?: any) => Promise<any>;
  setShowQuests?: (v: boolean) => void;
  questClaimables?: number;
  ageVerified?: boolean;
  verificationExpiringSoon?: boolean;
  discoveryPrefs: { ageMin: number; ageMax: number; distance: number; gender: string };
  setDiscoveryPrefs: React.Dispatch<React.SetStateAction<{ ageMin: number; ageMax: number; distance: number; gender: string }>>;
  showOnline?: boolean;
  setShowOnline?: (v: boolean) => void;
  showDistance?: boolean;
  setShowDistance?: (v: boolean) => void;
  // Per-field profile visibility toggles. Free: zodiac/age/MBTI/life-path/
  // Chinese zodiac. Premium (gated via UpsellModal, same pattern as Rewind/
  // Boost elsewhere in the app): showMatchPercent, and showOnline above.
  showZodiac?: boolean;
  setShowZodiac?: (v: boolean) => void;
  showAge?: boolean;
  setShowAge?: (v: boolean) => void;
  showMbti?: boolean;
  setShowMbti?: (v: boolean) => void;
  showLifePath?: boolean;
  setShowLifePath?: (v: boolean) => void;
  showChinese?: boolean;
  setShowChinese?: (v: boolean) => void;
  showMatchPercent?: boolean;
  setShowMatchPercent?: (v: boolean) => void;
  userTier?: string;
  setUpsell?: (v: { feature: string; reason: string; icon?: string } | null) => void;
  authFetch?: (url: string, opts?: any) => Promise<any>;
  setSupportOpen?: (v: boolean) => void;
}

// Shared bottom-sheet wrapper for every Settings sub-page (Notifications,
// Connected Accounts, Change Password, Blocked Users). Matches the app's
// existing slide-up panel convention (quest-panel, hamburger sub-screens)
// instead of the old pattern of pushing an accordion open inline in the
// middle of the settings list — that kept growing the list's scroll height
// every time someone opened a section, and buried short rows in a long
// column. A sub-page keeps the main list a fixed, scannable length and
// gives each section its own focused screen with one clear way back.
function SettingsSubPage({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // Buttery slide: mount -> slide up; close -> slide back down, THEN unmount.
  // The parent still renders us conditionally, so we hold ourselves on screen
  // for the exit animation before calling the real onClose.
  const [closing, setClosing] = React.useState(false);
  const requestClose = React.useCallback(() => {
    setClosing((c) => {
      if (c) return c;
      window.setTimeout(onClose, 280);
      return true;
    });
  }, [onClose]);
  const trapRef = useFocusTrap(true, requestClose);

  return (
    <div
      ref={trapRef}
      className={"sheet-overlay" + (closing ? " closing" : "")}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={requestClose}
    >
      <div className={"sheet-panel" + (closing ? " closing" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button onClick={requestClose} aria-label={`Close ${title}`} className="sheet-close"><FiX size={20} /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onToggle }: { label: string; desc?: string; checked: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 14, color: "var(--text)" }}>{label}{desc && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "var(--gold)", background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 99, padding: "2px 7px", verticalAlign: "middle" }}>{desc}</span>}</span>
      <div
        role="switch"
        aria-checked={checked}
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        onClick={onToggle}
        className={"toggle-track" + (checked ? " active" : "")}
        style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "all .3s", background: checked ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.1)" }}
      >
        <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: checked ? 22 : 2, transition: "all .3s" }} />
      </div>
    </div>
  );
}

// Reusable 5-stop opacity slider (Background section). Note: stop labels are
// 20% → 100% (the lowest stop is 20%, fully transparent is excluded so the
// backdrop/sprites never vanish entirely). Value maps stop N → opacity where
// 100% = opacity 1. Persisted to localStorage per-slider; the CSS variable is
// applied straight to the root so BackgroundScene picks it up live.
function OpacitySlider({ label, storageKey, cssVar }: { label: string; storageKey: string; cssVar: string }) {
  const STEPS = [0, 0.25, 0.5, 0.75, 1.0];
  const LABELS = ["0%", "25%", "50%", "75%", "100%"];
  const [idx, setIdx] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem(storageKey) || "1");
      return Math.max(0, Math.min(4, Math.round((isNaN(v) ? 1 : v) * 4)));
    } catch { return 4; }
  });
  useEffect(() => {
    try { document.documentElement.style.setProperty(cssVar, String(STEPS[idx])); } catch {}
  }, [cssVar, idx]);
  const handleSlide = (i: number) => {
    setIdx(i);
    try { localStorage.setItem(storageKey, String(STEPS[i])); } catch {}
    try { document.documentElement.style.setProperty(cssVar, String(STEPS[i])); } catch {}
  };
  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{LABELS[idx]}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={0}
        max={4}
        step={1}
        value={idx}
        onChange={e => handleSlide(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--gold)" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {LABELS.map((l, i) => (
          <span key={i} style={{ fontSize: 10, color: "var(--muted)" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export const SettingsScreen = memo(function SettingsScreen({
  screen,
  showScreen,
  goBack,
  currentUser,
  obData,
  showNsfw,
  setShowNsfw,
  notifPrefs,
  setNotifPrefs,
  blockedUsers,
  setBlockedUsers,
  obConnectedSocials,
  toggleSocial,
  theme,
  setTheme,
  showToast,
  doLogout,
  setShowEditProfile,
  setEditName,
  setEditBio,
  setEditLoc,
  setEditAvatar,
  setEditNsfw,
  setShowNotificationsSettings,
  showNotificationsSettings,
  setShowConnectedAccounts,
  showConnectedAccounts,
  pushEnabled,
  setPushEnabled,
  subscribeToMusePush = async () => ({} as { ok?: boolean; error?: string }),
  unsubscribeFromMusePush = async () => ({} as { ok?: boolean; error?: string }),
  setShowTerms,
  setShowPrivacy,
  setShowGuidelines,
  setShowDeleteConfirm,
  isUnlimited,
  setShowConnect,
  setShowPaymentHistory,
  setShowReferral,
  setShowSafetyCheckin,
  setShowPromptBank,
  promptResponses,
  promptBankData,
  setShowAgeVerification,
  showBlockedUsers = false,
  setShowBlockedUsers = () => {},
  setScreen = () => {},
  setObStep = () => {},
  apiFetch,
  setShowQuests = () => {},
  questClaimables = 0,
  ageVerified = false,
  verificationExpiringSoon = false,
  discoveryPrefs,
  setDiscoveryPrefs,
  showOnline,
  setShowOnline,
  showDistance,
  setShowDistance,
  showZodiac,
  setShowZodiac,
  showAge,
  setShowAge,
  showMbti,
  setShowMbti,
  showLifePath,
  setShowLifePath,
  showChinese,
  setShowChinese,
  showMatchPercent,
  setShowMatchPercent,
  userTier = "free",
  setUpsell,
  authFetch,
  setSupportOpen,
  preferences = {},
}: SettingsScreenProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPortfolioSettings, setShowPortfolioSettings] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [portfolioVisibility, setPortfolioVisibility] = useState<string>(String(preferences.portfolioVisibility ?? "everyone"));
  const [portfolioFeatured, setPortfolioFeatured] = useState<boolean>(preferences.portfolioFeatured !== false);
  const [portfolioShowOnProfile, setPortfolioShowOnProfile] = useState<boolean>(preferences.portfolioShowOnProfile !== false);
  const [availabilityStatus, setAvailabilityStatus] = useState<string>(String(preferences.availabilityStatus ?? "available"));
  const [availabilityNote, setAvailabilityNote] = useState<string>(String(preferences.availabilityNote ?? ""));
  const [bookingLeadDays, setBookingLeadDays] = useState<number>(Number(preferences.bookingLeadDays ?? 3));
  const [travelDates, setTravelDates] = useState<string>(String(preferences.travelDates ?? ""));
  const [budgetRange, setBudgetRange] = useState<string>(String(preferences.budgetRange ?? ""));
  const [showRateSettings, setShowRateSettings] = useState(false);
  const [rateHourly, setRateHourly] = useState<string>(String(preferences.rateHourly ?? ""));
  const [rateHalfDay, setRateHalfDay] = useState<string>(String(preferences.rateHalfDay ?? ""));
  const [rateFullDay, setRateFullDay] = useState<string>(String(preferences.rateFullDay ?? ""));
  const [rateCurrency, setRateCurrency] = useState<string>(String(preferences.rateCurrency ?? "USD"));
  const [rateNotes, setRateNotes] = useState<string>(String(preferences.rateNotes ?? ""));
  // Brand/business tools (were "coming soon" stubs).
  const [showBriefTemplates, setShowBriefTemplates] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showHiring, setShowHiring] = useState(false);
  const [briefTemplates, setBriefTemplates] = useState<{ title: string; desc: string; budget: string }[]>(
    Array.isArray(preferences.briefTemplates) ? (preferences.briefTemplates as { title: string; desc: string; budget: string }[]) : [],
  );
  const [teamMembers, setTeamMembers] = useState<{ name: string; email: string; role: string }[]>(
    Array.isArray(preferences.teamMembers) ? (preferences.teamMembers as { name: string; email: string; role: string }[]) : [],
  );
  const [hireMinRate, setHireMinRate] = useState<string>(String(preferences.hireMinRate ?? ""));
  const [hireAvailability, setHireAvailability] = useState<string>(String(preferences.hireAvailability ?? ""));
  const [hireTypes, setHireTypes] = useState<string>(String(preferences.hireTypes ?? ""));
  const [hireNotes, setHireNotes] = useState<string>(String(preferences.hireNotes ?? ""));
  const [showPersonality, setShowPersonality] = useState(false);
  const [showCreativeProfile, setShowCreativeProfile] = useState(false);
  const [cpType, setCpType] = useState((obData as any)?.type || "");
  const [cpCustomTypePending, setCpCustomTypePending] = useState(false);
  const [cpLooking, setCpLooking] = useState<string[]>((obData as any)?.looking || []);
  const [cpStyles, setCpStyles] = useState<string[]>((obData as any)?.styles || []);
  const [cpShowCustomStyleInput, setCpShowCustomStyleInput] = useState(false);
  const [cpCustomStyleDraft, setCpCustomStyleDraft] = useState("");
  const [cpCustomStylePending, setCpCustomStylePending] = useState(false);
  const [persZodiac, setPersZodiac] = useState((obData as any)?.zodiac || "");
  const [persChinese, setPersChinese] = useState((obData as any)?.chinese || "");
  const [persMbti, setPersMbti] = useState((obData as any)?.mbti || "");
  const [persLifePath, setPersLifePath] = useState((obData as any)?.lifePath || "");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // Audit fix (2026-09-08): Report a Bug, Have an Idea, Export My Data, App
  // Walkthrough, Help Guide, Email Support and the FAQ list used to exist
  // ONLY in the old inline hamburger Settings tab (MenuModal.tsx) — porting
  // them here too so switching the Menu's "Settings" card to open this full
  // page (see MenuModal.tsx) doesn't silently drop them.
  const [showBugForm, setShowBugForm] = useState(false);
  const [bugCategory, setBugCategory] = useState("ui");
  const [bugDescription, setBugDescription] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [bugExpected, setBugExpected] = useState("");
  const [bugActual, setBugActual] = useState("");
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [ideaCategory, setIdeaCategory] = useState("feature");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaSubmitting, setIdeaSubmitting] = useState(false);

  // 2FA / MFA state
  const [showMFA, setShowMFA] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<{ id: string; status: string; friendlyName?: string }[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQrUri, setMfaQrUri] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaError, setMfaError] = useState("");

  // Role detection — determines which settings variant to render
  const userRole: MuseRole = getMuseRole({ audience: currentUser?.audience, type: currentUser?.type || obData?.type });
  const isMuseProfile = userRole === "muse";

  // Profile completion state. Starts at `null` (not 0) — Settings is
  // conditionally rendered (unmounts/remounts on every navigation away and
  // back, unlike the always-mounted .screen-el screens), so this state
  // resets on every visit and the fetch below is genuinely async. With an
  // initial 0 the UI flashed a false "Profile Completion 0%" on every visit
  // until the fetch resolved — alarming for a user whose real completion is
  // 50%+, and the exact "flaky 0%" symptom flagged (but not reproduced) a
  // few rounds back. It wasn't flaky at all: it was a guaranteed loading-
  // state flash that just depended on how fast you looked. `null` lets the
  // render below skip showing the block at all until real data is in.
  const [completionPct, setCompletionPct] = useState<number | null>(null);
  const [completionBreakdown, setCompletionBreakdown] = useState<Record<string, { done: boolean; weight: number }>>({});
  const [showCompletionDetails, setShowCompletionDetails] = useState(false);

  // Load profile completion on mount
  useEffect(() => {
    if (screen !== "settings" || !authFetch) return;
    authFetch("/api/muse?type=profile-completion").then(r => r.json()).then(d => {
      if (d.completion != null) setCompletionPct(d.completion);
      if (d.breakdown) setCompletionBreakdown(d.breakdown);
    }).catch(() => {});
  }, [screen, authFetch]);

  // Load MFA status when the sub-page opens
  useEffect(() => {
    if (!showMFA) return;
    setMfaLoading(true);
    mfaStatus().then(d => {
      setMfaEnabled(!!d.enabled);
      setMfaFactors(d.factors || []);
      setMfaLoading(false);
    }).catch(() => setMfaLoading(false));
  }, [showMFA]);

  // Notification prefs: hydrate from the server when the sub-page opens, then
  // persist each toggle back (debounced) so they stick across devices.
  const notifSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!showNotificationsSettings || !apiFetch) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/muse?type=notification-prefs");
        const d = await r.json();
        if (!cancelled && d && d.prefs && typeof d.prefs === "object") {
          setNotifPrefs(prev => ({ ...prev, ...d.prefs }));
        }
      } catch { /* non-fatal — keep local defaults */ }
    })();
    return () => { cancelled = true; };
  }, [showNotificationsSettings, apiFetch, setNotifPrefs]);

  // Blocked users: the `blockedUsers` prop is just raw IDs (also used for
  // discovery filtering + optimistic block/unblock elsewhere), so it can't
  // show a name. Fetch the enriched {id,name,avatar} list separately when
  // this sub-page opens, keyed by id, and fall back to the raw id if a row
  // hasn't resolved yet (e.g. a user who deleted their account).
  const [blockedProfiles, setBlockedProfiles] = useState<Record<string, { name: string; avatar?: string }>>({});
  useEffect(() => {
    if (!showBlockedUsers || !apiFetch) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "blocked-users" }) });
        const d = await r.json();
        if (!cancelled && Array.isArray(d?.blocked)) {
          const map: Record<string, { name: string; avatar?: string }> = {};
          d.blocked.forEach((p: any) => { if (p?.id) map[p.id] = { name: p.name, avatar: p.avatar }; });
          setBlockedProfiles(map);
        }
      } catch { /* non-fatal — falls back to showing raw ids below */ }
    })();
    return () => { cancelled = true; };
  }, [showBlockedUsers, apiFetch]);

  const updateNotifPref = (key: string) => {
    setNotifPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (apiFetch) {
        if (notifSaveTimerRef.current) clearTimeout(notifSaveTimerRef.current);
        notifSaveTimerRef.current = setTimeout(() => {
          apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { notifications: next } }) }).catch(() => {});
        }, 600);
      }
      return next;
    });
  };

  const changePassword = async () => {
    if (pwNew.length < 6) { showToast("Password must be at least 6 characters"); return; }
    if (!/[A-Z]/.test(pwNew)) { showToast("Password needs a capital letter"); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwNew)) { showToast("Password needs a symbol"); return; }
    if (pwNew !== pwConfirm) { showToast("Passwords don't match"); return; }
    setPwBusy(true);
    try {
      if (!apiFetch) { showToast("Can't update password right now"); setPwBusy(false); return; }
      let access_token = "";
      try { access_token = JSON.parse(localStorage.getItem("muse_user") || "{}")?.access_token || ""; } catch {}
      const res = await apiFetch("/api/muse/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-password", access_token, new_password: pwNew }) });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("✓ Password updated");
        setPwCurrent(""); setPwNew(""); setPwConfirm(""); setShowChangePassword(false);
      } else {
        showToast(data.error || "Could not update password");
      }
    } catch { showToast("Could not update password"); }
    setPwBusy(false);
  };

  if (screen !== "settings") return null;

  // Groups mirror the categories any settings screen a "normie or boomer"
  // has already seen (iOS/Android Settings, Instagram, Facebook) uses:
  // Account, Notifications, Privacy & Safety, Connected Accounts, Payments,
  // Rewards, Appearance, Legal — each short enough to scan at a glance, with
  // multi-step sections (Notifications, Connected Accounts, Blocked Users,
  // Change Password) living in their own sub-page instead of an inline
  // accordion that used to push the whole list down.
  const accountItems = [
    { icon: <FiUser size={18} />, label: "Edit Profile", desc: "Name, bio, photos", action: () => { setEditName(currentUser.name); setEditBio(obData.bio || ""); setEditLoc(obData.loc || ""); setEditAvatar(currentUser.avatar || ""); setEditNsfw(!!currentUser.nsfw); setShowEditProfile(true); } },
    { icon: <FiStar size={18} />, label: "Personality Profile", desc: "Zodiac, MBTI, Life Path", action: () => setShowPersonality(true) },
    { icon: <FiUsers size={18} />, label: "Creative Profile", desc: "Type, styles, looking for", action: () => setShowCreativeProfile(true) },
    { icon: <FiLock size={18} />, label: "Change Password", desc: "Update your login password", action: () => setShowChangePassword(true) },
  ];

  const privacyItems = [
    {
      // Session 55 content policy: boudoir/bodypaint content is gated
      // behind real Stripe Identity verification everywhere, not just
      // in the states that legally require it — the self-attestation
      // "age gate" path (an unverified click-through) used to be the
      // default outside those states. This is deliberately stricter
      // than the legal minimum: the goal is content that never appears
      // by default and is only reachable by a verified adult who
      // explicitly opted in, which is the standard that keeps this
      // clear of App Store review issues (see HANDOVER.md Session 55 —
      // the 500px precedent is exactly this failure mode).
      icon: <FiEye size={18} />, label: "NSFW Content", desc: "Requires identity verification — 18+ only", action: () => { if (!showNsfw) { setShowAgeVerification(true); } else { setShowNsfw(false); } }
    },
    { icon: <FiMoreHorizontal size={18} />, label: "Blocked Users", desc: blockedUsers.length > 0 ? `${blockedUsers.length} blocked` : "Manage blocked profiles", action: () => setShowBlockedUsers(true) },
    { icon: <FiShield size={18} />, label: "Safety Center", desc: "Check-ins, emergency contacts, trusted friends", action: () => setShowSafetyCheckin(true) },
    // Permanent home for verification status (audit feedback, 2026-09-08):
    // the old top-of-app banner was the ONLY place this showed, so
    // dismissing or missing it meant losing track of why paid features
    // were locked. This row is always here regardless of the banner.
    {
      icon: <FiLock size={18} />,
      label: "Identity Verification",
      desc: !ageVerified ? "Expired — paid features locked. Tap to verify" : verificationExpiringSoon ? "Expires in ≤30 days — tap to re-verify" : "Verified ✓",
      action: () => setShowAgeVerification(true),
      dot: !ageVerified || verificationExpiringSoon,
    },
    {
      icon: <FiLock size={18} />,
      label: "Two-Factor Authentication",
      desc: mfaEnabled ? "Enabled ✓" : "Add an extra layer of security",
      action: () => setShowMFA(true),
      dot: false,
    },
  ];

  const paymentItems = [
    { icon: <FiZap size={18} />, label: "Subscription", desc: "Manage your plan", action: () => showScreen("subscription"), dot: false },
    { icon: <FiDollarSign size={18} />, label: "Marketplace Payments", desc: "Connect Stripe to receive bookings", action: () => setShowConnect(true), dot: false },
    { icon: <FiDollarSign size={18} />, label: "Payment History", desc: "View earnings and transactions", action: () => setShowPaymentHistory(true), dot: false },
    { icon: <FiGift size={18} />, label: "Referral Program", desc: "Invite friends, earn free months", action: () => setShowReferral(true), dot: false },
  ];

  const rewardsItems = [
    { icon: <FiStar size={18} />, label: "Quests", desc: questClaimables > 0 ? `${questClaimables} reward${questClaimables > 1 ? "s" : ""} ready to claim!` : "Complete challenges, earn free likes", action: () => setShowQuests(true), dot: questClaimables > 0 },
    { icon: <FiStar size={18} />, label: "Prompt Bank", desc: `${Math.round((promptResponses.length / Math.max(promptBankData.length, 1)) * 100)}% completed`, action: () => setShowPromptBank(true), dot: false },
  ];

  const legalItems = [
    { icon: <FiFile size={18} />, label: "Terms of Service", desc: "Legal terms", action: () => setShowTerms(true) },
    { icon: <FiFile size={18} />, label: "Privacy Policy", desc: "How we handle your data", action: () => setShowPrivacy(true) },
    { icon: <FiFile size={18} />, label: "Community Guidelines", desc: "Standards & expectations", action: () => setShowGuidelines(true) },
    { icon: <FiFile size={18} />, label: "DMCA / Copyright", desc: "Copyright infringement claims", action: () => window.open("/dmca", "_self") },
    { icon: <FiX size={18} />, label: "Delete Account", desc: "Permanently remove your data", action: () => setShowDeleteConfirm(true) },
  ];

  const faqItems = [
    { q: "How does matching work?", a: "Swipe right on creators you'd like to connect with. If they swipe right back, it's a connection! You can then message each other." },
    { q: "What are Quests?", a: "Quests are small challenges that reward you for using Muse — like swiping on profiles, posting, or messaging someone. They refresh daily, weekly and monthly. Finishing one earns XP plus a reward such as free likes or a profile boost. Open Quests (Menu → Quests, or Settings → Rewards → Quests) to see your progress and claim anything that’s ready." },
    { q: "How do I upgrade to Premium?", a: "Go to Settings → Payments & Subscription → Subscription to see plan options." },
    { q: "How do I report someone?", a: "Tap the ⚑ Report button on any feed or forum post, the ••• menu on a match, or Report inside a chat conversation. Choose a reason and we'll review it — track your reports in Menu → Your Activity → Reports." },
    { q: "How do I delete my account?", a: "Go to Settings → Legal → Delete Account. This permanently removes all your data." },
  ];

  const renderRow = (item: { icon: React.ReactNode; label: string; desc: string; action: () => void; dot?: boolean }) => (
    <div key={item.label} className="settings-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); item.action(); } }} onClick={item.action}>
      <div className="settings-item-left">
        <div className="settings-icon" style={{ position: "relative" }}>
          {item.icon}
          {item.dot && <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: "var(--pink)", border: "1.5px solid var(--bg)" }} />}
        </div>
        <div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div>
      </div>
      <div className="settings-arrow">→</div>
    </div>
  );

  return (
    <div className="phone-wrap">
      <div className="phone" id="muse-app">
        <div className="hdr" style={{ display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 16px` }}>
          <button className="hdr-btn" onClick={() => (goBack ? goBack() : showScreen("profile"))} aria-label="Back to Profile"><FiArrowLeft size={18} /></button>
          <div className="logo-link" style={{
            fontSize: 37.5,
            fontFamily: "'Playfair Display',serif",
            fontStyle: "italic",
            fontWeight: 800,
            backgroundImage: "linear-gradient(135deg,var(--gold),var(--lavender),var(--pink),var(--gold))",
            backgroundSize: "400% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            textAlign: "center",
            margin: 0,
            padding: 0,
            whiteSpace: "nowrap",
            animation: "gradientShift 6s ease-in-out infinite",
            lineHeight: "48px",
            display: "block",
            justifySelf: "center",
          }}>Settings</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: isMuseProfile ? "rgba(255,215,0,0.12)" : "rgba(138,43,226,0.12)", border: `1px solid ${isMuseProfile ? "rgba(255,215,0,0.25)" : "rgba(138,43,226,0.25)"}`, color: isMuseProfile ? "var(--gold)" : "#b388ff" }}>
              {isMuseProfile ? <FiBriefcase size={9} /> : <FiZap size={9} />}
              {roleBadgeText(userRole)}
            </span>
          </div>
        </div>
        <div className="settings-scroll">
          {/* Audit fix (2026-09-08): the Menu's "Settings" card used to open
              a separate, older inline settings tab instead of this
              full-page screen — this section (age range, distance, gender)
              and the Show Distance/Online Status toggles below existed
              ONLY over there, so switching the Menu card to open this page
              (see MenuModal.tsx) would have silently dropped them. Ported
              here so nothing is lost. */}
          <div className="settings-group">
            <div className="settings-group-title" style={{ textAlign: "left" }}>Preferences</div>
            <div style={{ padding: "10px 0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Age Range</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{discoveryPrefs.ageMin}</span>
                <input type="range" aria-label="Minimum age" min={18} max={65} value={discoveryPrefs.ageMin} onChange={e => setDiscoveryPrefs(p => ({ ...p, ageMin: Number(e.target.value) }))} style={{ flex: 1, minWidth: 0, accentColor: "var(--gold)" }} />
                <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>to</span>
                <input type="range" aria-label="Maximum age" min={18} max={65} value={discoveryPrefs.ageMax} onChange={e => setDiscoveryPrefs(p => ({ ...p, ageMax: Number(e.target.value) }))} style={{ flex: 1, minWidth: 0, accentColor: "var(--gold)" }} />
                <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{discoveryPrefs.ageMax}</span>
              </div>
            </div>
            <div style={{ padding: "0 0 10px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Max Distance: {discoveryPrefs.distance} mi</div>
              <input type="range" aria-label="Maximum distance in miles" min={1} max={100} value={discoveryPrefs.distance} onChange={e => setDiscoveryPrefs(p => ({ ...p, distance: Number(e.target.value) }))} style={{ width: "100%", accentColor: "var(--gold)" }} />
            </div>
            <div style={{ padding: "0 0 10px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Show Me</div>
              <div className="filter-scroll-row" style={{ gap: 8, flexWrap: "nowrap", paddingTop: 8 }}>
                {["all", "women", "men", "non-binary"].map(g => (
                  <div key={g} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDiscoveryPrefs(p => ({ ...p, gender: g })); } }} onClick={() => setDiscoveryPrefs(p => ({ ...p, gender: g }))} style={{ padding: "8px 16px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all .25s", background: discoveryPrefs.gender === g ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)", border: "1px solid " + (discoveryPrefs.gender === g ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"), color: discoveryPrefs.gender === g ? "var(--gold)" : "var(--muted)" }}>{g.charAt(0).toUpperCase() + g.slice(1)}</div>
                ))}
              </div>
            </div>
            <button className="btn btn-gold" style={{ width: "100%", fontSize: 12 }} onClick={async () => { try { await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { ...discoveryPrefs } }) }); showToast("Preferences saved!"); } catch { showToast("Failed to save"); } }}>Save Discovery Preferences</button>
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Account</div>
            {completionPct !== null && completionPct < 100 && (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowCompletionDetails(!showCompletionDetails); } }}
                onClick={() => setShowCompletionDetails(!showCompletionDetails)}
                style={{ padding: "10px 14px", marginBottom: 8, borderRadius: 12, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>Profile Completion</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{completionPct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--border-subtle)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${completionPct}%`, borderRadius: 3, background: "linear-gradient(90deg, var(--gold), var(--coral))", transition: "width .5s ease" }} />
                </div>
                {showCompletionDetails && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { k: "avatar", l: "Profile photo" },
                      { k: "bio", l: "Bio (20+ chars)" },
                      { k: "type", l: "Creative type" },
                      { k: "styles", l: "Styles / aesthetics" },
                      { k: "looking", l: "Looking for" },
                      { k: "prompts", l: "Prompt responses (3+)" },
                      { k: "photos", l: "Portfolio photos (2+)" },
                      { k: "verification", l: "Identity verification" },
                      { k: "personality", l: "Personality traits" },
                    ].map(item => {
                      const b = completionBreakdown[item.k];
                      return (
                        <div key={item.k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: b?.done ? "var(--text2)" : "var(--text)" }}>
                          <span style={{ color: b?.done ? "var(--text)" : "var(--muted)", fontWeight: 700 }}>{b?.done ? "✓" : "○"}</span>
                          <span style={{ opacity: b?.done ? 0.6 : 1 }}>{item.l}</span>
                          {!b?.done && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>+{b?.weight || 0}%</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {accountItems.map(renderRow)}
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Notifications</div>
            {renderRow({ icon: <FiBell size={18} />, label: "Notification Preferences", desc: "Push, lock-screen and per-category alerts", action: () => setShowNotificationsSettings(true) })}
          </div>

          {/* Role-specific settings sections */}
          {isMuseProfile ? (
            <div className="settings-group">
              <div className="settings-group-title">Hiring & Team</div>
              {renderRow({ icon: <FiBriefcase size={18} />, label: "Brief Templates", desc: "Save and reuse brief formats", action: () => setShowBriefTemplates(true) })}
              {renderRow({ icon: <FiUsers size={18} />, label: "Team Management", desc: "Manage your team members and roles", action: () => setShowTeam(true) })}
              {renderRow({ icon: <FiStar size={18} />, label: "Hiring Preferences", desc: "Set preferred rates and availability requirements", action: () => setShowHiring(true) })}
            </div>
          ) : (
            <div className="settings-group">
              <div className="settings-group-title">Portfolio & Availability</div>
              {renderRow({ icon: <FiEye size={18} />, label: "Portfolio Settings", desc: "Manage visibility and featured work", action: () => setShowPortfolioSettings(true) })}
              {renderRow({ icon: <FiLink size={18} />, label: "Availability Calendar", desc: "Set your schedule and booking preferences", action: () => setShowAvailability(true) })}
              {renderRow({ icon: <FiDollarSign size={18} />, label: "Rate Settings", desc: "Set your standard rates and packages", action: () => setShowRateSettings(true) })}
            </div>
          )}

<div className="settings-group">
            <div className="settings-group-title">Appearance</div>
            <div className="theme-grid" style={{ margin: "12px 0 4px" }}>
              {/* Audit fix (2026-09-08): t.slice(0,3) gave "deepspace" and
                  "deepsea" the same "Dee" label — two swatches reading
                  identically, distinguishable only by color/hover title. A
                  fixed abbreviation map keeps every label unique.
                  Second audit fix (2026-09-08): the selected swatch used to
                  replace its label outright with a bare "✓", so the one
                  swatch you'd actually want to identify — the active theme —
                  was the one swatch with no name on it. Now the checkmark is
                  appended after the label instead of replacing it.
                  Torreé: light mode is now its own section under the dark
                  themes instead of being mixed into the same grid. */}
              {DARK_THEMES.map(t => (
                <div key={t} role="radio" aria-checked={theme === t} className={"theme-swatch" + (theme === t ? " active" : "")} data-val={t} title={t} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTheme(t); } }} onClick={() => setTheme(t)} style={{ textTransform: "uppercase" }}>{theme === t ? `${THEME_ABBR[t]} ✓` : THEME_ABBR[t]}</div>
              ))}
            </div>
            <div className="settings-group-title" style={{ marginTop: 16 }}>Light Mode</div>
            <div className="theme-grid" style={{ margin: "10px 0 4px" }}>
              {LIGHT_THEMES.map(t => (
                <div key={t} role="radio" aria-checked={theme === t} className={"theme-swatch" + (theme === t ? " active" : "")} data-val={t} title={t} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTheme(t); } }} onClick={() => setTheme(t)} style={{ textTransform: "uppercase" }}>{theme === t ? `${THEME_ABBR[t]} ✓` : THEME_ABBR[t]}</div>
              ))}
            </div>
            <div className="settings-group-title" style={{ marginTop: 16 }}>Background Effects</div>
            <OpacitySlider label="Sprites & Animations" storageKey="muse_sprite_opacity" cssVar="--sprite-opacity" />
            <OpacitySlider label="Background" storageKey="muse_bg_opacity" cssVar="--scene-opacity" />
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Quests &amp; Rewards</div>
            {rewardsItems.map(renderRow)}
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Privacy & Safety</div>
            {privacyItems.map(renderRow)}
            <ToggleRow
              label="Show Distance"
              desc="Muse Pro"
              checked={!!showDistance}
              onToggle={() => {
                if (!isPaidTier(userTier)) {
                  setUpsell?.({ feature: "Show Distance", reason: "Let people see how close you are. Upgrade to Muse Pro to control whether your distance is shown on your profile.", icon: "📍" });
                  return;
                }
                const next = !showDistance;
                setShowDistance?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showDistance: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
            {/* Free profile-field visibility toggles — every user can hide
                these optional fields from their profile as seen by others.
                The profile owner always still sees their own full profile
                in edit mode (these only affect PublicProfileScreen/Discover
                rendering for OTHER viewers). */}
            <ToggleRow
              label="Zodiac Sign"
              checked={showZodiac !== false}
              onToggle={() => {
                const next = !(showZodiac !== false);
                setShowZodiac?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showZodiac: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
            <ToggleRow
              label="Age"
              desc="Muse Pro"
              checked={showAge !== false}
              onToggle={() => {
                if (!isPaidTier(userTier)) {
                  setUpsell?.({ feature: "Hide Age", reason: "Keep your age private. Upgrade to Muse Pro to control whether your age is shown on your profile.", icon: "🎂" });
                  return;
                }
                const next = !(showAge !== false);
                setShowAge?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showAge: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
            <ToggleRow
              label="MBTI Type"
              checked={showMbti !== false}
              onToggle={() => {
                const next = !(showMbti !== false);
                setShowMbti?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showMbti: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
            <ToggleRow
              label="Life Path Number"
              checked={showLifePath !== false}
              onToggle={() => {
                const next = !(showLifePath !== false);
                setShowLifePath?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showLifePath: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
            <ToggleRow
              label="Chinese Zodiac"
              checked={showChinese !== false}
              onToggle={() => {
                const next = !(showChinese !== false);
                setShowChinese?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showChinese: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
            {/* Premium-gated visibility toggles — same UpsellModal paywall
                pattern used elsewhere in the app (Rewind, Boost, unlimited
                likes) instead of a new gating mechanism. */}
            <ToggleRow
              label="Online Status"
              desc="Muse Pro"
              checked={!!showOnline}
              onToggle={() => {
                if (!isPaidTier(userTier)) {
                  setUpsell?.({ feature: "Hide Online Status", reason: "Control who sees when you're active. Upgrade to Muse Pro to hide your online status from other members.", icon: "🟢" });
                  return;
                }
                const next = !showOnline;
                setShowOnline?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showOnline: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
            <ToggleRow
              label="Match % Visible to Others"
              desc="Muse Pro"
              checked={showMatchPercent !== false}
              onToggle={() => {
                if (!isPaidTier(userTier)) {
                  setUpsell?.({ feature: "Hide Match %", reason: "Keep your match-percentage private. Upgrade to Muse Pro to control whether others see how well you match with them.", icon: "✨" });
                  return;
                }
                const next = !(showMatchPercent !== false);
                setShowMatchPercent?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showMatchPercent: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Connected Accounts</div>
            {renderRow({ icon: <FiLink size={18} />, label: "Manage Connected Accounts", desc: "Instagram, Facebook, Spotify, SoundCloud", action: () => setShowConnectedAccounts(true) })}
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Payments & Subscription</div>
            {paymentItems.map(renderRow)}
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Legal</div>
            {legalItems.map(renderRow)}
          </div>

          {isUnlimited && (
            <div className="settings-group">
              <div className="settings-group-title">Admin</div>
              {renderRow({ icon: <FiShield size={18} />, label: "Admin Dashboard", desc: "Analytics & moderation", action: () => { window.open("/muse/admin", "_self"); } })}
            </div>
          )}

          <div className="settings-group">
            <div className="settings-group-title">Help &amp; Support</div>
            {faqItems.map((faq, i) => (
              <div key={i} style={{ marginBottom: 10, padding: "12px 14px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{faq.q}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{faq.a}</div>
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => { clearAllPageTourFlags(); showToast("Tutorials reset — you'll see them again as you explore"); }}>Replay Tutorials</button>
              <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => showScreen("codex")}>Glossary + Codex</button>
              <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => setSupportOpen?.(true)}>Help Guide</button>
              {!showIdeaForm ? (
                <button className="btn" style={{ width: "100%", fontSize: 13, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)" }} onClick={() => setShowIdeaForm(true)}>Have an Idea?</button>
              ) : (
                <div style={{ padding: 14, background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 10 }}>Share Your Idea</div>
                  <select value={ideaCategory} onChange={e => setIdeaCategory(e.target.value)} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}>
                    <option value="feature">New Feature</option>
                    <option value="improvement">Improvement</option>
                    <option value="new-category">New Category</option>
                    <option value="partnership">Partnership Idea</option>
                    <option value="other">Other</option>
                  </select>
                  <input aria-label="Idea title" value={ideaTitle} onChange={e => setIdeaTitle(e.target.value)} placeholder="Give it a name*" style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
                  <textarea aria-label="Idea description" value={ideaDescription} onChange={e => setIdeaDescription(e.target.value)} placeholder="Describe your idea — what should it do? What problem does it solve?*" rows={3} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" style={{ flex: 1, fontSize: 12, padding: "8px 0", background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", color: "var(--gold)" }} disabled={ideaSubmitting || !ideaTitle.trim() || !ideaDescription.trim() || !authFetch} onClick={async () => { if (!authFetch) return; setIdeaSubmitting(true); try { const r = await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit-idea", title: ideaTitle, description: ideaDescription, category: ideaCategory }) }); if (!r.ok) throw new Error("failed");
      showToast("Idea submitted — we appreciate it!"); setShowIdeaForm(false); setIdeaTitle(""); setIdeaDescription(""); } catch { showToast("Failed to submit idea"); } setIdeaSubmitting(false); }}>{ideaSubmitting ? "Sending…" : "Submit Idea"}</button>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => setShowIdeaForm(false)}>{STRINGS.cancel}</button>
                  </div>
                </div>
              )}
              {!showBugForm ? (
                <button className="btn" style={{ width: "100%", background: "rgba(255,107,107,0.08)", border: "1px solid var(--border-subtle)", color: "var(--coral)", fontSize: 13 }} onClick={() => setShowBugForm(true)}><FiAlertTriangle size={14} style={{ marginRight: 6 }} />Report a Bug</button>
              ) : (
                <div style={{ padding: 14, background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--coral)", marginBottom: 10 }}>Report a Bug</div>
                  <select aria-label="Bug category" value={bugCategory} onChange={e => setBugCategory(e.target.value)} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}>
                    <option value="ui">UI / Visual Issue</option>
                    <option value="crash">App Crash</option>
                    <option value="payment">Payment Problem</option>
                    <option value="matching">Matching Not Working</option>
                    <option value="notification">Notification Issue</option>
                    <option value="upload">Upload / Media Issue</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea aria-label="Bug description" value={bugDescription} onChange={e => setBugDescription(e.target.value)} placeholder="What happened?*" rows={3} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }} />
                  <textarea aria-label="Steps to reproduce" value={bugSteps} onChange={e => setBugSteps(e.target.value)} placeholder="Steps to reproduce (optional)" rows={2} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, minWidth: 0 }}>
                    <input aria-label="Expected behavior" value={bugExpected} onChange={e => setBugExpected(e.target.value)} placeholder="Expected behavior" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
                    <input aria-label="Actual behavior" value={bugActual} onChange={e => setBugActual(e.target.value)} placeholder="Actual behavior" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" style={{ flex: 1, fontSize: 12, padding: "8px 0", background: "rgba(255,107,107,0.15)", border: "1px solid var(--border-subtle)", color: "var(--coral)" }} disabled={bugSubmitting || !bugDescription.trim() || !authFetch} onClick={async () => { if (!authFetch) return; setBugSubmitting(true); try { const r = await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "report-bug", category: bugCategory, description: bugDescription, steps: bugSteps, expected: bugExpected, actual: bugActual }) }); if (!r.ok) throw new Error("failed"); showToast("Bug report sent — thank you!"); setShowBugForm(false); setBugDescription(""); setBugSteps(""); setBugExpected(""); setBugActual(""); } catch { showToast("Failed to send bug report"); } setBugSubmitting(false); }}>{bugSubmitting ? "Sending…" : "Submit Bug"}</button>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => setShowBugForm(false)}>{STRINGS.cancel}</button>
                  </div>
                </div>
              )}
              <button className="btn" style={{ width: "100%", background: "var(--card-bg)", border: "1px solid var(--border-subtle)", color: "var(--text)", fontSize: 13 }} onClick={async () => { if (!authFetch) { showToast("Can't export right now"); return; } try { const res = await authFetch("/api/muse?type=export"); if (!res.ok) { showToast("Export failed"); return; } const j = await res.json(); const blob = new Blob([JSON.stringify(j, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "muse-my-data.json"; a.click(); URL.revokeObjectURL(url); showToast("Data exported"); } catch { showToast("Export failed"); } }}><FiDownload size={14} style={{ marginRight: 6 }} />Export My Data</button>
              <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => { try { window.location.href = "mailto:" + SUPPORT_EMAIL + "?subject=" + encodeURIComponent("Muse Support Request") + "&body=" + encodeURIComponent("Describe your issue here:\n\n"); } catch { showToast?.("Email us at " + SUPPORT_EMAIL); } }}><FiHelpCircle size={14} style={{ marginRight: 6 }} />Email Support</button>
            </div>
          </div>

          <button className="btn btn-outline" style={{ width: "100%", marginBottom: 20 }} onClick={() => doLogout()}>Log Out</button>
        </div>
      </div>

      {showNotificationsSettings && (
        <SettingsSubPage title="Notification Preferences" onClose={() => setShowNotificationsSettings(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[{ k: "match", l: "New Matches" }, { k: "message", l: "Messages" }, { k: "brief", l: "Quest Updates" }, { k: "like", l: "Likes" }].map(n => (
              <ToggleRow key={n.k} label={n.l} checked={!!notifPrefs[n.k]} onToggle={() => updateNotifPref(n.k)} />
            ))}
            <ToggleRow
              label="Lock-Screen Push"
              checked={!!pushEnabled}
              onToggle={async () => {
                if (!pushEnabled) {
                  const res = await subscribeToMusePush();
                  if (res.ok) { setPushEnabled(true); showToast("Push notifications on"); }
                  else showToast(res.error || "Could not enable push");
                } else {
                  const res = await unsubscribeFromMusePush();
                  if (res.ok) { setPushEnabled(false); showToast("Push notifications off"); }
                  else showToast(res.error || "Could not disable push");
                }
              }}
            />
          </div>
        </SettingsSubPage>
      )}

      {showConnectedAccounts && (
        <SettingsSubPage title="Connected Accounts" onClose={() => setShowConnectedAccounts(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[{ k: "instagram", l: "Instagram", icon: <FiInstagram size={18} /> }, { k: "facebook", l: "Facebook", icon: <FiFacebook size={18} /> }, { k: "spotify", l: "Spotify", icon: <FiMusic size={18} /> }, { k: "soundcloud", l: "SoundCloud", icon: <FiHeadphones size={18} /> }].map(s => (
              <div key={s.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "var(--text2)" }}>{s.icon}</span><span style={{ fontSize: 14, color: "var(--text)" }}>{s.l}</span></div>
                <div role="switch" aria-checked={!!obConnectedSocials[s.k]} aria-label={s.l} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSocial(s.k); } }} onClick={() => toggleSocial(s.k)} className={"toggle-track" + (obConnectedSocials[s.k] ? " active" : "")} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "all .3s", background: obConnectedSocials[s.k] ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.1)" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: obConnectedSocials[s.k] ? 22 : 2, transition: "all .3s" }} />
                </div>
              </div>
            ))}
          </div>
        </SettingsSubPage>
      )}

      {showChangePassword && (
        <SettingsSubPage title="Change Password" onClose={() => setShowChangePassword(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 2 }}>Enter a new password. Must be 6+ chars, include a capital letter and a symbol.</div>
            <input
              className="inp"
              type="password"
              aria-label="Current password"
              placeholder="Current password (optional session)"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              style={{ margin: 0 }}
            />
            <input
              className="inp"
              type="password"
              aria-label="New password"
              placeholder="New password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              style={{ margin: 0 }}
            />
            <input
              className="inp"
              type="password"
              placeholder="Confirm new password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              style={{ margin: 0 }}
            />
            <button className="btn btn-gold" onClick={changePassword} disabled={pwBusy} style={{ marginTop: 4 }}>
              {pwBusy ? "Updating..." : "Update Password"}
            </button>
          </div>
        </SettingsSubPage>
      )}

      {showBlockedUsers && (
        <SettingsSubPage title="Blocked Users" onClose={() => setShowBlockedUsers(false)}>
          {blockedUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--text2)", fontSize: 13 }}>No blocked users</div>
          ) : (
            blockedUsers.map(uid => (
              <div key={uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text)" }}>
                  {blockedProfiles[uid]?.avatar && <img src={blockedProfiles[uid].avatar} alt={`${blockedProfiles[uid]?.name || "Blocked user"}'s avatar`} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
                  {blockedProfiles[uid]?.name || uid}
                </span>
                <button className="btn btn-outline" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => { setBlockedUsers(blockedUsers.filter(b => b !== uid)); if (apiFetch) { apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unblock", target_id: uid }) }).catch(() => {}); } }}>Unblock</button>
              </div>
            ))
          )}
        </SettingsSubPage>
      )}

      {showPersonality && (
        <SettingsSubPage title="Personality Profile" onClose={() => setShowPersonality(false)}>
          {(() => {
            const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
            const CHINESE = ["Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat","Monkey","Rooster","Dog","Pig"];
            const MBTI = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];
            const LIFE_PATHS = [1,2,3,4,5,6,7,8,9,11,22,33];
            const chipRow = (label: string, options: (string|number)[], value: any, setValue: (v: any) => void) => (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8, textAlign: "center" }}>{label}</div>
                <div className="chips" style={{ marginBottom: 0 }}>
                  {options.map(o => (
                    <div key={String(o)} className={"chip" + (value === o ? " sel" : "")} role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setValue(o); } }}
                      onClick={() => setValue(o)}><span>{o}</span></div>
                  ))}
                </div>
              </div>
            );
            return (
              <div>
                {chipRow("Zodiac", ZODIAC, persZodiac, setPersZodiac)}
                {chipRow("Chinese Zodiac", CHINESE, persChinese, setPersChinese)}
                {chipRow("MBTI", MBTI, persMbti, setPersMbti)}
                {chipRow("Life Path", LIFE_PATHS, persLifePath, setPersLifePath)}
                <button className="btn btn-gold" style={{ width: "100%", marginTop: 8 }} onClick={async () => {
                  try {
                    await apiFetch?.("/api/muse/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-profile", zodiac: persZodiac, chinese: persChinese, mbti: persMbti, life_path: persLifePath }) });
                    showToast("Personality profile saved!");
                    setShowPersonality(false);
                  } catch { showToast("Couldn't save — try again"); }
                }}>Save</button>
              </div>
            );
          })()}
        </SettingsSubPage>
      )}

      {showCreativeProfile && (
        <SettingsSubPage title="Creative Profile" onClose={() => setShowCreativeProfile(false)}>
          {(() => {
            const toggle = (arr: string[], v: string, set: (x: string[]) => void, max = 6) => {
              if (arr.includes(v)) set(arr.filter(x => x !== v));
              else if (arr.length < max) set([...arr, v]);
              else showToast(`Max ${max} selected`);
            };
            const row = (label: string, options: string[], value: any, onPick: (v: string) => void, multi = false) => (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8, textAlign: "center" }}>{label}</div>
                <div className="chips" style={{ marginBottom: 0 }}>
                  {options.map(o => {
                    const sel = multi ? (value as string[]).includes(o) : value === o;
                    return (
                      <div key={o} className={"chip" + (sel ? " sel" : "")} role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(o); } }}
                        onClick={() => onPick(o)}><span>{o}</span></div>
                    );
                  })}
                </div>
              </div>
            );
            return (
              <div>
                {row("Behind the Camera", BEHIND_CAMERA, cpType, (v) => { setCpType(v); setCpCustomTypePending(false); })}
                {row("In Front of the Camera", IN_FRONT_CAMERA, cpType, (v) => { setCpType(v); setCpCustomTypePending(false); })}
                {/* Torreé audit item 6: not every creative role fits the preset
                    list — "Other" lets someone type their own, saved as a real
                    `type` value immediately and flagged custom_type_pending
                    for admin review at /muse/admin/moderation. */}
                <div style={{ marginBottom: 16 }}>
                  <div className="chips" style={{ marginBottom: 0 }}>
                    <div className={"chip" + (cpCustomTypePending ? " sel" : "")} role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCpType(""); setCpCustomTypePending(true); } }}
                      onClick={() => { setCpType(""); setCpCustomTypePending(true); }}><span>Add New +</span></div>
                  </div>
                  {cpCustomTypePending && (
                    <input className="inp" aria-label="Creative role" placeholder="Type your creative role..." value={cpType} onChange={e => setCpType(e.target.value)} style={{ marginTop: 10 }} autoFocus />
                  )}
                </div>
                {row("Looking For", lookingForOptions(cpType), cpLooking, (v) => toggle(cpLooking, v, setCpLooking, 4), true)}
                {row("Aesthetic", AESTHETICS, cpStyles, (v) => toggle(cpStyles, v, setCpStyles, 6), true)}
                <div style={{ marginBottom: 16 }}>
                  <div className="chips" style={{ marginBottom: 0 }}>
                    <div className={"chip" + (cpShowCustomStyleInput ? " sel" : "")} role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCpShowCustomStyleInput(v => !v); } }}
                      onClick={() => setCpShowCustomStyleInput(v => !v)}><span>Add New +</span></div>
                    {cpStyles.filter(s => !AESTHETICS.includes(s)).map(s => (
                      <div key={s} className="chip sel" role="button" tabIndex={0} title="Tap to remove"
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCpStyles(cs => cs.filter(x => x !== s)); } }}
                        onClick={() => setCpStyles(cs => cs.filter(x => x !== s))}><span>✎ {s} ✕</span></div>
                    ))}
                  </div>
                  {cpShowCustomStyleInput && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input className="inp" aria-label="Custom aesthetic" placeholder="Type your own aesthetic..." value={cpCustomStyleDraft} onChange={e => setCpCustomStyleDraft(e.target.value)} style={{ margin: 0, flex: 1 }} autoFocus />
                      <button className="btn btn-outline" style={{ padding: "0 16px" }} onClick={() => {
                        const v = cpCustomStyleDraft.trim();
                        if (!v) return;
                        if (cpStyles.includes(v)) return;
                        if (cpStyles.length >= 6) { showToast("Max 6 selected"); return; }
                        setCpStyles(cs => [...cs, v]);
                        setCpCustomStylePending(true);
                        setCpCustomStyleDraft("");
                      }}>Add</button>
                    </div>
                  )}
                </div>
                <button className="btn btn-gold" style={{ width: "100%", marginTop: 8 }} onClick={async () => {
                  try {
                    await apiFetch?.("/api/muse/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
                      action: "update-profile", type: cpType, looking: cpLooking, styles: cpStyles,
                      ...(cpCustomTypePending ? { custom_type_pending: true } : {}),
                      ...(cpCustomStylePending ? { custom_style_pending: true } : {}),
                    }) });
                    showToast("Creative profile saved!");
                    setShowCreativeProfile(false);
                  } catch { showToast("Couldn't save — try again"); }
                }}>Save</button>
              </div>
            );
          })()}
        </SettingsSubPage>
      )}

      {showMFA && (
        <SettingsSubPage title="Two-Factor Authentication" onClose={() => {
          // Abandoning setup (X / back) must also drop the factor we just created,
          // otherwise a stale unverified factor blocks the next attempt.
          const pendingId = mfaFactors[0]?.id;
          if (mfaEnrolling && pendingId) { mfaUnenroll(pendingId).catch(() => { /* best effort */ }); }
          setShowMFA(false); setMfaEnrolling(false); setMfaQrUri(""); setMfaSecret(""); setMfaVerifyCode(""); setMfaError(""); setMfaFactors([]);
        }}>
          {mfaLoading ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--text2)", fontSize: 13 }}>Loading...</div>
          ) : mfaEnrolling ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code below.
              </div>
              {mfaQrUri && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 16, background: "rgba(255,255,255,0.95)", borderRadius: 12, margin: "0 auto" }}>
                  {/* Local /api/qr (same-origin) — the old api.qrserver.com URL was
                      blocked by the site CSP img-src, so the QR never rendered. */}
                  <img src={`/api/qr?url=${encodeURIComponent(mfaQrUri)}&source=mfa`} alt="MFA QR Code" width={200} height={200} style={{ width: 200, height: 200, display: "block", margin: "0 auto" }} />
                </div>
              )}
              {mfaSecret && (
                <div style={{ textAlign: "center", padding: "8px 12px", background: "var(--card-bg)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Manual entry key:</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "monospace", letterSpacing: 1 }}>{mfaSecret}</div>
                </div>
              )}
              <input
                className="inp"
                type="text"
                inputMode="numeric"
                aria-label="Two-factor authentication code"
                placeholder="Enter 6-digit code"
                value={mfaVerifyCode}
                onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{ margin: 0, textAlign: "center", fontSize: 18, letterSpacing: 4 }}
              />
              {mfaError && <div style={{ fontSize: 12, color: "var(--coral)", textAlign: "center" }}>{mfaError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-outline" style={{ flex: 1, fontSize: 13 }} onClick={async () => {
                  // Unenroll the factor we just created so abandoning setup doesn't
                  // leave a stale unverified factor blocking the next attempt.
                  const pendingId = mfaFactors[0]?.id;
                  if (pendingId) { try { await mfaUnenroll(pendingId); } catch { /* best effort */ } }
                  setMfaFactors([]);
                  setMfaEnrolling(false); setMfaQrUri(""); setMfaSecret(""); setMfaVerifyCode(""); setMfaError("");
                }}>Cancel</button>
                <button
                  className="btn btn-gold"
                  style={{ flex: 1, fontSize: 13 }}
                  disabled={mfaVerifyCode.length !== 6}
                  onClick={async () => {
                    if (!mfaFactors.length) return;
                    setMfaError("");
                    try {
                      const res = await mfaVerify(mfaFactors[0].id, mfaVerifyCode);
                      if (res.success) {
                        setMfaEnabled(true);
                        setMfaEnrolling(false);
                        setMfaQrUri("");
                        setMfaSecret("");
                        setMfaVerifyCode("");
                        showToast("✓ Two-factor authentication enabled");
                        // Refresh factors
                        const status = await mfaStatus();
                        setMfaFactors(status.factors || []);
                      } else {
                        setMfaError(res.error || "Invalid code — try again");
                      }
                    } catch { setMfaError("Verification failed — try again"); }
                  }}
                >Verify & Enable</button>
              </div>
            </div>
          ) : mfaEnabled ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
                <FiShield size={20} style={{ color: "var(--text)" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Two-factor is active</div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>Your account is protected with TOTP verification.</div>
                </div>
              </div>
              {mfaFactors.filter(f => f.status === "verified").map(f => (
                  <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--card-bg)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.friendlyName || "Authenticator"}</div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>Verified</div>
                  </div>
                  <button
                    className="btn btn-outline"
                    style={{ padding: "4px 12px", fontSize: 12, color: "var(--coral)", borderColor: "var(--border-subtle)" }}
                    onClick={async () => {
                      try {
                        const res = await mfaUnenroll(f.id);
                        if (res.success) {
                          setMfaEnabled(false);
                          setMfaFactors([]);
                          showToast("Two-factor authentication disabled");
                        } else {
                          showToast(res.error || "Could not disable");
                        }
                      } catch { showToast("Could not disable two-factor"); }
                    }}
                  >Disable</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
                Two-factor authentication adds an extra layer of security to your account. When enabled, you'll enter a code from your authenticator app each time you sign in.
              </div>
              <button
                className="btn btn-gold"
                style={{ width: "100%", fontSize: 13 }}
                onClick={async () => {
                  setMfaLoading(true);
                  setMfaError("");
                  try {
                    // Self-heal: drop any stale unverified factor(s) left by a previous
                    // abandoned setup before enrolling, so we never stack factors or
                    // trip over a half-finished one.
                    const status = await mfaStatus().catch(() => null);
                    const stale = (status?.factors || []).filter(f => f.status !== "verified");
                    for (const f of stale) {
                      try { await mfaUnenroll(f.id); } catch { /* best effort */ }
                    }
                    const res = await mfaEnroll();
                    if (res.id) {
                      setMfaQrUri(res.qr_uri || res.totp?.qr_code || "");
                      setMfaSecret(res.secret || res.totp?.secret || "");
                      setMfaFactors([{ id: res.id, status: "unverified" }]);
                      setMfaEnrolling(true);
                    } else {
                      showToast(res.error || "Could not start setup");
                    }
                  } catch { showToast("Could not start setup"); }
                  setMfaLoading(false);
                }}
              >Set Up Two-Factor</button>
            </div>
          )}
        </SettingsSubPage>
      )}

      {showBriefTemplates && (
        <SettingsSubPage title="Brief Templates" onClose={() => setShowBriefTemplates(false)}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            Reusable formats so you don&apos;t retype the same brief every time.
          </div>
          {briefTemplates.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>No templates yet — add your first below.</div>
          )}
          {briefTemplates.map((t, i) => (
            <div key={i} style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)" }}>
              <input aria-label="Template name" value={t.title} placeholder="Template name" onChange={(e) => setBriefTemplates((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              <textarea value={t.desc} placeholder="What you're looking for" rows={2} onChange={(e) => setBriefTemplates((prev) => prev.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
                style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input aria-label="Template budget" value={t.budget} placeholder="Budget (e.g. $500)" onChange={(e) => setBriefTemplates((prev) => prev.map((x, j) => j === i ? { ...x, budget: e.target.value } : x))}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
                <button onClick={() => setBriefTemplates((prev) => prev.filter((_, j) => j !== i))} aria-label="Delete template"
                  style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,138,128,0.4)", background: "transparent", color: "#ff8a80", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
          <button className="btn btn-outline" style={{ width: "100%", marginBottom: 12 }}
            onClick={() => setBriefTemplates((prev) => [...prev, { title: "", desc: "", budget: "" }])}>+ Add template</button>
          <button className="btn btn-gold" style={{ width: "100%" }} onClick={async () => {
            try {
              await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { briefTemplates } }) });
              showToast("Brief templates saved!");
            } catch { showToast("Couldn't save — try again"); }
          }}>Save Templates</button>
        </SettingsSubPage>
      )}

      {showTeam && (
        <SettingsSubPage title="Team Management" onClose={() => setShowTeam(false)}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            Who works with you. Roles are for your own reference.
          </div>
          {teamMembers.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>No team members yet.</div>
          )}
          {teamMembers.map((m, i) => (
            <div key={i} style={{ marginBottom: 10, padding: 12, borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)" }}>
              {[
                { k: "name" as const, ph: "Name" },
                { k: "email" as const, ph: "Email" },
              ].map((f) => (
                <input key={f.k} value={m[f.k]} placeholder={f.ph} onChange={(e) => setTeamMembers((prev) => prev.map((x, j) => j === i ? { ...x, [f.k]: e.target.value } : x))}
                  style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <select value={m.role} onChange={(e) => setTeamMembers((prev) => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}>
                  {["Owner", "Manager", "Editor", "Assistant", "Viewer"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => setTeamMembers((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove member"
                  style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,138,128,0.4)", background: "transparent", color: "#ff8a80", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Remove</button>
              </div>
            </div>
          ))}
          <button className="btn btn-outline" style={{ width: "100%", marginBottom: 12 }}
            onClick={() => setTeamMembers((prev) => [...prev, { name: "", email: "", role: "Editor" }])}>+ Add member</button>
          <button className="btn btn-gold" style={{ width: "100%" }} onClick={async () => {
            try {
              await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { teamMembers } }) });
              showToast("Team saved!");
            } catch { showToast("Couldn't save — try again"); }
          }}>Save Team</button>
        </SettingsSubPage>
      )}

      {showHiring && (
        <SettingsSubPage title="Hiring Preferences" onClose={() => setShowHiring(false)}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            What you look for when hiring — used to filter who you see and to auto-decline mismatches.
          </div>
          {[
            { label: "Minimum rate", value: hireMinRate, set: setHireMinRate, ph: "e.g. $300/day" },
            { label: "Availability needed", value: hireAvailability, set: setHireAvailability, ph: "e.g. Weekends, 2 weeks notice" },
            { label: "Preferred creative types", value: hireTypes, set: setHireTypes, ph: "e.g. Photographer, MUA, Stylist" },
            { label: "Notes", value: hireNotes, set: setHireNotes, ph: "Anything else you need" },
          ].map((f) => (
            <div key={f.label} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{f.label}</div>
              <input aria-label={f.label} value={f.value} placeholder={f.ph} onChange={(e) => f.set(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          ))}
          <button className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={async () => {
            try {
              await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { hireMinRate, hireAvailability, hireTypes, hireNotes } }) });
              showToast("Hiring preferences saved!");
            } catch { showToast("Couldn't save — try again"); }
          }}>Save Hiring Preferences</button>
        </SettingsSubPage>
      )}

      {showRateSettings && (
        <SettingsSubPage title="Rate Settings" onClose={() => setShowRateSettings(false)}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            Your standard pricing. Clients see this on your profile and it pre-fills booking requests.
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Currency</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["USD", "EUR", "GBP", "CAD", "AUD"].map((cur) => (
                <button key={cur} onClick={() => setRateCurrency(cur)}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: rateCurrency === cur ? "var(--gold)" : "var(--glass)", color: rateCurrency === cur ? "#0a0612" : "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {[
            { label: "Hourly rate", value: rateHourly, set: setRateHourly, ph: "150" },
            { label: "Half-day rate", value: rateHalfDay, set: setRateHalfDay, ph: "600" },
            { label: "Full-day rate", value: rateFullDay, set: setRateFullDay, ph: "1100" },
          ].map((f) => (
            <div key={f.label} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{f.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>{rateCurrency}</span>
                <input type="number" min={0} aria-label={f.label} placeholder={f.ph} value={f.value} onChange={(e) => f.set(e.target.value)}
                  style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Notes shown to clients (optional)</div>
            <input type="text" placeholder="e.g. Travel billed separately" value={rateNotes} onChange={(e) => setRateNotes(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          <button className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={async () => {
            try {
              await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { rateHourly, rateHalfDay, rateFullDay, rateCurrency, rateNotes } }) });
              showToast("Rate settings saved!");
            } catch { showToast("Couldn't save — try again"); }
          }}>Save Rate Settings</button>
        </SettingsSubPage>
      )}

      {showPortfolioSettings && (
        <SettingsSubPage title="Portfolio Settings" onClose={() => setShowPortfolioSettings(false)}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            Control who can see your portfolio and how your work is presented.
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "4px 0 8px" }}>Who can see your portfolio</div>
          {[
            { k: "everyone", l: "Everyone", d: "Any Muse member can view your work" },
            { k: "matches", l: "Matches only", d: "Only people you've matched with" },
            { k: "private", l: "Private", d: "Hidden from everyone" },
          ].map(o => (
            <button key={o.k} onClick={() => setPortfolioVisibility(o.k)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", marginBottom: 8, border: "1px solid var(--border-subtle)", borderRadius: 14, background: portfolioVisibility === o.k ? "var(--gold)" : "var(--glass)", color: portfolioVisibility === o.k ? "#0a0612" : "var(--text)", cursor: "pointer" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{o.l}</div>
              <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>{o.d}</div>
            </button>
          ))}
          <ToggleRow label="Featured work" desc="Highlight your best pieces first" checked={portfolioFeatured} onToggle={() => setPortfolioFeatured(v => !v)} />
          <ToggleRow label="Show portfolio on my profile" checked={portfolioShowOnProfile} onToggle={() => setPortfolioShowOnProfile(v => !v)} />
          <button className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={async () => {
            try {
              await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { portfolioVisibility, portfolioFeatured, portfolioShowOnProfile } }) });
              showToast("Portfolio settings saved!");
            } catch { showToast("Couldn't save — try again"); }
          }}>Save Portfolio Settings</button>
        </SettingsSubPage>
      )}

      {showAvailability && (
        <SettingsSubPage title="Availability Calendar" onClose={() => setShowAvailability(false)}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            Tell clients when you&apos;re bookable. This drives your Discover badge and booking requests.
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "4px 0 8px" }}>Current status</div>
          {[
            { k: "available", l: "Available", d: "Open to booking requests" },
            { k: "busy", l: "Busy", d: "Working — limited availability" },
            { k: "unavailable", l: "Not accepting", d: "Paused all new bookings" },
          ].map(o => (
            <button key={o.k} onClick={() => setAvailabilityStatus(o.k)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", marginBottom: 8, border: "1px solid var(--border-subtle)", borderRadius: 14, background: availabilityStatus === o.k ? "var(--gold)" : "var(--glass)", color: availabilityStatus === o.k ? "#0a0612" : "var(--text)", cursor: "pointer" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{o.l}</div>
              <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>{o.d}</div>
            </button>
          ))}
          {[
            { label: "Booking lead time (days)", value: String(bookingLeadDays), set: (v: string) => setBookingLeadDays(Math.max(0, Math.min(90, Number(v) || 0))), ph: "3", type: "number" },
            { label: "Away / travel dates", value: travelDates, set: setTravelDates, ph: "e.g. Oct 1–15 (traveling)", type: "text" },
            { label: "Typical budget range", value: budgetRange, set: setBudgetRange, ph: "e.g. $500–$2,000", type: "text" },
            { label: "Note shown to clients (optional)", value: availabilityNote, set: setAvailabilityNote, ph: "e.g. Booking 2 weeks out", type: "text" },
          ].map(f => (
            <div key={f.label} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{f.label}</div>
              <input type={f.type} aria-label={f.label} placeholder={f.ph} value={f.value} onChange={e => f.set(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          ))}
          <button className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={async () => {
            try {
              await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { availabilityStatus, availabilityNote, bookingLeadDays, travelDates, budgetRange } }) });
              showToast("Availability saved!");
            } catch { showToast("Couldn't save — try again"); }
          }}>Save Availability</button>
        </SettingsSubPage>
      )}
    </div>
  );
});

export default SettingsScreen;
