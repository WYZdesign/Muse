"use client";

import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { FiArrowLeft, FiUsers, FiCalendar, FiShare2, FiUser, FiSettings, FiStar, FiActivity, FiDollarSign, FiUsers as FiUsersIcon, FiGift, FiX, FiBell } from "react-icons/fi";
import type { Screen, Match } from "../components/types";
import StreakWidget from "../components/StreakWidget";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { EmptyState } from "../components/EmptyState";
import { COMMUNITIES, EVENTS, SESSIONS, PROFESSIONALS, FORUM_POSTS } from "../components/types";
import { getCommunityShareUrl, getEventShareUrl, getProShareUrlWithRef, getMuseUrl } from "@/lib/urls";
import { MUSE_CLOSED_BETA_HIDE_SOCIAL } from "@/lib/config";
import { STRINGS } from "@/lib/strings";

interface ActivityPanelProps {
  authFetch: any;
  appliedBriefs: (string | number)[];
  savedBriefs: (string | number)[];
  bookingsForHub: any;
  weeklyLogins: boolean[];
  loginStreak: number;
  setShowHamburger: (v: boolean) => void;
  showScreen: (s: Screen) => void;
  onStreakTap?: () => void;
}

function ActivityPanel({ authFetch, appliedBriefs, savedBriefs, bookingsForHub, weeklyLogins, loginStreak, setShowHamburger, showScreen, onStreakTap }: ActivityPanelProps) {
  const [hubTab, setHubTab] = useState<"notif" | "applied" | "saved" | "bookings" | "reports">("notif");
  const [myReports, setMyReports] = useState<any[] | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifLoadingRef = useRef(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "match" | "message" | "booking" | "quest" | "brief" | "community">("all");
  const [notifOffset, setNotifOffset] = useState(0);
  const [notifHasMore, setNotifHasMore] = useState(true);

  useEffect(() => {
    if (hubTab === "reports" && myReports === null && authFetch) {
      authFetch("/api/muse?type=my-reports").then((r: any) => r.json()).then((d: any) => setMyReports(d.reports || [])).catch(() => setMyReports([]));
    }
  }, [hubTab, myReports, authFetch]);

  const loadNotifications = useCallback(async (append = false) => {
    if (!authFetch || notifLoadingRef.current) return;
    notifLoadingRef.current = true;
    try {
      const res = await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-notifications", limit: 30, offset: append ? notifOffset : 0, unreadOnly: notifFilter === "unread", type: notifFilter === "all" ? undefined : notifFilter }) });
      const data = await res.json();
      if (data.success) {
        const newNotifs = data.notifications || [];
        setNotifications(prev => append ? [...prev, ...newNotifs] : newNotifs);
        setNotifHasMore(newNotifs.length >= 30);
        if (!append) setNotifOffset(newNotifs.length);
        else setNotifOffset(prev => prev + newNotifs.length);
      }
    } catch (e) {
      console.error("[ActivityPanel] loadNotifications failed:", e);
    }
    notifLoadingRef.current = false;
  }, [authFetch, notifOffset, notifFilter]);

  useEffect(() => {
    if (hubTab === "notif") {
      setNotifications([]);
      setNotifOffset(0);
    }
  }, [hubTab, notifFilter]);

  useEffect(() => {
    if (hubTab === "notif") loadNotifications();
  }, [hubTab, notifFilter, loadNotifications]);

  const markAllRead = async () => {
    if (!authFetch) return;
    try {
      await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark-all-notifications-read" }) });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const tabBtn = (key: any, label: string) => (
    <div key={key} className={"conn-tab-sub" + (hubTab === key ? " active" : "")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHubTab(key); } }} onClick={() => setHubTab(key)} style={{ cursor: "pointer", fontSize: 11, padding: "5px 10px", flexShrink: 0 }}>{label}</div>
  );

  return (
    <>
      <StreakWidget weeklyLogins={weeklyLogins} loginStreak={loginStreak} onTap={onStreakTap} />
      <div className="logo-link" style={{ textAlign: "center", fontSize: 24, fontWeight: 800, fontFamily: "'Playfair Display',serif", fontStyle: "italic", backgroundImage: "linear-gradient(90deg,#E1BEE7,#9C27B0,#FF4081,#E1BEE7,#9C27B0,#E1BEE7)", backgroundSize: "300% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", margin: "2px 0 10px", animation: "lavaFlow 7s ease-in-out infinite" }}>Your Activity</div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 10, scrollbarWidth: "none" }}>
        {tabBtn("notif", "Notifications")}
        {tabBtn("applied", `Applied (${appliedBriefs.length})`)}
        {tabBtn("saved", `Saved (${savedBriefs.length})`)}
        {tabBtn("bookings", `Bookings (${(bookingsForHub?.asBooker || []).length + (bookingsForHub?.asHost || []).length})`)}
        {tabBtn("reports", "Reports")}
      </div>

      {hubTab === "notif" && (
        <>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 10, scrollbarWidth: "none" }}>
            {(["all", "unread", "match", "message", "booking", "quest", "brief", "community"] as const).map(f => (
              <div key={f} className={"conn-tab-sub" + (notifFilter === f ? " active" : "")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNotifFilter(f); } }} onClick={() => setNotifFilter(f)} style={{ cursor: "pointer", fontSize: 10, padding: "4px 10px", flexShrink: 0, textTransform: "capitalize" }}>{f}</div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>{notifications.filter(n => !n.read).length} unread</div>
            {notifications.some(n => !n.read) && <button onClick={markAllRead} style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>}
          </div>
          {notifications.length === 0
            ? <EmptyState icon="🔔" title="No notifications yet" sub="Likes, matches, bookings and activity will appear here." />
            : notifications.map(a => (
                <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: a.read ? 0.55 : 1, background: a.read ? "transparent" : "rgba(255,215,0,0.03)", borderRadius: 8, marginBottom: 4 }}>
                  {a.avatar ? (
                    <Image loading="lazy" src={a.avatar} alt="Avatar" width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover", backgroundColor: "#1a0a2e", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),var(--pink),var(--lavender))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{(a.from || "A").charAt(0).toUpperCase()}</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: "var(--text)" }}><strong>{a.from}</strong> {a.text}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
          {notifHasMore && (
            <button onClick={() => loadNotifications(true)} style={{ width: "100%", padding: 10, marginTop: 12, fontSize: 12, color: "var(--gold)", fontWeight: 600, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 8, cursor: "pointer" }}>Load more</button>
          )}
        </>
      )}

      {(hubTab === "applied" || hubTab === "saved") && (() => {
        const ids = hubTab === "applied" ? appliedBriefs : savedBriefs;
        if (!ids.length) return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 13 }}>{hubTab === "applied" ? "You haven't applied to any quests yet." : "No saved quests yet."}</div>;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ids.map((id, i) => (
              <div key={`${id}-${i}`} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Quest #{id}</span>
                <button className="btn btn-outline" style={{ width: "100%", fontSize: 11, padding: "5px 12px", borderRadius: 99 }} onClick={() => { setShowHamburger(false); showScreen("briefs"); }}>View in Collab</button>
              </div>
            ))}
          </div>
        );
      })()}
      {hubTab === "bookings" && (() => {
        const b = bookingsForHub || { asBooker: [], asHost: [] };
        if (!b.asBooker.length && !b.asHost.length) return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 13 }}>No bookings yet.</div>;
        const row = (x: any, role: string) => (
          <div key={x.id} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{x.session_id?.title || "Session"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: x.status === "completed" ? "#98fb98" : x.status === "confirmed" ? "var(--gold)" : x.status === "cancelled" ? "#ff6464" : "var(--muted)" }}>{x.status}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{role} · {new Date(x.created_at).toLocaleDateString()}</div>
          </div>
        );
        return (<>
          {b.asBooker.map((x: any) => row(x, "Booked by you"))}
          {b.asHost.map((x: any) => row(x, "You're hosting"))}
        </>);
      })()}
      {hubTab === "reports" && (myReports === null
        ? <div style={{ textAlign: "center", padding: 30, color: "var(--muted)", fontSize: 13 }}>Loading…</div>
        : myReports.length === 0
          ? <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 13 }}>You haven't reported anything.</div>
          : myReports.map((r: any) => (
            <div key={r.id} style={{ padding: "10px 12px", background: "rgba(255,100,100,0.05)", borderRadius: 12, border: "1px solid rgba(255,100,100,0.12)", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ fontWeight: 700, textTransform: "capitalize", color: "#ff8a80" }}>{String(r.target_type).replace("_", " ")}</span>
                <span style={{ color: "var(--muted)", fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>{r.reason}</div>
            </div>
          )))}
    </>
  );
}

export interface MenuModalProps {
  showHamburger: boolean;
  setShowHamburger: (v: boolean) => void;
  hamburgerScreen: string;
  setHamburgerScreen: (v: string) => void;
  showScreen: (s: Screen) => void;
  liveCommunities: any[] | null;
  liveEvents: any[] | null;
  liveProfessionals: any[] | null;
  showNsfw: boolean;
  rsvpdEvents: number[];
  setRsvpdEvents: React.Dispatch<React.SetStateAction<number[]>>;
  matches: Match[];
  openChat: (m: any) => void;
  setChatTarget: (m: any) => void;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  setViewProfile: (p: any) => void;
  currentUser: any;
  showNewPost: boolean;
  setShowNewPost: (v: boolean) => void;
  newPostTitle: string;
  setNewPostTitle: (v: string) => void;
  newPostBody: string;
  setNewPostBody: (v: string) => void;
  setForumPosts: React.Dispatch<React.SetStateAction<any[]>>;
  liveForum: any[] | null;
  setLiveForum?: React.Dispatch<React.SetStateAction<any[] | null>>;
  forumSort: "hot" | "new" | "top";
  setForumSort: (s: "hot" | "new" | "top") => void;
  expandedPost: any;
  setExpandedPost: (id: any) => void;
  commentText: string;
  setCommentText: (v: string) => void;
  setSupportOpen: (v: boolean) => void;
  setShowFeatureTour?: (v: boolean) => void;
  doLogoutFull: () => void;
  discoveryPrefs: any;
  setDiscoveryPrefs: React.Dispatch<React.SetStateAction<any>>;
  notifPrefs: Record<string, boolean>;
  setNotifPrefs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
   setShowNsfw: React.Dispatch<React.SetStateAction<boolean>>;
  appliedBriefs?: number[];
  savedBriefs?: number[];
  bookingsForHub?: { asBooker: any[]; asHost: any[] };
  setShowSafetyCheckin?: (v: boolean) => void;
  setShowPromptBank?: (v: boolean) => void;
  setShowConnect?: (v: boolean) => void;
  setShowPaymentHistory?: (v: boolean) => void;
  setShowReferral?: (v: boolean) => void;
  setShowQuests?: (v: boolean) => void;
  questClaimables?: number;
nearQuests?: number;
  topQuests?: {id:string;title:string;icon:string;progress:number;target:number;color:string}[];
  loginStreak?: number;
  weeklyLogins?: boolean[];
  isUnlimited?: boolean;
  profileViews?: number;
  likesReceived?: number;
  showOnline?: boolean;
  setShowOnline?: React.Dispatch<React.SetStateAction<boolean>>;
  showDistance?: boolean;
  setShowDistance?: React.Dispatch<React.SetStateAction<boolean>>;
  blockedUsers: string[];
  setScreen: (s: Screen) => void;
  setShowAgeVerification: (v: boolean) => void;
  setObStep?: (v: number) => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  authFetch: (url: string, opts?: any) => Promise<any>;
  uid: () => any;
  authUser: any;
  onOpenActivity?: () => void;
  unreadCount?: number;
  activityFeed?: {id:number;from:string;avatar:string;text:string;time:string;read:boolean}[];
  getReferralTier?: (count: number) => { tier: string; perks: string; discount?: number; nextThreshold?: number | null };
}

const SUPPORT_EMAIL = "info@wyzdesign.com";

export const MenuModal = memo(function MenuModal({
  showHamburger,
  setShowHamburger,
  hamburgerScreen,
  setHamburgerScreen,
  showScreen,
  liveCommunities,
  liveEvents,
  showNsfw,
  rsvpdEvents,
  setRsvpdEvents,
  matches,
  openChat,
  setChatTarget,
  showToast,
  handleImgError,
  setViewProfile,
  currentUser,
  showNewPost,
  setShowNewPost,
  newPostTitle,
  setNewPostTitle,
  newPostBody,
  setNewPostBody,
  setForumPosts,
  liveForum,
  setLiveForum,
  forumSort,
  setForumSort,
  expandedPost,
  setExpandedPost,
  commentText,
  setCommentText,
  setSupportOpen,
  setShowFeatureTour,
  doLogoutFull,
  discoveryPrefs,
  setDiscoveryPrefs,
  notifPrefs,
  setNotifPrefs,
   setShowNsfw,
  appliedBriefs = [],
  savedBriefs = [],
  bookingsForHub,
  setShowSafetyCheckin,
  setShowPromptBank,
  setShowConnect,
  setShowPaymentHistory,
  setShowReferral,
  setShowQuests,
  questClaimables = 0,
  nearQuests = 0,
  topQuests = [],
  loginStreak = 0,
  weeklyLogins = [false,false,false,false,false,false,false],
  isUnlimited = false,
  profileViews = 0,
  likesReceived = 0,
  setObStep = () => {},
  showOnline = true,
  setShowOnline,
  showDistance = true,
  setShowDistance,
  blockedUsers,
  setScreen,
  setShowAgeVerification,
  apiFetch,
  authFetch,
  uid,
  authUser,
  onOpenActivity,
  unreadCount,
  activityFeed = [],
  liveProfessionals,
  getReferralTier,
}: MenuModalProps) {
  const [mounted, setMounted] = useState(showHamburger);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus trap + Escape-to-close + focus restore while the sheet is open.
  // On a sub-screen Escape steps back to the menu root; otherwise it closes.
  const hamburgerRef = useFocusTrap<HTMLDivElement>(showHamburger, () => {
    if (hamburgerScreen) setHamburgerScreen(null as any);
    else setShowHamburger(false);
  });

  useEffect(() => {
    if (showHamburger) {
      if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      closeTimer.current = setTimeout(() => {
        setMounted(false);
        setClosing(false);
        closeTimer.current = null;
      }, 320);
    }
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHamburger]);

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

  if (!mounted) return null;

  return (
    <div className={"hamburger-overlay" + (closing ? " closing" : "")} role="dialog" aria-modal="true" aria-label="Menu">
      <div className="hamburger-backdrop" role="presentation" aria-hidden="true" onClick={() => setShowHamburger(false)} />
      <div className="hamburger-panel" ref={hamburgerRef}>
        <div
          className="hamburger-close"
          onClick={() => { if (hamburgerScreen) setHamburgerScreen(null as any); else setShowHamburger(false); }}
          role="button"
          aria-label={hamburgerScreen ? "Back to menu" : "Close menu"}
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { if (hamburgerScreen) setHamburgerScreen(null as any); else setShowHamburger(false); } }}
        >
          {hamburgerScreen ? <FiArrowLeft size={18} /> : <FiX size={18} />}
        </div>
        {!hamburgerScreen && (
          <button
            className="hamburger-bell"
            onClick={() => { onOpenActivity?.(); setHamburgerScreen("activity"); }}
            aria-label="Notifications"
          >
            <FiBell size={18} />
            {unreadCount ? <span className="hamburger-bell-dot" /> : null}
          </button>
        )}
        {!hamburgerScreen && <div className="hamburger-menu-title">Menu</div>}
        {(hamburgerScreen === "settings" || hamburgerScreen === "profile") && <div className="hamburger-menu-title">{hamburgerScreen === "settings" ? "Settings" : "Your Profile"}</div>}
        {!hamburgerScreen ? (
          <>
            {[
              // Session 55 closed-beta scope: Community (channels/groups/events) is
              // hidden behind MUSE_CLOSED_BETA_HIDE_SOCIAL — built, tested, kept out
              // of the nav until the core discover/book loop has proven out with the
              // beta cohort. Network's "Professionals" search stays visible (real
              // discovery value even pre-beta); its Forum sub-tab is separately
              // suppressed below in NetworkScreen.
              ...(MUSE_CLOSED_BETA_HIDE_SOCIAL ? [] : [{ key: "community", icon: <FiUsers size={22} />, label: "Community", desc: "Channels, groups & events", grad: "linear-gradient(135deg,#FF8A80,#FF4757,#FFD700)" }]),
              { key: "sessions", icon: <FiCalendar size={22} />, label: "Sessions", desc: "Bookings & one-on-ones", grad: "linear-gradient(135deg,#E1BEE7,#9C27B0,#FF4081)" },
              { key: "network", icon: <FiShare2 size={22} />, label: "Network", desc: MUSE_CLOSED_BETA_HIDE_SOCIAL ? "Find professionals" : "Professionals & forum", grad: "linear-gradient(135deg,#B3E5FC,#64B5F6,#00BCD4)" },
              { key: "profile", icon: <FiUser size={22} />, label: "Profile", desc: "Edit profile & premium", grad: "linear-gradient(135deg,#FFD700,#FFB5C2,#B388FF)" },
              { key: "settings", icon: <FiSettings size={22} />, label: "Settings", desc: "Preferences, safety & help", grad: "linear-gradient(135deg,#CE93D8,#B388FF,#A5D6A7)" },
            ].map(item => {
              const activate = () => {
                if (item.key === "community" || item.key === "sessions" || item.key === "network") {
                  setShowHamburger(false);
                  showScreen(item.key as any);
                } else {
                  setHamburgerScreen(item.key);
                }
              };
              return (
                <div
                  key={item.key}
                  className="hamburger-item"
                  role="button"
                  tabIndex={0}
                  onClick={activate}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } }}
                >
                  <div className="hamburger-item-icon" style={{ background: item.grad }}>{item.icon}</div>
                  <div><div className="hamburger-item-label">{item.label}</div><div className="hamburger-item-desc">{item.desc}</div></div>
                </div>
              );
            })}
            {topQuests.length > 0 && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  {loginStreak > 0 && <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>🔥 {loginStreak} day streak</div>}
                  {questClaimables > 0 && <div style={{ fontSize: 11, color: "#FF69B4", fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(255,105,180,0.1)", border: "1px solid rgba(255,105,180,0.2)" }}>{questClaimables} reward{questClaimables > 1 ? "s" : ""} ready</div>}
                </div>
                <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>Your Quests</div>
                {topQuests.map(q => {
                  const pct = Math.round((q.progress / q.target) * 100);
                  return (
                    <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{q.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.title}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: q.color, transition: "width .4s" }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 800, color: q.color, minWidth: 24, textAlign: "right" }}>{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: 10, textAlign: "right" }}>
                  <button style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, cursor: "pointer", background: "none", border: "none", padding: 0 }} onClick={() => { setShowHamburger(false); setShowQuests?.(true); }}>View all →</button>
                </div>
              </div>
            )}
            <button className="muse-pro-banner" onClick={() => { setShowHamburger(false); showScreen("subscription"); }} tabIndex={0} aria-label="Muse Pro">
              <div className="muse-pro-banner-shine" />
              <div className="muse-pro-banner-content">
                <div className="muse-pro-banner-icon"><FiStar size={16} /></div>
                <div className="muse-pro-banner-text">
                  <div className="muse-pro-banner-title">Muse Pro</div>
                  <div className="muse-pro-banner-sub">Unlimited likes · superlikes · boosts</div>
                </div>
                <div className="muse-pro-banner-cta">✦</div>
              </div>
            </button>
          </>
        ) : (
          <>
            {hamburgerScreen === "community" && (
              <div className="conn-scroll">
                <div className="hamburger-title">Community</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>Channels &amp; Groups</div>
                {(liveCommunities?.length ? liveCommunities : COMMUNITIES).filter(c => showNsfw || !c.nsfw).map(c => (
                  <div key={c.id} className="conn-card" style={{ margin: "0 0 10px" }}>
                    <Image loading="lazy" src={c.img} alt={c.name} width={102} height={102} className="conn-avatar" onError={handleImgError} />
                    <div className="conn-content">
                      <div className="conn-name">{c.name}</div>
                      <div className="conn-meta">{c.members} members · {c.desc}</div>
                      <div className="conn-actions" style={{ marginTop: 8, display: "flex", gap: 8, flexDirection: "column" }}>
                        <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async () => { try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join-community", communityId: c.id }) }); if (!r.ok) throw new Error("failed"); showToast("Joined " + c.name + "!"); } catch { showToast("Failed to join"); } }}>{c.cat === "nsfw" ? "Join (18+)" : "Join"}</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { setShowHamburger(false); showScreen("community"); }}>Learn</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { const url = getCommunityShareUrl(c.id); if (navigator.share) { navigator.share({ title: c.name, url }).catch(() => {}); } else { navigator.clipboard?.writeText(url); showToast("Link copied!"); } }}>Share</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "20px 0 10px" }}>Events</div>
                {(liveEvents?.length ? liveEvents : EVENTS).filter(e => showNsfw || !e.nsfw).map(ev => (
                  <div key={ev.id} className="conn-card" style={{ flexDirection: "column", margin: "0 0 10px" }}>
                    <div className="conn-name">{ev.title}</div>
                    <div className="conn-meta">{ev.date} · {ev.loc}</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", margin: "4px 0 8px", lineHeight: 1.5 }}>{ev.desc}</div>
                    <div style={{ display: "flex", gap: 8, width: "100%", flexDirection: "column" }}>
                      <button className={"btn " + (rsvpdEvents.includes(ev.id) ? "btn-outline" : "btn-gold")} style={{ width: "100%", padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12 }} onClick={async () => { const isRsvpd = rsvpdEvents.includes(ev.id); try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: isRsvpd ? "cancel-rsvp" : "rsvp", eventId: ev.id }) }); setRsvpdEvents(prev => isRsvpd ? prev.filter((x) => x !== ev.id) : [...prev, ev.id]); showToast(isRsvpd ? "RSVP cancelled" : "RSVP confirmed!"); } catch { showToast("Failed to update RSVP"); } }}>{rsvpdEvents.includes(ev.id) ? "Going" : "RSVP"}</button>
                      <button className="btn btn-outline" style={{ width: "100%", padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12 }} onClick={() => { const url = getEventShareUrl(ev.id); if (navigator.share) { navigator.share({ title: ev.title, url }).catch(() => {}); } else { navigator.clipboard?.writeText(url); showToast("Event link copied!"); } }}>Share</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hamburgerScreen === "sessions" && (
              <div className="conn-scroll">
                <div className="hamburger-title">Sessions</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>One-on-One Sessions</div>
                {SESSIONS.map(s => (
                  <div key={s.id} className="conn-card" style={{ margin: "0 0 10px" }}>
                    <Image loading="lazy" src={s.img} alt={s.name} width={68} height={68} className="conn-avatar" style={{ borderRadius: "50%" }} onError={handleImgError} />
                    <div className="conn-content">
                      <div className="conn-name">{s.name}</div>
                      <div className="conn-meta">{s.type} · {s.rate} · ★ {s.rating}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                        {(s.skills || []).map((sk: string) => <span key={sk} className="conn-tag" style={{ fontSize: 10, padding: "3px 8px" }}>{sk}</span>)}
                      </div>
                      <div className="conn-actions" style={{ marginTop: 8, display: "flex", gap: 8, flexDirection: "column" }}>
                        <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async () => { try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "book-session", sessionId: s.id }) }); if (r.status === 403) { const d = await r.json().catch(() => ({})); if (d.code === "VERIFICATION_REQUIRED") { setShowAgeVerification(true); showToast("Verify your identity to book paid sessions"); return; } } if (!r.ok) throw new Error("failed"); showToast("Session request sent to " + s.name + "!"); } catch { showToast("Failed to book session"); } }}>{s.available ? "Book Session" : "Waitlist"}</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { setViewProfile(s); showToast("Viewing " + s.name + "'s profile"); }}>View Profile</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "20px 0 10px" }}>Your Bookings</div>
                {matches.filter(m => m.booked).length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, color: "var(--muted)", fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                    No bookings yet.<br />Swipe right and book sessions with your matches!
                  </div>
                ) : (
                  matches.filter(m => m.booked).map(m => (
                    <div key={m.id} className="conn-card" style={{ margin: "0 0 10px" }}>
                      <Image loading="lazy" src={m.img} alt={m.name} width={68} height={68} className="conn-avatar" onError={handleImgError} />
                      <div className="conn-content">
                        <div className="conn-name">{m.name}</div>
                        <div className="conn-meta">{m.type} · Booked Session</div>
                        <div className="conn-actions" style={{ marginTop: 8, display: "flex", gap: 8, flexDirection: "column" }}>
                          <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => { setHamburgerScreen(""); setShowHamburger(false); openChat(m); }}>Message</button>
                          <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { setChatTarget(m); showScreen("chat"); }}>Details</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {hamburgerScreen === "network" && (
              <div className="conn-scroll">
                <div className="hamburger-title">Network</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>Creative Professionals</div>
                {/* Was always the static seed list — liveProfessionals wasn't a prop at all */}
                {(liveProfessionals?.length ? liveProfessionals : PROFESSIONALS).filter((p: any) => showNsfw || !p.nsfw).map((p: any) => (
                  <div key={p.id} className="conn-card" style={{ margin: "0 0 10px", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 0 16px 0", gap: 0 }}>
                    <div style={{ position: "relative", width: "100%", height: 150 }}>
                      <Image loading="lazy" src={p.img} alt={p.name} fill sizes="(max-width: 600px) 100vw, 400px" style={{ objectFit: "fill", borderRadius: "16px 16px 0 0" }} onError={handleImgError} />
                    </div>
                    <div className="conn-content" style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" }}>
                      <div className="conn-name">{p.name}</div>
                      <div className="conn-meta">{p.type} · {p.loc} · {p.exp}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, justifyContent: "center" }}>
                        {(p.skills || []).slice(0, 3).map((s: string) => <span key={s} className="conn-tag" style={{ fontSize: 10, padding: "3px 8px" }}>{s}</span>)}
                        {(p.skills || []).length > 3 && <span className="conn-tag" style={{ fontSize: 10, padding: "3px 8px" }}>+{(p.skills || []).length - 3}</span>}
                      </div>
                      <div className="conn-actions" style={{ marginTop: 8, display: "flex", gap: 8, flexDirection: "column" }}>
                        <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async () => { try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect", targetId: p.id }) }); if (!r.ok) throw new Error("failed"); showToast("Connection request sent to " + p.name + "!"); } catch { showToast("Failed to send connection"); } }}>Connect</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { setViewProfile(p); showToast("Viewing " + p.name + "'s profile"); }}>View Profile</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { const url = getProShareUrlWithRef(p.id, currentUser.name.replace(/\s+/g, "-").toLowerCase()); if (navigator.share) { navigator.share({ title: p.name + " on Muse", url }).catch(() => {}); } else { navigator.clipboard?.writeText(url); showToast("Shared " + p.name + "'s profile!"); } }}>Share Your Profile</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "20px 0 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Forum</span>
                  <button className="conn-btn conn-btn-primary" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => setShowNewPost(!showNewPost)}>+ Post</button>
                </div>
                {showNewPost && (
                  <div className="conn-card" style={{ flexDirection: "column", margin: "0 0 14px" }}>
                    <input className="inp" placeholder="Title" value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} style={{ marginBottom: 8 }} />
                    <textarea className="inp" placeholder="What's on your mind?" rows={3} value={newPostBody} onChange={e => setNewPostBody(e.target.value)} style={{ marginBottom: 10, resize: "none" }} />
                    <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                      <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async () => { if (newPostTitle.trim()) { const title = newPostTitle.trim(); const body = newPostBody.trim(); setForumPosts((prev: any[]) => [{ id: uid(), title, body, author: currentUser.name, avatar: currentUser.avatar, votes: 1, comments: [], cat: "General", time: "Just now", pinned: false }, ...prev]); setNewPostTitle(""); setNewPostBody(""); setShowNewPost(false); try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", title, body, userId: currentUser.id }) }); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-quest", action_keys: ["forum_post"] }) }).catch(() => {}); try { const rf = await apiFetch("/api/muse?type=forum"); const df = await rf.json(); if (df.posts) setLiveForum?.(df.posts); } catch {} showToast("Posted!"); } catch { showToast("Failed to post"); } } }}>Post</button>
                      <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => setShowNewPost(false)}>{STRINGS.cancel}</button>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{(["hot", "new", "top"] as const).map(s => (<div key={s} className={"conn-tab-sub" + (forumSort === s ? " active" : "")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setForumSort(s); } }} onClick={() => setForumSort(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>))}</div>
                {[...(liveForum?.length ? liveForum : FORUM_POSTS)].sort((a, b) => forumSort === "top" ? (b.votes + b.comments.length * 2) - (a.votes + a.comments.length * 2) : forumSort === "new" ? (b.id - a.id) : (b.votes * 2 + b.comments.length) - (a.votes * 2 + a.comments.length)).map(post => (
                  <div key={post.id} className="conn-card" style={{ flexDirection: "column", margin: "0 0 10px", padding: "14px 18px" }}>
                    {post.pinned && <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 4 }}>📌 Pinned</div>}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 36 }}>
                        {/* Fallback-seeding fix (same as NetworkScreen handleVote): `prev ? map : prev`
                            no-ops when liveForum is null, so votes on fallback posts never moved. */}
                        <button style={{ background: "none", border: "none", color: post.votes > 0 ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }} onClick={() => { setLiveForum?.((prev: any[] | null) => (prev && prev.length ? prev.map(p => p.id === post.id ? { ...p, votes: p.votes + 1 } : p) : FORUM_POSTS.map(p => p.id === post.id ? { ...p, votes: p.votes + 1 } : p))); setForumPosts((prev: any[]) => prev.map(p => p.id === post.id ? { ...p, votes: p.votes + 1 } : p)); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", type: "vote", postId: post.id, direction: "up" }) }).catch(() => {}); }}>▲</button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{post.votes}</span>
                        <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }} onClick={() => { setLiveForum?.((prev: any[] | null) => (prev && prev.length ? prev.map(p => p.id === post.id ? { ...p, votes: p.votes - 1 } : p) : FORUM_POSTS.map(p => p.id === post.id ? { ...p, votes: p.votes - 1 } : p))); setForumPosts((prev: any[]) => prev.map(p => p.id === post.id ? { ...p, votes: p.votes - 1 } : p)); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", type: "vote", postId: post.id, direction: "down" }) }).catch(() => {}); }}>▼</button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{post.title}</div>
                        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, marginBottom: 8 }}>{post.body}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
                          <Image loading="lazy" src={post.avatar} alt="Avatar" width={18} height={18} style={{ borderRadius: "50%", objectFit: "cover" }} /> <span style={{ fontWeight: 600, color: "var(--text)" }}>{post.author}</span>
                          <span>·</span><span>{post.time}</span><span>·</span><span>{post.cat}</span><span>·</span><span>{post.comments.length} replies</span>
                        </div>
                        {expandedPost === post.id && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            {post.comments.map((c: { author: string; text: string }, i: number) => <div key={i} style={{ fontSize: 13, color: "var(--text2)", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><strong style={{ color: "var(--text)" }}>{c.author}</strong>: {c.text}</div>)}
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                              <input className="inp" placeholder="Reply..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={async e => { if (e.key === "Enter" && commentText.trim()) { const txt = commentText.trim(); setLiveForum?.((prev: any[] | null) => (prev && prev.length ? prev.map(p => p.id === post.id ? { ...p, comments: [...p.comments, { author: currentUser.name, text: txt }] } : p) : FORUM_POSTS.map(p => p.id === post.id ? { ...p, comments: [...p.comments, { author: currentUser.name, text: txt }] } : p))); setForumPosts((prev: any[]) => prev.map(p => p.id === post.id ? { ...p, comments: [...p.comments, { author: currentUser.name, text: txt }] } : p)); setCommentText(""); try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", type: "reply", postId: post.id, text: txt, userId: currentUser.id }) }); showToast("Reply posted!"); } catch { showToast("Failed to post reply"); } } }} style={{ flex: 1, margin: 0 }} />
                            </div>
                          </div>
                        )}
                        {post.comments.length > 0 && expandedPost !== post.id && <button className="conn-btn conn-btn-ghost" style={{ fontSize: 11, padding: "4px 8px", marginTop: 6 }} onClick={() => { setExpandedPost(post.id === expandedPost ? null : post.id); }}>{post.comments.length} replies</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hamburgerScreen === "profile" && (
              <div className="conn-scroll">
                {/* paddingTop: .conn-scroll itself has no top padding, and the halo/hoop
                    rings extend ~13px past the 100px avatar photo on every side. With
                    this wrap sitting flush at the scroll container's top edge, that
                    overflow was getting clipped by the scroll boundary — the top of the
                    rings rendered with a flat cut instead of curving. This gives them
                    room to clear it. */}
                <div style={{ textAlign: "center", marginBottom: 20, paddingTop: 20 }}>
                  <div className="profile-avatar-wrap">
                    <Image loading="lazy" src={currentUser.avatar} alt="You" width={100} height={100} className="profile-avatar" onError={handleImgError} />
                    {/* Hoolah-hoop: halo (.profile-ring) is the CSS-default 115px (Session
                        85: a "decrease the halo" ask turned out to mean the ring's line
                        thickness, not diameter — see the .profile-ring comment in
                        muse.css; diameter here reverted back to 115px/125px, then the gap
                        tightened ~10% to 124px — a ~4.5px gap past the halo's edge on
                        every side, close enough to read as circling/hovering just above
                        it, still never touching. orbit-full added (Session 85 final
                        correction): without it this rendered as a partial comet-arc, not
                        a full ring — see the .avatar-orbit comment in muse.css. */}
                    <div className="profile-ring profile-ring-large swirl-ring-1" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{currentUser.name}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{currentUser.type} · {currentUser.exp}</div>
                </div>
                <button className="hamburger-item" style={{ width: "100%", marginBottom: 6 }} onClick={() => { setHamburgerScreen(""); setShowHamburger(false); setScreen("profile"); }}>
                  <div className="hamburger-item-icon" style={{ background: "linear-gradient(135deg,#FFD700,#FFBF00,#FF8A80)" }}><FiUser size={22} /></div>
                  <div><div className="hamburger-item-label">Edit Profile</div><div className="hamburger-item-desc">Update your bio, skills, portfolio</div></div>
                </button>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "20px 0 10px" }}>Statistics</div>
                <div className="stats-row" style={{ marginTop: 8 }}>
                  <div className="stat"><div className="stat-num">{matches.length || 0}</div><div className="stat-label">Matches</div></div>
                  <div className="stat"><div className="stat-num">{currentUser.stats?.likes || 0}</div><div className="stat-label">Likes</div></div>
                  <div className="stat"><div className="stat-num">{currentUser.stats?.bookingsCompleted || 0}</div><div className="stat-label">Bookings</div></div>
                </div>
                {/* PROFILE STATS — full transparency, no cap on what's visible */}
                {(() => {
                  const myForumPosts = (liveForum || []).filter((p: any) => p.author === currentUser?.name).length;
                  const stats: { label: string; value: string | number }[] = [
                    { label: "Profile views", value: profileViews ?? 0 },
                    { label: "Likes received", value: likesReceived ?? 0 },
                    { label: "Matches", value: matches.length },
                    { label: "Collabs", value: (currentUser as any)?.stats?.collabs ?? (currentUser as any)?.collabs ?? 0 },
                    { label: "Quests applied", value: appliedBriefs.length },
                    { label: "Quests saved", value: savedBriefs.length },
                    { label: "Bookings", value: (bookingsForHub?.asBooker || []).length + (bookingsForHub?.asHost || []).length },
                    { label: "Forum posts", value: myForumPosts },
                  ];
                  const memberSince = (authUser as any)?.created_at || (authUser as any)?.user?.created_at;
                  return (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {stats.map(s => (
                          <div key={s.label} style={{ padding: "12px 10px", borderRadius: 14, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)", textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--gold)" }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {memberSince && (
                        <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
                          Member since {new Date(memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                        </div>
                      )}
                    </>
                  );
                })()}
                {/* YOUR ACTIVITY WIDGET */}
                <div style={{ marginTop: 20, padding: 16, borderRadius: 16, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Your Activity</div>
                    <FiActivity size={20} style={{ color: "var(--gold)" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--gold)", fontFamily: "monospace" }}>{loginStreak || 0}</div>
                      <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>Day Streak</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#FF69B4", fontFamily: "monospace" }}>{questClaimables || 0}</div>
                      <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>Rewards Ready</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, textAlign: "right" }}>
                    <button style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, cursor: "pointer", background: "none", border: "none", padding: 0 }} onClick={() => { setShowHamburger(false); setShowQuests?.(true); }}>View all →</button>
                  </div>
                </div>
                {/* REFERRAL PROGRAM LINK */}
                <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: "rgba(255,105,180,0.08)", border: "1px solid rgba(255,105,180,0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FiGift size={18} style={{ color: "#FF69B4" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Referral Program</span>
                    </div>
                    <FiDollarSign size={18} style={{ color: "var(--gold)" }} />
                  </div>
<div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10 }}>
                      Invite creatives. Earn rewards. Tier: <span style={{ color: "var(--gold)", fontWeight: 700 }}>{getReferralTier?.(currentUser.referrals || 0).tier || "None"}</span> · {currentUser.referrals || 0} joined
                    </div>
                  <button style={{ width: "100%", fontSize: 12, fontWeight: 600, color: "#FF69B4", background: "rgba(255,105,180,0.1)", border: "1px solid rgba(255,105,180,0.3)", padding: "10px 0", borderRadius: 12, cursor: "pointer" }} onClick={() => { setShowHamburger(false); setShowReferral?.(true); }}>Go to Referral Program</button>
                </div>
              </div>
            )}
            {hamburgerScreen === "settings" && (
              <div className="conn-scroll">
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>Discovery Preferences</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Age Range</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", overflow: "hidden" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{discoveryPrefs.ageMin}</span>
                    <input type="range" min={18} max={65} value={discoveryPrefs.ageMin} onChange={e => setDiscoveryPrefs((p: any) => ({ ...p, ageMin: Number(e.target.value) }))} style={{ flex: 1, minWidth: 0, accentColor: "var(--gold)" }} />
                    <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>to</span>
                    <input type="range" min={18} max={65} value={discoveryPrefs.ageMax} onChange={e => setDiscoveryPrefs((p: any) => ({ ...p, ageMax: Number(e.target.value) }))} style={{ flex: 1, minWidth: 0, accentColor: "var(--gold)" }} />
                    <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{discoveryPrefs.ageMax}</span>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Max Distance: {discoveryPrefs.distance} mi</div>
                  <input type="range" min={1} max={100} value={discoveryPrefs.distance} onChange={e => setDiscoveryPrefs((p: any) => ({ ...p, distance: Number(e.target.value) }))} style={{ width: "100%", accentColor: "var(--gold)" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Show Me</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["all", "women", "men", "non-binary"].map(g => (
                      <div key={g} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDiscoveryPrefs((p: any) => ({ ...p, gender: g })); } }} onClick={() => setDiscoveryPrefs((p: any) => ({ ...p, gender: g }))} style={{ padding: "8px 16px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all .25s", background: discoveryPrefs.gender === g ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)", border: "1px solid " + (discoveryPrefs.gender === g ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"), color: discoveryPrefs.gender === g ? "var(--gold)" : "var(--muted)" }}>{g.charAt(0).toUpperCase() + g.slice(1)}</div>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Notification Preferences</div>
                  {[{ k: "match", l: "New Matches" }, { k: "message", l: "Messages" }, { k: "brief", l: "Quest Updates" }, { k: "like", l: "Likes" }].map(n => (
                    <div key={n.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 13, color: "var(--text)" }}>{n.l}</span>
                      <div role="switch" aria-checked={!!notifPrefs[n.k]} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNotifPrefs((p: any) => ({ ...p, [n.k]: !p[n.k] })); } }} onClick={() => setNotifPrefs((p: any) => ({ ...p, [n.k]: !p[n.k] }))} style={{ width: 44, height: 24, borderRadius: 12, background: notifPrefs[n.k] ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "all .25s" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: notifPrefs[n.k] ? "var(--gold)" : "var(--muted)", position: "absolute", top: 2, left: notifPrefs[n.k] ? 22 : 2, transition: "all .25s" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "24px 0 10px" }}>Account</div>
                {[
                  { label: "Edit Profile", desc: "Name, bio, photos", go: () => { setShowHamburger(false); showScreen("profile"); } },
                  { label: "Personality Profile", desc: "Zodiac, MBTI, Life Path", go: () => { setScreen("onboard"); setObStep(7); } },
                  { label: "Creative Profile", desc: "Type, styles, looking for", go: () => { setScreen("onboard"); setObStep(4); } },
                ].map(r => (
                  <div key={r.label} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowHamburger(false); r.go(); } }} onClick={() => { setShowHamburger(false); r.go(); }} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{r.label}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{r.desc}</div></div>
                    <span style={{ color: "var(--muted)", fontSize: 14 }}>›</span>
                  </div>
                ))}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "24px 0 10px" }}>Payments &amp; Subscription</div>
                {[
                  { label: "Subscription", desc: "Manage your plan — Muse Pro", go: () => { setShowHamburger(false); showScreen("subscription"); }, dot: false },
                  ...(setShowQuests ? [{ label: "Quests", desc: questClaimables > 0 ? `${questClaimables} reward${questClaimables > 1 ? "s" : ""} ready to claim!` : "Complete challenges, earn free likes", go: () => { setShowHamburger(false); setShowQuests(true); }, dot: questClaimables > 0 }] : []),
                  ...(setShowConnect ? [{ label: "Marketplace Payments", desc: "Connect Stripe to receive bookings", go: () => { setShowHamburger(false); setShowConnect(true); }, dot: false }] : []),
                  ...(setShowPaymentHistory ? [{ label: "Payment History", desc: "Your charges and payouts", go: () => { setShowHamburger(false); setShowPaymentHistory(true); }, dot: false }] : []),
                  ...(setShowReferral ? [{ label: "Referral Program", desc: "Invite friends, earn rewards", go: () => { setShowHamburger(false); setShowReferral(true); }, dot: false }] : []),
                ].map(r => (
                  <div key={r.label} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); r.go(); } }} onClick={() => r.go()} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>{r.label}{r.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF69B4", display: "inline-block" }} />}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{r.desc}</div></div>
                    <span style={{ color: "var(--muted)", fontSize: 14 }}>›</span>
                  </div>
                ))}
                <button className="btn btn-gold" style={{ width: "100%", fontSize: 12 }} onClick={async () => { try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { ...discoveryPrefs, notifications: notifPrefs, showOnline, showDistance } }) }); showToast("Preferences saved!"); } catch { showToast("Failed to save"); } }}>Save Preferences</button>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "24px 0 10px" }}>Safety &amp; Privacy</div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Show Distance</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Display your approximate location</div></div>
                  <div role="switch" aria-checked={!!showDistance} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const next = !showDistance; setShowDistance?.(next); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showDistance: next } }) }).catch(() => showToast("Couldn't save — try again")); } }} onClick={() => { const next = !showDistance; setShowDistance?.(next); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showDistance: next } }) }).catch(() => showToast("Couldn't save — try again")); }} style={{ width: 44, height: 24, borderRadius: 12, background: showDistance ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "all .25s" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: showDistance ? "var(--gold)" : "var(--muted)", position: "absolute", top: 2, left: showDistance ? 22 : 2, transition: "all .25s" }} />
                  </div>
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Online Status</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Show when you're active</div></div>
                  <div role="switch" aria-checked={!!showOnline} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const next = !showOnline; setShowOnline?.(next); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showOnline: next } }) }).catch(() => showToast("Couldn't save — try again")); } }} onClick={() => { const next = !showOnline; setShowOnline?.(next); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { showOnline: next } }) }).catch(() => showToast("Couldn't save — try again")); }} style={{ width: 44, height: 24, borderRadius: 12, background: showOnline ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "all .25s" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: showOnline ? "var(--gold)" : "var(--muted)", position: "absolute", top: 2, left: showOnline ? 22 : 2, transition: "all .25s" }} />
                  </div>
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowHamburger(false); setShowSafetyCheckin?.(true); } }} onClick={() => { setShowHamburger(false); setShowSafetyCheckin?.(true); }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Safety Center</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Check-ins · Strikes &amp; Disclosures</div></div>
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>›</span>
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowHamburger(false); setShowPromptBank?.(true); } }} onClick={() => { setShowHamburger(false); setShowPromptBank?.(true); }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Prompt Bank</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Personality prompts &amp; answers</div></div>
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>›</span>
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Blocked Users</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{blockedUsers.length} blocked</div></div>
                </div>
                {isUnlimited && (
                  <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowHamburger(false); window.open("/muse/admin", "_self"); } }} onClick={() => { setShowHamburger(false); window.open("/muse/admin", "_self"); }}>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>Admin Dashboard</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Analytics &amp; moderation</div></div>
                    <span style={{ color: "var(--muted)", fontSize: 14 }}>›</span>
                  </div>
                )}
                <button className="btn" style={{ width: "100%", marginTop: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text)", fontSize: 13 }} onClick={async () => { try { const res = await authFetch("/api/muse?type=export"); if (!res.ok) { showToast("Export failed"); return; } const j = await res.json(); const blob = new Blob([JSON.stringify(j, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "muse-my-data.json"; a.click(); URL.revokeObjectURL(url); showToast("Data exported"); } catch (e) { showToast("Export failed"); } }}>Export My Data</button>
                {!showBugForm ? (
                  <button className="btn" style={{ width: "100%", marginTop: 8, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff8a80", fontSize: 13 }} onClick={() => setShowBugForm(true)}>Report a Bug</button>
                ) : (
                  <div style={{ marginTop: 8, padding: 14, background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.15)", borderRadius: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ff8a80", marginBottom: 10 }}>Report a Bug</div>
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
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input value={bugExpected} onChange={e => setBugExpected(e.target.value)} placeholder="Expected behavior" style={{ flex: 1, padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
                      <input value={bugActual} onChange={e => setBugActual(e.target.value)} placeholder="Actual behavior" style={{ flex: 1, padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" style={{ flex: 1, fontSize: 12, padding: "8px 0", background: "rgba(255,107,107,0.15)", border: "1px solid rgba(255,107,107,0.3)", color: "#ff8a80" }} disabled={bugSubmitting || !bugDescription.trim()} onClick={async () => { setBugSubmitting(true); try { const r = await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "report-bug", category: bugCategory, description: bugDescription, steps: bugSteps, expected: bugExpected, actual: bugActual }) }); if (!r.ok) throw new Error("failed"); showToast("Bug report sent — thank you!"); setShowBugForm(false); setBugDescription(""); setBugSteps(""); setBugExpected(""); setBugActual(""); } catch { showToast("Failed to send bug report"); } setBugSubmitting(false); }}>{bugSubmitting ? "Sending…" : "Submit Bug"}</button>
                      <button className="btn btn-outline" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => setShowBugForm(false)}>{STRINGS.cancel}</button>
                    </div>
                  </div>
                )}
                <button className="btn" style={{ width: "100%", marginTop: 8, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--coral)", fontSize: 13 }} onClick={async () => { if (confirm("Delete your account? This cannot be undone.")) { try { const r = await authFetch("/api/muse/auth", { method: "POST", body: JSON.stringify({ action: "delete-account" }) }); if (!r.ok) { showToast("Failed to delete account"); return; } showToast("Account deleted"); setTimeout(() => window.location.reload(), 1500); } catch { showToast("Failed to delete account"); } } }}>Delete Account</button>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", margin: "16px 0 4px" }}>Legal</div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 14, padding: "4px 14px" }}>
                  {[{ label: "Terms of Service", href: "/terms" }, { label: "Privacy Policy", href: "/privacy" }, { label: "DMCA / Copyright", href: "/dmca" }, { label: "Community Guidelines", href: "/safety" }].map(l => (
                    <a key={l.href} href={l.href} onClick={() => setShowHamburger(false)} style={{ display: "block", padding: "10px 0", fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "color .15s", borderBottom: "1px solid rgba(255,255,255,0.04)" }} onMouseEnter={e => e.currentTarget.style.color = "#FFD700"} onMouseLeave={e => e.currentTarget.style.color = "var(--text2)"}>{l.label}</a>
                  ))}
                  <button className="btn" style={{ width: "100%", margin: "8px 0", background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)", fontSize: 13, fontWeight: 700 }} onClick={() => { setShowHamburger(false); showScreen("codex"); }}>Glossary + Codex</button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "24px 0 10px" }}>Help &amp; Support</div>
                {[
                  { q: "How does matching work?", a: "Swipe right on creators you'd like to connect with. If they swipe right back, it's a match! You can then message each other." },
                  { q: "What are Quests?", a: "Quests are creative opportunities posted by brands and clients. Find them under Collab — apply to paid ones, or respond to vision quests. Track everything you've applied to or saved in Menu → Your Activity." },
                  { q: "How do I upgrade to Premium?", a: "Go to Menu → Settings → Payments & Subscription → Subscription to see plan options." },
                  { q: "How do I report someone?", a: "Tap the ⚑ Report button on any feed or forum post, the ••• menu on a match, or Report inside a chat conversation. Choose a reason and we'll review it — track your reports in Menu → Your Activity → Reports." },
                  { q: "How do I delete my account?", a: "Go to Menu → Settings → Safety & Privacy → Delete Account. This permanently removes all your data." },
                ].map((faq, i) => (
                  <div key={i} style={{ marginBottom: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{faq.q}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{faq.a}</div>
                  </div>
                ))}
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => { setShowHamburger(false); setShowFeatureTour?.(true); }}>App Walkthrough</button>
                  <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => { setShowHamburger(false); setSupportOpen?.(true); }}>Help Guide</button>
                  {!showIdeaForm ? (
                    <button className="btn" style={{ width: "100%", fontSize: 13, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)" }} onClick={() => setShowIdeaForm(true)}>Have an Idea?</button>
                  ) : (
                    <div style={{ padding: 14, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 12 }}>
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
                        <button className="btn" style={{ flex: 1, fontSize: 12, padding: "8px 0", background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", color: "var(--gold)" }} disabled={ideaSubmitting || !ideaTitle.trim() || !ideaDescription.trim()} onClick={async () => { setIdeaSubmitting(true); try { const r = await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit-idea", title: ideaTitle, description: ideaDescription, category: ideaCategory }) }); if (!r.ok) throw new Error("failed"); showToast("Idea submitted — we love it!"); setShowIdeaForm(false); setIdeaTitle(""); setIdeaDescription(""); } catch { showToast("Failed to submit idea"); } setIdeaSubmitting(false); }}>{ideaSubmitting ? "Sending…" : "Submit Idea"}</button>
                        <button className="btn btn-outline" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => setShowIdeaForm(false)}>{STRINGS.cancel}</button>
                      </div>
                    </div>
                  )}
                  <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => window.open("mailto:" + SUPPORT_EMAIL + "?subject=Muse%20Support%20Request")}>Email Support</button>
                </div>
                <button className="btn btn-gold" style={{ width: "100%", marginTop: 16, fontSize: 12, padding: "12px 0" }} onClick={doLogoutFull}>Log Out</button>
              </div>
            )}
            {hamburgerScreen === "activity" && (
              <div className="conn-scroll">
                <ActivityPanel authFetch={authFetch} appliedBriefs={appliedBriefs} savedBriefs={savedBriefs} bookingsForHub={bookingsForHub} weeklyLogins={weeklyLogins} loginStreak={loginStreak} setShowHamburger={setShowHamburger} showScreen={showScreen} onStreakTap={() => { setShowHamburger(false); setShowQuests?.(true); }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default MenuModal;

