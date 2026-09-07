"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft, FiUser, FiSettings, FiLink, FiStar, FiUsers, FiShield, FiInstagram, FiTwitter, FiMusic, FiHeadphones, FiEye, FiMoreHorizontal, FiZap, FiDollarSign, FiGift, FiFile, FiX, FiLock, FiBell } from "react-icons/fi";
// Push subscribe/unsubscribe arrive as PROPS (page.tsx owns the real impls) —
// importing the module fns here too shadowed them and invited drift.
import type { Screen } from "../components/types";

export interface SettingsScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
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
      style={{ position: "fixed", inset: 0, zIndex: 950, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      role="presentation"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, maxHeight: "85vh", background: "rgba(15,10,30,0.98)", backdropFilter: "blur(30px)", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
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

export const SettingsScreen = memo(function SettingsScreen({
  screen,
  showScreen,
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
}: SettingsScreenProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

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
    { icon: <FiStar size={18} />, label: "Personality Profile", desc: "Zodiac, MBTI, Life Path", action: () => { setScreen("onboard"); setObStep(7); } },
    { icon: <FiUsers size={18} />, label: "Creative Profile", desc: "Type, styles, looking for", action: () => { setScreen("onboard"); setObStep(4); } },
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
    { icon: <FiX size={18} />, label: "Delete Account", desc: "Permanently remove your data", action: () => setShowDeleteConfirm(true) },
  ];

  const renderRow = (item: { icon: React.ReactNode; label: string; desc: string; action: () => void; dot?: boolean }) => (
    <div key={item.label} className="settings-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); item.action(); } }} onClick={item.action}>
      <div className="settings-item-left">
        <div className="settings-icon" style={{ position: "relative" }}>
          {item.icon}
          {item.dot && <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: "#FF69B4", border: "1.5px solid #0f0a1e" }} />}
        </div>
        <div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div>
      </div>
      <div className="settings-arrow">→</div>
    </div>
  );

  return (
    <div className="phone-wrap">
      <div className="phone" id="muse-app">
        <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
          <div className="logo-link" style={{
            fontSize: 30,
            backgroundImage: "linear-gradient(90deg,#CE93D8,#B388FF,#A5D6A7,#CE93D8,#B388FF,#CE93D8)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            position: "relative",
            margin: 0,
            padding: 0,
            whiteSpace: "nowrap",
          }}>Settings</div>
          <button className="hdr-btn" onClick={() => showScreen("profile")} aria-label="Back to Profile"><FiArrowLeft size={18} /></button>
        </div>
        <div className="settings-scroll">
          <div className="settings-group">
            <div className="settings-group-title">Account</div>
            {accountItems.map(renderRow)}
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Notifications</div>
            {renderRow({ icon: <FiBell size={18} />, label: "Notification Preferences", desc: "Push, lock-screen and per-category alerts", action: () => setShowNotificationsSettings(true) })}
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Privacy & Safety</div>
            {privacyItems.map(renderRow)}
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
            <div className="settings-group-title">Quests & Rewards</div>
            {rewardsItems.map(renderRow)}
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Appearance</div>
            <div className="theme-grid" style={{ margin: "12px 0 4px" }}>
              {(["lasunset", "deepspace", "nebula", "villa", "deepsea", "sunrise"] as const).map(t => (
                <div key={t} role="radio" aria-checked={theme === t} className={"theme-swatch" + (theme === t ? " active" : "")} data-val={t} title={t} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTheme(t); } }} onClick={() => setTheme(t)} style={{ textTransform: "capitalize" }}>{theme === t ? "✓" : t.slice(0, 3)}</div>
              ))}
            </div>
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

          <button className="btn btn-outline" style={{ width: "100%", marginBottom: 20 }} onClick={doLogout}>Log Out</button>
        </div>
      </div>

      {showNotificationsSettings && (
        <SettingsSubPage title="Notification Preferences" onClose={() => setShowNotificationsSettings(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[{ k: "match", l: "New Matches" }, { k: "message", l: "Messages" }, { k: "brief", l: "Quest Updates" }, { k: "like", l: "Likes" }].map(n => (
              <ToggleRow key={n.k} label={n.l} checked={!!notifPrefs[n.k]} onToggle={() => setNotifPrefs(prev => ({ ...prev, [n.k]: !prev[n.k] }))} />
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
            {[{ k: "instagram", l: "Instagram", icon: <FiInstagram size={18} /> }, { k: "facebook", l: "Facebook", icon: <FiTwitter size={18} /> }, { k: "spotify", l: "Spotify", icon: <FiMusic size={18} /> }, { k: "soundcloud", l: "SoundCloud", icon: <FiHeadphones size={18} /> }].map(s => (
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
              <div key={uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 14, color: "var(--text)" }}>{uid}</span>
                <button className="btn btn-outline" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => { setBlockedUsers(blockedUsers.filter(b => b !== uid)); if (apiFetch) { apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unblock", target_id: uid }) }).catch(() => {}); } }}>Unblock</button>
              </div>
            ))
          )}
        </SettingsSubPage>
      )}
    </div>
  );
});

export default SettingsScreen;
