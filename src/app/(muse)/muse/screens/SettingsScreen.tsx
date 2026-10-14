/** Settings screen: profile, privacy, notifications, theme, MFA, boost, pricing, and hiring sub-pages for the account. */
"use client";

import React, { memo, useState, useEffect, useRef } from "react";
import { FiArrowLeft, FiUser, FiLink, FiStar, FiUsers, FiShield, FiInstagram, FiMusic, FiHeadphones, FiEye, FiMoreHorizontal, FiZap, FiDollarSign, FiGift, FiFile, FiX, FiLock, FiBell, FiCompass, FiFacebook, FiBriefcase } from "react-icons/fi";
// Push subscribe/unsubscribe arrive as PROPS (page.tsx owns the real impls) —
// importing the module fns here too shadowed them and invited drift.
import type { Screen } from "../components/types"; import type { CurrentUser, AuthUser, AuthFetchFn, MuseTheme, BlockedProfileRow } from "../page-models"; import type { OnboardingData } from "../hooks/useAuthOnboardingState";
import { getMuseRole, roleBadgeText, type MuseRole } from "@/lib/role";
import { validatePassword, PASSWORD_RULES_LABEL } from "@/lib/password-policy";
import { isPaidTier } from "../components/subscriptionTiers";
import { BoostAnalyticsPanel } from "../components/BoostAnalyticsPanel";
import { SettingsSubPage } from "../components/SettingsSubPage";
import { ToggleRow, OpacitySlider } from "../components/SettingsToggleRow";
import { SettingsMFAPanel } from "../components/SettingsMFAPanel";
import { SettingsPersonalityPanel, SettingsCreativeProfilePanel } from "../components/SettingsPersonalityCreativePanels";
import { SettingsBriefTemplatesPanel, SettingsTeamPanel, SettingsHiringPanel } from "../components/SettingsBusinessPanels";
import { SettingsRateSettingsPanel, SettingsPortfolioPanel, SettingsAvailabilityPanel } from "../components/SettingsPricingPanels";
import { SettingsHelpSupportSection } from "../components/SettingsHelpSupportSection";

const THEME_ABBR: Record<string, string> = { lasunset: "SUNSET", deepspace: "SPACE", nebula: "NEBULA", deepsea: "DEEPSEA", cinder: "CINDER", boreal: "BOREAL", sunrise: "SUNRISE", daylight: "DAY", sky: "SKY", rose: "ROSE", meadow: "MEADOW", frost: "FROST" };
const DARK_THEMES = ["lasunset", "deepspace", "nebula", "deepsea", "cinder", "boreal"] as const;
const LIGHT_THEMES = ["sunrise", "daylight", "sky", "rose", "meadow", "frost"] as const;

export interface SettingsScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  goBack?: () => void;
  currentUser: CurrentUser;
  obData: OnboardingData;
  showNsfw: boolean;
  setShowNsfw: (v: boolean) => void;
  notifPrefs: Record<string, boolean>;
  setNotifPrefs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  blockedUsers: string[];
  setBlockedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  obConnectedSocials: Record<string, boolean>;
  toggleSocial: (k: string) => void;
  theme: string;
  setTheme: (t: MuseTheme) => void;
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
  promptResponses: unknown[];
  promptBankData: unknown[];
  myGeo: unknown;
  setShowAgeGate: (v: boolean) => void;
  setPendingNsfw: (v: boolean) => void;
  setShowAgeVerification: (v: boolean) => void;
  /** Persisted profile preferences (muse_profiles.preferences) — seeds the
   *  Portfolio & Availability sub-pages with the user's saved values. */
  preferences?: Record<string, unknown>;
  authUser?: AuthUser;
  showBlockedUsers?: boolean;
  setShowBlockedUsers?: (v: boolean | ((p: boolean) => boolean)) => void;
  setScreen?: (s: Screen) => void;
  setObStep?: (s: number) => void;
  apiFetch?: AuthFetchFn;
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
  authFetch?: AuthFetchFn;
  setSupportOpen?: (v: boolean) => void;
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
  setScreen: _setScreen = () => {},
  setObStep: _setObStep = () => {},
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
  const [showBoostAnalytics, setShowBoostAnalytics] = useState(false);
  const [showPortfolioSettings, setShowPortfolioSettings] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showRateSettings, setShowRateSettings] = useState(false);
  // Brand/business tools (were "coming soon" stubs).
  const [showBriefTemplates, setShowBriefTemplates] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showHiring, setShowHiring] = useState(false);
  const [showPersonality, setShowPersonality] = useState(false);
  const [showCreativeProfile, setShowCreativeProfile] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // 2FA / MFA — only `mfaEnabled` needs to live here (shown in the Privacy &
  // Safety row description below); the rest of the enrollment flow's state
  // is owned by SettingsMFAPanel itself.
  const [showMFA, setShowMFA] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

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
          d.blocked.forEach((p: BlockedProfileRow) => { if (p?.id) map[p.id] = { name: p.name, avatar: p.avatar }; });
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
    const pwErr = validatePassword(pwNew);
    if (pwErr) { showToast(pwErr); return; }
    if (pwNew !== pwConfirm) { showToast("Passwords don't match"); return; }
    setPwBusy(true);
    try {
      if (!apiFetch) { showToast("Can't update password right now"); setPwBusy(false); return; }
      let access_token = "";
      try { access_token = JSON.parse(localStorage.getItem("muse_user") || "{}")?.access_token || ""; } catch { /* keep empty token */ }
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
      desc: !ageVerified ? "Not verified — paid features locked. Tap to verify" : verificationExpiringSoon ? "Reverification required soon — tap to continue paid access" : "Verified ✓",
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
    { icon: <FiZap size={18} />, label: "Boost Performance", desc: "See how your profile boost is doing", action: () => setShowBoostAnalytics(true), dot: false },
  ];

  const legalItems = [
    { icon: <FiFile size={18} />, label: "Terms of Service", desc: "Legal terms", action: () => setShowTerms(true) },
    { icon: <FiFile size={18} />, label: "Privacy Policy", desc: "How we handle your data", action: () => setShowPrivacy(true) },
    { icon: <FiFile size={18} />, label: "Community Guidelines", desc: "Standards & expectations", action: () => setShowGuidelines(true) },
    { icon: <FiFile size={18} />, label: "DMCA / Copyright", desc: "Copyright infringement claims", action: () => window.open("/dmca", "_self") },
    { icon: <FiX size={18} />, label: "Delete Account", desc: "Remove account access and associated content", action: () => setShowDeleteConfirm(true) },
  ];

  const renderRow = (item: { icon: React.ReactNode; label: string; desc: string; action: () => void; dot?: boolean }) => (
    <button type="button" key={item.label} className="settings-item" onClick={item.action} style={{ textAlign: "left", width: "100%" }}>
      <div className="settings-item-left">
        <div className="settings-icon" style={{ position: "relative" }}>
          {item.icon}
          {item.dot && <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: "var(--pink)", border: "1.5px solid var(--bg)" }} />}
        </div>
        <div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div>
      </div>
      <div className="settings-arrow">→</div>
    </button>
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
                  <button key={g} type="button" aria-pressed={discoveryPrefs.gender === g} onClick={() => setDiscoveryPrefs(p => ({ ...p, gender: g }))} style={{ minWidth: 44, minHeight: 44, padding: "8px 16px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all .25s", background: discoveryPrefs.gender === g ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)", border: "1px solid " + (discoveryPrefs.gender === g ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"), color: discoveryPrefs.gender === g ? "var(--gold)" : "var(--muted)" }}>{g.charAt(0).toUpperCase() + g.slice(1)}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-gold" style={{ width: "100%", fontSize: 12 }} onClick={async () => { try { await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { ...discoveryPrefs } }) }); showToast("Preferences saved!"); } catch { showToast("Failed to save"); } }}>Save Discovery Preferences</button>
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Account</div>
            {completionPct !== null && completionPct < 100 && (
              <button
                type="button"
                aria-expanded={showCompletionDetails}
                onClick={() => setShowCompletionDetails(!showCompletionDetails)}
                style={{ width: "100%", minHeight: 44, padding: "10px 14px", marginBottom: 8, borderRadius: 12, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)", cursor: "pointer", textAlign: "left" }}
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
              </button>
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
              desc="Musa Pro"
              checked={!!showDistance}
              onToggle={() => {
                if (!isPaidTier(userTier)) {
                  setUpsell?.({ feature: "Show Distance", reason: "Let people see how close you are. Upgrade to Musa Pro to control whether your distance is shown on your profile.", icon: "📍" });
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
              desc="Musa Pro"
              checked={showAge !== false}
              onToggle={() => {
                if (!isPaidTier(userTier)) {
                  setUpsell?.({ feature: "Hide Age", reason: "Keep your age private. Upgrade to Musa Pro to control whether your age is shown on your profile.", icon: "🎂" });
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
              desc="Musa Pro"
              checked={!!showOnline}
              onToggle={() => {
                if (!isPaidTier(userTier)) {
                  setUpsell?.({ feature: "Hide Online Status", reason: "Control who sees when you're active. Upgrade to Musa Pro to hide your online status from other members.", icon: "🟢" });
                  return;
                }
                const next = !showOnline;
                setShowOnline?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showOnline: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
            <ToggleRow
              label="Match % Visible to Others"
              desc="Musa Pro"
              checked={showMatchPercent !== false}
              onToggle={() => {
                if (!isPaidTier(userTier)) {
                  setUpsell?.({ feature: "Hide Match %", reason: "Keep your match-percentage private. Upgrade to Musa Pro to control whether others see how well you match with them.", icon: "✨" });
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

          <SettingsHelpSupportSection showScreen={showScreen} showToast={showToast} authFetch={authFetch} setSupportOpen={setSupportOpen} />

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

      {showBoostAnalytics && (
        <SettingsSubPage title="Boost Performance" onClose={() => setShowBoostAnalytics(false)}>
          <BoostAnalyticsPanel apiFetch={apiFetch} />
        </SettingsSubPage>
      )}

      {showChangePassword && (
        <SettingsSubPage title="Change Password" onClose={() => setShowChangePassword(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 2 }}>Enter a new password. {PASSWORD_RULES_LABEL}</div>
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
                          {blockedProfiles[uid]?.name || "Unknown user"}
                </span>
                    <button className="btn btn-outline" aria-label={`Unblock ${blockedProfiles[uid]?.name || "this user"}`} style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => { const who = blockedProfiles[uid]?.name || "this user"; if (!window.confirm(`Unblock ${who}? They will be able to see your profile and contact you again.`)) return; setBlockedUsers(blockedUsers.filter(b => b !== uid)); if (apiFetch) { apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unblock", target_id: uid }) }).catch(() => {}); } }}>Unblock</button>
              </div>
            ))
          )}
        </SettingsSubPage>
      )}

      {showPersonality && (
        <SettingsPersonalityPanel obData={obData} apiFetch={apiFetch} showToast={showToast} onClose={() => setShowPersonality(false)} />
      )}

      {showCreativeProfile && (
        <SettingsCreativeProfilePanel obData={obData} apiFetch={apiFetch} showToast={showToast} onClose={() => setShowCreativeProfile(false)} />
      )}

      {showMFA && (
        <SettingsMFAPanel mfaEnabled={mfaEnabled} setMfaEnabled={setMfaEnabled} showToast={showToast} onClose={() => setShowMFA(false)} />
      )}

      {showBriefTemplates && (
        <SettingsBriefTemplatesPanel preferences={preferences} apiFetch={apiFetch} showToast={showToast} onClose={() => setShowBriefTemplates(false)} />
      )}

      {showTeam && (
        <SettingsTeamPanel preferences={preferences} apiFetch={apiFetch} showToast={showToast} onClose={() => setShowTeam(false)} />
      )}

      {showHiring && (
        <SettingsHiringPanel preferences={preferences} apiFetch={apiFetch} showToast={showToast} onClose={() => setShowHiring(false)} />
      )}

      {showRateSettings && (
        <SettingsRateSettingsPanel preferences={preferences} apiFetch={apiFetch} showToast={showToast} onClose={() => setShowRateSettings(false)} />
      )}

      {showPortfolioSettings && (
        <SettingsPortfolioPanel preferences={preferences} apiFetch={apiFetch} showToast={showToast} onClose={() => setShowPortfolioSettings(false)} />
      )}

      {showAvailability && (
        <SettingsAvailabilityPanel preferences={preferences} apiFetch={apiFetch} showToast={showToast} onClose={() => setShowAvailability(false)} />
      )}
    </div>
  );
});

export default SettingsScreen;
