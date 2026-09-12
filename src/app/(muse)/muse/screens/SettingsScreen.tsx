"use client";

import React, { memo, useState, useEffect, useRef } from "react";
import { FiArrowLeft, FiUser, FiLink, FiStar, FiUsers, FiShield, FiInstagram, FiTwitter, FiMusic, FiHeadphones, FiEye, FiMoreHorizontal, FiZap, FiDollarSign, FiGift, FiFile, FiX, FiLock, FiBell, FiHelpCircle, FiDownload, FiAlertTriangle, FiCompass, FiFacebook } from "react-icons/fi";
import { mfaStatus, mfaEnroll, mfaVerify, mfaUnenroll } from "../lib/api";
// Push subscribe/unsubscribe arrive as PROPS (page.tsx owns the real impls) —
// importing the module fns here too shadowed them and invited drift.
import type { Screen } from "../components/types";
import { BEHIND_CAMERA, IN_FRONT_CAMERA, AESTHETICS, lookingForOptions } from "../components/types";
import { STRINGS } from "@/lib/strings";

const SUPPORT_EMAIL = "info@wyzdesign.com";

// See the theme-grid audit-fix comment below — unique 3-letter labels so no
// two theme swatches read the same.
const THEME_ABBR: Record<string, string> = { lasunset: "SUNSET", deepspace: "SPACE", nebula: "NEBULA", deepsea: "DEEPSEA", sunrise: "SUNRISE", daylight: "DAY", sky: "SKY", rose: "ROSE" };
const DARK_THEMES = ["lasunset", "deepspace", "nebula", "deepsea"] as const;
const LIGHT_THEMES = ["sunrise", "daylight", "sky", "rose"] as const;

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
  authFetch?: (url: string, opts?: any) => Promise<any>;
  setShowFeatureTour?: (v: boolean) => void;
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
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 950, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      role="presentation"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", background: "var(--panel-bg-solid)", backdropFilter: "blur(30px)", borderRadius: "24px 24px 0 0", border: "1px solid var(--border-subtle)", borderBottom: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 16px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>{title}</div>
          <button onClick={onClose} aria-label={`Close ${title}`} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", padding: 6 }}><FiX size={20} /></button>
        </div>
        <div style={{ padding: "16px 20px 28px", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 14, color: "var(--text)" }}>{label}</span>
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
  authFetch,
  setShowFeatureTour,
  setSupportOpen,
}: SettingsScreenProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPersonality, setShowPersonality] = useState(false);
  const [showCreativeProfile, setShowCreativeProfile] = useState(false);
  const [cpType, setCpType] = useState((obData as any)?.type || "");
  const [cpLooking, setCpLooking] = useState<string[]>((obData as any)?.looking || []);
  const [cpStyles, setCpStyles] = useState<string[]>((obData as any)?.styles || []);
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

  // Profile completion state
  const [completionPct, setCompletionPct] = useState(0);
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
    { q: "What are Quests?", a: "Quests are creative opportunities posted by brands and clients. Find them under Collab — apply to paid ones, or respond to vision quests. Track everything you've applied to or saved in Menu → Your Activity." },
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
          <div style={{ width: 42 }} />
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
                <input type="range" min={18} max={65} value={discoveryPrefs.ageMin} onChange={e => setDiscoveryPrefs(p => ({ ...p, ageMin: Number(e.target.value) }))} style={{ flex: 1, minWidth: 0, accentColor: "var(--gold)" }} />
                <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>to</span>
                <input type="range" min={18} max={65} value={discoveryPrefs.ageMax} onChange={e => setDiscoveryPrefs(p => ({ ...p, ageMax: Number(e.target.value) }))} style={{ flex: 1, minWidth: 0, accentColor: "var(--gold)" }} />
                <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{discoveryPrefs.ageMax}</span>
              </div>
            </div>
            <div style={{ padding: "0 0 10px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Max Distance: {discoveryPrefs.distance} mi</div>
              <input type="range" min={1} max={100} value={discoveryPrefs.distance} onChange={e => setDiscoveryPrefs(p => ({ ...p, distance: Number(e.target.value) }))} style={{ width: "100%", accentColor: "var(--gold)" }} />
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
            {completionPct < 100 && (
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
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Quests &amp; Rewards</div>
            {rewardsItems.map(renderRow)}
          </div>

<div className="settings-group">
              <div className="settings-group-title">Background</div>
              <OpacitySlider label="Sprites & Animations" storageKey="muse_sprite_opacity" cssVar="--sprite-opacity" />
              <OpacitySlider label="Background" storageKey="muse_bg_opacity" cssVar="--scene-opacity" />
           </div>

          <div className="settings-group">
            <div className="settings-group-title">Privacy & Safety</div>
            {privacyItems.map(renderRow)}
            <ToggleRow
              label="Show Distance"
              checked={!!showDistance}
              onToggle={() => {
                const next = !showDistance;
                setShowDistance?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showDistance: next } }) }).catch(() => showToast("Couldn't save — try again"));
              }}
            />
            <ToggleRow
              label="Online Status"
              checked={!!showOnline}
              onToggle={() => {
                const next = !showOnline;
                setShowOnline?.(next);
                apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showOnline: next } }) }).catch(() => showToast("Couldn't save — try again"));
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
              <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => setShowFeatureTour?.(true)}>App Walkthrough</button>
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
                  <input value={ideaTitle} onChange={e => setIdeaTitle(e.target.value)} placeholder="Give it a name*" style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
                  <textarea value={ideaDescription} onChange={e => setIdeaDescription(e.target.value)} placeholder="Describe your idea — what should it do? Why would you love it?*" rows={3} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" style={{ flex: 1, fontSize: 12, padding: "8px 0", background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", color: "var(--gold)" }} disabled={ideaSubmitting || !ideaTitle.trim() || !ideaDescription.trim() || !authFetch} onClick={async () => { if (!authFetch) return; setIdeaSubmitting(true); try { const r = await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit-idea", title: ideaTitle, description: ideaDescription, category: ideaCategory }) }); if (!r.ok) throw new Error("failed"); showToast("Idea submitted — we love it!"); setShowIdeaForm(false); setIdeaTitle(""); setIdeaDescription(""); } catch { showToast("Failed to submit idea"); } setIdeaSubmitting(false); }}>{ideaSubmitting ? "Sending…" : "Submit Idea"}</button>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => setShowIdeaForm(false)}>{STRINGS.cancel}</button>
                  </div>
                </div>
              )}
              {!showBugForm ? (
                <button className="btn" style={{ width: "100%", background: "rgba(255,107,107,0.08)", border: "1px solid var(--border-subtle)", color: "var(--coral)", fontSize: 13 }} onClick={() => setShowBugForm(true)}><FiAlertTriangle size={14} style={{ marginRight: 6 }} />Report a Bug</button>
              ) : (
                <div style={{ padding: 14, background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--coral)", marginBottom: 10 }}>Report a Bug</div>
                  <select value={bugCategory} onChange={e => setBugCategory(e.target.value)} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}>
                    <option value="ui">UI / Visual Issue</option>
                    <option value="crash">App Crash</option>
                    <option value="payment">Payment Problem</option>
                    <option value="matching">Matching Not Working</option>
                    <option value="notification">Notification Issue</option>
                    <option value="upload">Upload / Media Issue</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea value={bugDescription} onChange={e => setBugDescription(e.target.value)} placeholder="What happened?*" rows={3} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }} />
                  <textarea value={bugSteps} onChange={e => setBugSteps(e.target.value)} placeholder="Steps to reproduce (optional)" rows={2} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, minWidth: 0 }}>
                    <input value={bugExpected} onChange={e => setBugExpected(e.target.value)} placeholder="Expected behavior" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
                    <input value={bugActual} onChange={e => setBugActual(e.target.value)} placeholder="Actual behavior" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
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

          <button className="btn btn-outline" style={{ width: "100%", marginBottom: 20 }} onClick={doLogout}>Log Out</button>
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
              placeholder="Current password (optional session)"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              style={{ margin: 0 }}
            />
            <input
              className="inp"
              type="password"
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
                <span style={{ fontSize: 14, color: "var(--text)" }}>{uid}</span>
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
                {row("Behind the Camera", BEHIND_CAMERA, cpType, (v) => setCpType(v))}
                {row("In Front of the Camera", IN_FRONT_CAMERA, cpType, (v) => setCpType(v))}
                {row("Looking For", lookingForOptions(cpType), cpLooking, (v) => toggle(cpLooking, v, setCpLooking, 4), true)}
                {row("Aesthetic", AESTHETICS, cpStyles, (v) => toggle(cpStyles, v, setCpStyles, 6), true)}
                <button className="btn btn-gold" style={{ width: "100%", marginTop: 8 }} onClick={async () => {
                  try {
                    await apiFetch?.("/api/muse/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-profile", type: cpType, looking: cpLooking, styles: cpStyles }) });
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
        <SettingsSubPage title="Two-Factor Authentication" onClose={() => { setShowMFA(false); setMfaEnrolling(false); setMfaQrUri(""); setMfaSecret(""); setMfaVerifyCode(""); setMfaError(""); }}>
          {mfaLoading ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--text2)", fontSize: 13 }}>Loading...</div>
          ) : mfaEnrolling ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code below.
              </div>
              {mfaQrUri && (
                <div style={{ textAlign: "center", padding: 16, background: "rgba(255,255,255,0.95)", borderRadius: 12 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaQrUri)}`} alt="MFA QR Code" style={{ width: 200, height: 200 }} />
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
                placeholder="Enter 6-digit code"
                value={mfaVerifyCode}
                onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{ margin: 0, textAlign: "center", fontSize: 18, letterSpacing: 4 }}
              />
              {mfaError && <div style={{ fontSize: 12, color: "var(--coral)", textAlign: "center" }}>{mfaError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-outline" style={{ flex: 1, fontSize: 13 }} onClick={() => { setMfaEnrolling(false); setMfaQrUri(""); setMfaSecret(""); setMfaVerifyCode(""); setMfaError(""); }}>Cancel</button>
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
                    const res = await mfaEnroll();
                    if (res.id && res.qr_uri) {
                      setMfaQrUri(res.qr_uri);
                      setMfaSecret(res.secret || "");
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
    </div>
  );
});

export default SettingsScreen;
