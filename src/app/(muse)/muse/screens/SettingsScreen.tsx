"use client";

import React, { memo } from "react";
import { FiArrowLeft, FiUser, FiSettings, FiLink, FiStar, FiUsers, FiShield, FiInstagram, FiTwitter, FiMusic, FiHeadphones, FiEye, FiMoreHorizontal, FiZap, FiDollarSign, FiGift, FiFile, FiX } from "react-icons/fi";
import type { Screen } from "../components/types";
import { subscribeToMusePush, unsubscribeFromMusePush } from "@/app/muse-pwa";

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
  showToast: (msg: string) => void;
  doLogout: () => void;
  setShowEditProfile: (v: boolean) => void;
  setEditName: (v: string) => void;
  setEditBio: (v: string) => void;
  setEditLoc: (v: string) => void;
  setEditAvatar: (v: string) => void;
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
  openHamburger,
  unreadNotificationCount,
  showToast,
  doLogout,
  setShowEditProfile,
  setEditName,
  setEditBio,
  setEditLoc,
  setEditAvatar,
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
  myGeo,
  setShowAgeGate,
  setPendingNsfw,
  setShowAgeVerification,
  authUser,
  showBlockedUsers = false,
  setShowBlockedUsers = () => {},
  setScreen = () => {},
  setObStep = () => {},
  apiFetch,
}: SettingsScreenProps) {
  if (screen !== "settings") return null;

  return (
    <div className="phone-wrap">
      <div className="phone" id="muse-app">
        <div className="hdr" style={{ background: "linear-gradient(135deg,rgba(156,39,176,0.12),rgba(186,104,200,0.08),rgba(129,199,132,0.1))", borderBottom: "1px solid rgba(186,104,200,0.15)" }}>
          <div className="logo-link" style={{ fontSize: 32, background: "linear-gradient(90deg,#CE93D8,#B388FF,#A5D6A7)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>Settings</div>
          <button className="hdr-btn" onClick={() => showScreen("profile")} aria-label="Back to Profile"><FiArrowLeft size={18} /></button>
        </div>
        <div className="settings-scroll">
          <div className="settings-group">
            <div className="settings-group-title">Account</div>
            {[
              { icon: <FiUser size={18} />, label: "Edit Profile", desc: "Name, bio, photos", action: () => { setEditName(currentUser.name); setEditBio(obData.bio || ""); setEditLoc(obData.loc || ""); setEditAvatar(currentUser.avatar || ""); setShowEditProfile(true); } },
              { icon: <FiSettings size={18} />, label: "Notifications", desc: "Push and email alerts", action: () => setShowNotificationsSettings(!showNotificationsSettings) },
              { icon: <FiLink size={18} />, label: "Connected Accounts", desc: "Instagram, Spotify, etc.", action: () => setShowConnectedAccounts(!showConnectedAccounts) },
              { icon: <FiStar size={18} />, label: "Personality Profile", desc: "Zodiac, MBTI, Life Path", action: () => { setScreen("onboard"); setObStep(7); } },
              { icon: <FiUsers size={18} />, label: "Creative Profile", desc: "Type, styles, looking for", action: () => { setScreen("onboard"); setObStep(4); } },
            ].map(item => (
              <div key={item.label} className="settings-item" onClick={item.action}>
                <div className="settings-item-left"><div className="settings-icon">{item.icon}</div><div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div></div>
                <div className="settings-arrow">→</div>
              </div>
            ))}
            {showNotificationsSettings && (
              <div style={{ padding: "12px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
                {[{ k: "match", l: "New Matches" }, { k: "message", l: "Messages" }, { k: "brief", l: "Brief Updates" }, { k: "like", l: "Likes" }].map(n => (
                  <div key={n.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 14, color: "var(--text)" }}>{n.l}</span>
                    <div onClick={() => setNotifPrefs(prev => ({ ...prev, [n.k]: !prev[n.k] }))} className={"toggle-track" + (notifPrefs[n.k] ? " active" : "")} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "all .3s", background: notifPrefs[n.k] ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.1)" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: notifPrefs[n.k] ? 22 : 2, transition: "all .3s" }} />
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: 14, color: "var(--text)" }}>Lock-Screen Push</span>
                  <div
                    onClick={async () => {
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
                    className={"toggle-track" + (pushEnabled ? " active" : "")}
                    style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "all .3s", background: pushEnabled ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.1)" }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: pushEnabled ? 22 : 2, transition: "all .3s" }} />
                  </div>
                </div>
              </div>
            )}
            {showConnectedAccounts && (
              <div style={{ padding: "12px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
                {[{ k: "instagram", l: "Instagram", icon: <FiInstagram size={18} /> }, { k: "facebook", l: "Facebook", icon: <FiTwitter size={18} /> }, { k: "spotify", l: "Spotify", icon: <FiMusic size={18} /> }, { k: "soundcloud", l: "SoundCloud", icon: <FiHeadphones size={18} /> }].map(s => (
                  <div key={s.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "var(--text2)" }}>{s.icon}</span><span style={{ fontSize: 14, color: "var(--text)" }}>{s.l}</span></div>
                    <div onClick={() => toggleSocial(s.k)} className={"toggle-track" + (obConnectedSocials[s.k] ? " active" : "")} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "all .3s", background: obConnectedSocials[s.k] ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.1)" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: obConnectedSocials[s.k] ? 22 : 2, transition: "all .3s" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="settings-group">
            <div className="settings-group-title">Appearance</div>
            <div className="theme-grid" style={{ margin: "12px 0 4px" }}>
              {(["lasunset", "deepspace", "nebula", "villa", "deepsea", "sunrise"] as const).map(t => (
                <div key={t} className={"theme-swatch" + (theme === t ? " active" : "")} data-val={t} title={t} onClick={() => setTheme(t)} style={{ textTransform: "capitalize" }}>{theme === t ? "✓" : t.slice(0, 3)}</div>
              ))}
            </div>
          </div>
          <div className="settings-group">
            <div className="settings-group-title">Discovery</div>
            {[
              { icon: <FiEye size={18} />, label: "NSFW Content", desc: myGeo?.requiresIdVerification ? "ID verification required in your state" : "Show or hide 18+ content", action: () => { if (!showNsfw) { if (myGeo?.requiresIdVerification) { setShowAgeVerification(true); } else { setShowAgeGate(true); setPendingNsfw(true); } } else { setShowNsfw(false); } } },
              { icon: <FiMoreHorizontal size={18} />, label: "Blocked Users", desc: "Manage blocked profiles", action: () => setShowBlockedUsers(!showBlockedUsers) },
            ].map(item => (
              <div key={item.label} className="settings-item" onClick={item.action}>
                <div className="settings-item-left"><div className="settings-icon">{item.icon}</div><div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div></div>
                <div className="settings-arrow">→</div>
              </div>
            ))}
            {showBlockedUsers && (
              <div style={{ padding: "12px 0 0" }}>
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
              </div>
            )}
          </div>
          <div className="settings-group">
            <div className="settings-group-title">Payments & Subscription</div>
            {[
              { icon: <FiZap size={18} />, label: "Subscription", desc: "Manage your plan", action: () => showScreen("subscription") },
              { icon: <FiDollarSign size={18} />, label: "Marketplace Payments", desc: "Connect Stripe to receive bookings", action: () => setShowConnect(true) },
              { icon: <FiDollarSign size={18} />, label: "Payment History", desc: "View earnings and transactions", action: () => setShowPaymentHistory(true) },
              { icon: <FiGift size={18} />, label: "Referral Program", desc: "Invite friends, earn free months", action: () => setShowReferral(true) },
            ].map(item => (
              <div key={item.label} className="settings-item" onClick={item.action}>
                <div className="settings-item-left"><div className="settings-icon">{item.icon}</div><div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div></div>
                <div className="settings-arrow">→</div>
              </div>
            ))}
          </div>
          <div className="settings-group">
            <div className="settings-group-title">Safety & Profile</div>
            {[
              { icon: <FiShield size={18} />, label: "Safety Center", desc: "Check-ins, emergency contacts, trusted friends", action: () => setShowSafetyCheckin(true) },
              { icon: <FiStar size={18} />, label: "Prompt Bank", desc: `${Math.round((promptResponses.length / Math.max(promptBankData.length, 1)) * 100)}% completed`, action: () => setShowPromptBank(true) },
              ...(isUnlimited ? [{ icon: <FiShield size={18} />, label: "Admin Dashboard", desc: "Analytics & moderation", action: () => { window.open("/muse/admin", "_self"); } }] : []),
            ].map(item => (
              <div key={item.label} className="settings-item" onClick={item.action}>
                <div className="settings-item-left"><div className="settings-icon">{item.icon}</div><div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div></div>
                <div className="settings-arrow">→</div>
              </div>
            ))}
          </div>
          <div className="settings-group">
            <div className="settings-group-title">Legal</div>
            {[
              { icon: <FiFile size={18} />, label: "Terms of Service", desc: "Legal terms", action: () => setShowTerms(true) },
              { icon: <FiFile size={18} />, label: "Privacy Policy", desc: "How we handle your data", action: () => setShowPrivacy(true) },
              { icon: <FiFile size={18} />, label: "Community Guidelines", desc: "Standards & expectations", action: () => setShowGuidelines(true) },
              { icon: <FiX size={18} />, label: "Delete Account", desc: "Permanently remove your data", action: () => setShowDeleteConfirm(true) },
            ].map(item => (
              <div key={item.label} className="settings-item" onClick={item.action}>
                <div className="settings-item-left"><div className="settings-icon">{item.icon}</div><div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div></div>
                <div className="settings-arrow">→</div>
              </div>
            ))}
          </div>
          <button className="btn btn-outline" style={{ width: "100%", marginBottom: 20 }} onClick={doLogout}>Log Out</button>
        </div>
      </div>
    </div>
  );
});

export default SettingsScreen;
