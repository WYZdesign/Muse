"use client";

import React, { memo } from "react";
import { FiArrowLeft, FiEdit2, FiSettings } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen, Match } from "../components/types";

export interface ProfileScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  currentUser: any;
  obData: any;
  setObData: React.Dispatch<React.SetStateAction<any>>;
  isUnlimited: boolean;
  showUnlimitedBadge: boolean;
  setShowUnlimitedBadge: (v: boolean) => void;
  openHamburger: () => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  setShowEditProfile: (v: boolean) => void;
  setEditName: (v: string) => void;
  setEditBio: (v: string) => void;
  setEditLoc: (v: string) => void;
  setEditAvatar: (v: string) => void;
  setEditType: (v: string) => void;
  setEditLooking: (v: string[]) => void;
  showToast: (msg: string) => void;
  promptResponses: any[];
  promptBankData: any[];
  setShowPromptBank: (v: boolean) => void;
  matches: Match[];
  obSelects?: string[];
  testLevels?: Record<string, number>;
  showNsfw?: boolean;
  setShowNsfw?: (v: boolean) => void;
  matchStreak?: number;
  userTier?: string;
  portfolioTab?: "all" | "portrait" | "landscape" | "sets";
  setPortfolioTab?: (t: "all" | "portrait" | "landscape" | "sets") => void;
  setSelectedPortfolio?: (p: any) => void;
  activityFeed?: any[];
  setShowShareProfile?: (v: boolean) => void;
  setScreen?: (s: Screen) => void;
  setObTestKey?: (k: any) => void;
  setTestScreen?: (s: any) => void;
  setObStep?: (s: number) => void;
  setObTestStep?: (s: number) => void;
  setChatTarget?: (m: any) => void;
  unreadNotificationCount?: number;
  checkProfileBadges?: (stats: any, createdAt: any) => any[];
  getReferralTier?: (count: number) => { tier: string; perks: string };
  apiFetch?: (url: string, opts?: any) => Promise<any>;
  doLogout?: () => void;
}

export const ProfileScreen = memo(function ProfileScreen({
  screen,
  currentUser,
  obData,
  setObData,
  isUnlimited,
  showUnlimitedBadge,
  setShowUnlimitedBadge,
  openHamburger,
  handleImgError,
  setShowEditProfile,
  setEditName,
  setEditBio,
  setEditLoc,
  setEditAvatar,
  setEditType,
  setEditLooking,
  showToast,
  promptResponses,
  promptBankData,
  setShowPromptBank,
  matches,
  showScreen,
  unreadNotificationCount,
  obSelects = [],
  testLevels = {},
  showNsfw = false,
  setShowNsfw = () => {},
  matchStreak = 0,
  userTier = "free",
  portfolioTab = "all",
  setPortfolioTab = () => {},
  setSelectedPortfolio = () => {},
  activityFeed = [],
  setShowShareProfile = () => {},
  setScreen = () => {},
  setObTestKey = () => {},
  setTestScreen = () => {},
  setObStep = () => {},
  setObTestStep = () => {},
  setChatTarget = () => {},
  checkProfileBadges = () => [],
  getReferralTier = () => ({ tier: "", perks: "" }),
  apiFetch = async () => ({}),
  doLogout = () => {},
}: ProfileScreenProps) {
  return (
    <div className={"screen-el" + (screen === "profile" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", borderBottom: "1px solid rgba(255,215,0,0.15)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        </div>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 18, fontWeight: 800, background: "linear-gradient(90deg,#FFD700,#F48FB1,#CE93D8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Your Profile</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="hdr-btn" onClick={() => { setEditName(currentUser.name); setEditBio(obData.bio || ""); setEditLoc(obData.loc || ""); setEditAvatar(currentUser.avatar || ""); setEditType(currentUser.type || obData.type || ""); setEditLooking(obData.looking || []); setShowEditProfile(true); }} aria-label="Edit Profile"><FiEdit2 size={18} /></button>
        </div>
      </div>
      <div className="profile-scroll">
        {isUnlimited && showUnlimitedBadge && (
          <div style={{ position: "fixed", top: 80, right: 20, zIndex: 9998, padding: "8px 14px", borderRadius: 12, background: "linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,191,0,0.1))", border: "1px solid rgba(255,215,0,0.2)", fontSize: 11, fontWeight: 700, color: "var(--gold)", boxShadow: "0 4px 16px rgba(255,215,0,0.2)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚡</span>∞ Unlimited Likes &amp; Super Likes
            <button onClick={() => setShowUnlimitedBadge(false)} aria-label="Close" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
          </div>
        )}
        <div className="completeness">
          <div className="completeness-text">
            <span>Profile Completeness</span>
            <span>{Math.min(100, (currentUser.name !== "You" ? 15 : 0) + (obData.bio ? 15 : 0) + (obData.type ? 15 : 0) + ((obData.looking || []).length ? 10 : 0) + ((obData.styles || []).length ? 10 : 0) + (obData.zodiac ? 8 : 0) + (obData.mbti ? 7 : 0) + (obData.lifePath ? 5 : 0) + (obData.chinese ? 5 : 0) + (obData.loc ? 10 : 0))}%</span>
          </div>
          <div className="completeness-bar"><div className="completeness-fill" style={{ width: Math.min(100, (currentUser.name !== "You" ? 15 : 0) + (obData.bio ? 15 : 0) + (obData.type ? 15 : 0) + ((obData.looking || []).length ? 10 : 0) + ((obData.styles || []).length ? 10 : 0) + (obData.zodiac ? 8 : 0) + (obData.mbti ? 7 : 0) + (obData.lifePath ? 5 : 0) + (obData.chinese ? 5 : 0) + (obData.loc ? 10 : 0)) + "%" }} /></div>
        </div>
        <div className="profile-top">
          <div className="profile-avatar-wrap">
            <img loading="lazy" src={currentUser.avatar} alt={currentUser.name} className="profile-avatar" onError={handleImgError} />
            <div className="profile-ring" />
          </div>
          <div className="profile-name">{currentUser.name}</div>
          <div className="profile-type">{obData.type || "Creative"}</div>
          <div className="profile-loc">{obData.loc || "Set your location"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
            <span>Member since {new Date(currentUser.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
          </div>
        </div>
        <div className="stats-row">
          <div className="stat"><div className="stat-num">{matches.length}</div><div className="stat-label">Matches</div></div>
          <div className="stat"><div className="stat-num">{matchStreak}</div><div className="stat-label">Streak</div></div>
          <div className="stat"><div className="stat-num">{currentUser.stats.likes}</div><div className="stat-label">Likes</div></div>
          <div className="stat"><div className="stat-num">{currentUser.stats.superLikes}</div><div className="stat-label">Superlikes</div></div>
          <div className="stat"><div className="stat-num">{currentUser.stats.passes}</div><div className="stat-label">Passes</div></div>
        </div>
        <div className="section">
          <div className="section-title">About</div>
          <div className="section-text">{obData.bio || "No bio yet"}</div>
        </div>
        <div className="section">
          <div className="section-title">Creative Type</div>
          <div className="tag-row">{obData.type ? <span className="tag-pill">{obData.type}</span> : <span className="tag-pill">Set your type</span>}</div>
        </div>
        <div className="section">
          <div className="section-title">Looking For</div>
          <div className="tag-row">{(obData.looking || ["Collaborators", "Friends"]).map((s: string) => <span key={s} className="tag-pill">{s}</span>)}</div>
        </div>
        <div className="section">
          <div className="section-title">Aesthetic</div>
          <div className="tag-row">{(obData.styles || ["Minimalist", "Dark"]).map((s: string) => <span key={s} className="tag-pill">{s}</span>)}</div>
        </div>
        <div className="section">
          <div className="section-title">Personality</div>
          <div className="tag-row">
            {obData.zodiac && <span className="tag-pill">♈ {obData.zodiac}</span>}
            {obData.chinese && <span className="tag-pill">🐉 {obData.chinese}</span>}
            {obData.mbti && <span className="tag-pill">🧠 {obData.mbti}</span>}
            {obData.lifePath && <span className="tag-pill">🔮 Path {obData.lifePath}</span>}
            {!obData.zodiac && !obData.chinese && !obData.mbti && !obData.lifePath && <span className="tag-pill" style={{ opacity: 0.5 }}>Add personality traits</span>}
          </div>
        </div>
        <div className="section">
          <div className="avail-row">
            <div><div className="section-title">Show NSFW</div><div className="avail-sub">Fine art, figure, body art</div></div>
            <div className={"toggle" + (showNsfw ? " on" : "")} onClick={() => setShowNsfw(!showNsfw)}><div className="toggle-dot" /></div>
          </div>
        </div>
        <div className="section">
          <div className="section-title">Subscription</div>
          {currentUser.foundingTier && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 99, background: currentUser.foundingTier === "founding" ? "rgba(255,215,0,0.12)" : "rgba(212,165,255,0.12)", border: `1px solid ${currentUser.foundingTier === "founding" ? "rgba(255,215,0,0.35)" : "rgba(212,165,255,0.35)"}`, color: currentUser.foundingTier === "founding" ? "var(--gold)" : "var(--lavender)" }}>
                {currentUser.foundingTier === "founding" ? "🏆 FOUNDING MEMBER" : "⭐ EARLY MEMBER"}
              </span>
              {currentUser.proExpiresAt && currentUser.tier === "muse_pro" && (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Pro until {new Date(currentUser.proExpiresAt).toLocaleDateString()}</span>
              )}
            </div>
          )}
          <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 10 }}>Plan: <span style={{ color: "var(--gold)", fontWeight: 600 }}>{userTier === "muse_pro" || currentUser.tier === "muse_pro" ? "Muse Pro" : "Free"}</span></div>
          {currentUser.tier === "muse_pro" && !currentUser.foundingTier ? (
            <button className="btn btn-outline" style={{ fontSize: 14, padding: "14px 0" }} onClick={() => setScreen("subscription")}>Manage Plan</button>
          ) : currentUser.tier === "muse_pro" && currentUser.foundingTier ? (
            <button className="btn btn-outline" style={{ fontSize: 14, padding: "14px 0" }} onClick={() => setScreen("subscription")}>View Plan</button>
          ) : (
            <button className="btn btn-gold" style={{ fontSize: 14, padding: "14px 0" }} onClick={() => setScreen("subscription")}>Upgrade</button>
          )}
        </div>
        <div className="section">
          <div className="section-title">Badges</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[...checkProfileBadges(currentUser.stats, currentUser.createdAt)].length === 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}>Complete bookings and matches to earn badges</span>}
            {checkProfileBadges(currentUser.stats, currentUser.createdAt).map(b => <span key={b.name} title={b.desc} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 99, background: `${b.color}20`, border: `1px solid ${b.color}40`, color: b.color }}>{b.icon} {b.name}</span>)}
          </div>
        </div>
        <div className="section">
          <div className="section-title">Referral</div>
          <div className="section-text" style={{ marginBottom: 8 }}>Invite creatives. Earn rewards.</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 6 }}>Tier: <span style={{ color: "var(--gold)", fontWeight: 700 }}>{getReferralTier(currentUser.referrals || 0).tier}</span> · {currentUser.referrals || 0} joined</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-gold" style={{ flex: 1, fontSize: 12, padding: "10px 0" }} onClick={async () => { try { const res = await apiFetch("/api/muse/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate" }) }); const j = await res.json(); if (j.code) { const link = "https://muse.wyzdesign.com/muse?ref=" + j.code; try { navigator.clipboard?.writeText(link); showToast("Link copied: " + link); } catch { showToast("Your code: " + j.code); } } } catch { showToast("Try again later"); } }}>Copy Referral Link</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>Bronze: 5 free swipes · Silver: 1mo Spark free · Gold: 20% fee discount · Platinum: Pro tier</div>
        </div>
        <div className="section">
          <div className="section-title">Self Discovery</div>
          <div className="section-text" style={{ marginBottom: 10}}>Know yourself to find your creative match</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["zodiac", "mbti", "chinese", "lifePath"] as const).map(key => {
              const result = obData[key];
              return (
                <button key={key} className="btn btn-outline" style={{ textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 14 }} onClick={() => { setObTestKey(key as any); setTestScreen(key as any); setObStep(13); setObTestStep(0); setScreen("onboard"); }}>
                  <span style={{ flex: 1 }}>{result ? String(result) + " (Lv." + (testLevels[key] || 1) + ")" : "Take " + key + " test"}</span>
                  <span style={{ fontSize: 12, color: "var(--gold)" }}>{result ? "Retake" : "Start"}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="section">
          <div className="section-title">Portfolio</div>
          <div className="section-text" style={{ marginBottom: 10 }}>Your albums &amp; showcased work</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" }}>
            {(["all", "portrait", "landscape", "sets"] as const).map(tab => (
              <span key={tab} className={"conn-tab" + (portfolioTab === tab ? " active" : "")} onClick={() => setPortfolioTab(tab)} style={{ flexShrink: 0, fontSize: 12, padding: "6px 14px" }}>{tab === "all" ? "All" : tab === "portrait" ? "Portrait" : tab === "landscape" ? "Landscape" : "Sets"}</span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {(() => {
              const filtered = (currentUser.portfolios || []).filter((p: any) => {
                if (portfolioTab === "all") return true;
                if (portfolioTab === "portrait") return p.type === "portrait";
                if (portfolioTab === "landscape") return p.type === "landscape";
                return true;
              });
              if (filtered.length > 0) return filtered.slice(0, 9).map((p: any, i: number) => (
                <div key={i} style={{ aspectRatio: "3/4", borderRadius: 12, overflow: "hidden", background: "#1a0a2e", position: "relative", cursor: "pointer" }} onClick={() => setSelectedPortfolio(p)}>
                  <img loading="lazy" src={p.img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={handleImgError} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px", background: "linear-gradient(to top,rgba(10,6,18,0.9),transparent)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                    <div style={{ fontSize: 9, color: "var(--muted)" }}>{p.type}</div>
                  </div>
                </div>
              ));
              return [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ aspectRatio: "3/4", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 11, cursor: "pointer" }} onClick={() => setScreen("portfolio")}>Add</div>
              ));
            })()}
          </div>
          <button className="btn btn-outline" style={{ width: "100%", marginTop: 12, fontSize: 13, padding: "10px 0" }} onClick={() => setScreen("portfolio")}>Manage Albums</button>
        </div>
        <div className="section">
          <div className="section-title">Recent Matches</div>
          <div className="section-text" style={{ marginBottom: 10 }}>Your latest connections</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
            {matches.length > 0 ? matches.slice(0, 5).map(m => (
              <div key={m.id} style={{ flexShrink: 0, width: 60, height: 60, borderRadius: "50%", overflow: "hidden", background: "#1a0a2e", border: "2px solid rgba(255,215,0,0.2)" }} onClick={() => { setChatTarget(m); showScreen("chat"); }}>
                <img loading="lazy" src={m.img} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={handleImgError} />
              </div>
            )) : (
              <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 11 }}>No matches yet</div>
            )}
          </div>
        </div>
        <div className="section">
          <div className="section-title">Activity</div>
          <div className="section-text" style={{ marginBottom: 10 }}>Recent interactions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activityFeed.length > 0 ? activityFeed.slice(0, 4).map(a => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                <img loading="lazy" src={a.avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", background: "#1a0a2e" }} onError={handleImgError} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><strong>{a.from}</strong> {a.text}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            )) : (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No recent activity. Start swiping to see your interactions here!</div>
            )}
          </div>
        </div>
        <div className="profile-btn"><button className="btn btn-outline" onClick={() => { setEditName(currentUser.name); setEditBio(obData.bio || ""); setEditLoc(obData.loc || ""); setEditAvatar(currentUser.avatar || ""); setEditType(currentUser.type || obData.type || ""); setEditLooking(obData.looking || []); setShowEditProfile(true); }}>Edit Profile</button></div>
        <div className="profile-btn"><button className="btn btn-outline" onClick={() => setScreen("settings")}><FiSettings size={16} style={{ marginRight: 6 }} /> Account Settings</button></div>
        <div className="profile-btn"><button className="btn btn-outline" onClick={() => setShowShareProfile(true)}>Share Profile</button></div>
        <div className="profile-btn"><button className="btn btn-outline" style={{ borderColor: "rgba(255,138,128,0.2)", color: "var(--coral)" }} onClick={doLogout}>Log Out</button></div>
      </div>
      <Nav active="profile" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default ProfileScreen;
