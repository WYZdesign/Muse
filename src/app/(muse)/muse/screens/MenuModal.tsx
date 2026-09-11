"use client";

import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { FiArrowLeft, FiUsers, FiCalendar, FiShare2, FiUser, FiSettings, FiStar, FiX, FiBell, FiHeart, FiMessageCircle, FiZap, FiPackage, FiBriefcase, FiTrash2 } from "react-icons/fi";
import type { Screen, Match } from "../components/types";
import StreakWidget from "../components/StreakWidget";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { EmptyState } from "../components/EmptyState";
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
  onMarkAllRead?: () => void;
  briefTitleById?: Record<string, string>;
}

function NotificationAvatar({ name, src, letter }: { name?: string; src?: string; letter?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = letter || (name || "A").charAt(0).toUpperCase();
  if (!src || failed) {
    return <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),var(--pink),var(--lavender))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{initial}</div>;
  }
  return <Image loading="lazy" src={src} alt="Avatar" width={40} height={40} onError={() => setFailed(true)} style={{ borderRadius: "50%", objectFit: "cover", backgroundColor: "var(--card-bg)", flexShrink: 0 }} />;
}

// Swipe-to-dismiss notification row. Horizontal swipe (touch OR mouse) translates
// the row with the finger, reveals a red delete tint behind it, and on release
// past the 90px threshold slides the row fully off-screen, collapses its height,
// then removes it (and fires the backend delete). Only one row is draggable at a
// time (governed by activeDragId from the parent); while one is active, all other
// rows' handlers short-circuit and stay inert.
function SwipeableNotification({ a, notifIcon, activeDragId, setActiveDragId, onRemove }: {
  a: any;
  notifIcon: React.ReactNode;
  activeDragId: any;
  setActiveDragId: (id: any) => void;
  onRemove: (id: any) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const horizDragRef = useRef(false);
  const dxRef = useRef(0);
  const doneRef = useRef(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const [gone, setGone] = useState(false);
  const idStr = String(a.id);

  // Native touchmove handler (React attaches touch listeners as passive, so
  // e.preventDefault() there won't work) — blocks the conn-scroll parent from
  // scrolling while a horizontal swipe is in progress.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (horizDragRef.current && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const begin = (clientX: number, clientY: number) => {
    if (doneRef.current || gone) return;
    if (startRef.current) return; // already actively tracking this gesture
    if (activeDragId != null && activeDragId !== idStr) return; // another row is dragging — stay inert
    startRef.current = { x: clientX, y: clientY };
    horizDragRef.current = false;
    dxRef.current = 0;
    setDx(0);
    setDragging(true);
    setActiveDragId(idStr);
  };

  const moveTo = (clientX: number, clientY: number) => {
    if (!startRef.current) return;
    const x = clientX - startRef.current.x;
    const y = clientY - startRef.current.y;
    if (!horizDragRef.current) {
      if (Math.abs(x) > 12 && Math.abs(x) > Math.abs(y)) {
        horizDragRef.current = true;
      } else if (Math.abs(y) > Math.abs(x)) {
        // Vertical intent — hand back to the scroll container and abort.
        startRef.current = null;
        horizDragRef.current = false;
        dxRef.current = 0;
        setDx(0);
        setDragging(false);
        setActiveDragId(null as any);
        return;
      }
    }
    if (horizDragRef.current) {
      dxRef.current = Math.max(-280, Math.min(280, x));
      setDx(dxRef.current);
    }
  };

  const end = () => {
    if (!startRef.current) { setDragging(false); return; }
    startRef.current = null;
    setDragging(false);
    setActiveDragId(null as any);
    horizDragRef.current = false;
    if (Math.abs(dxRef.current) > 90) {
      setRemoving(true);
      setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        setCollapsing(true);
        setTimeout(() => { onRemove(idStr); setGone(true); }, 250);
      }, 250);
    } else {
      dxRef.current = 0;
      setDx(0);
    }
  };

  const cancel = () => {
    startRef.current = null;
    horizDragRef.current = false;
    dxRef.current = 0;
    setDx(0);
    setDragging(false);
    setActiveDragId(null as any);
  };

  if (gone) return null;

  const offPct = dx > 0 ? "120%" : "-120%";

  return (
    <div data-swipe-row={idStr} style={{ position: "relative", overflow: "hidden", borderRadius: 8, marginBottom: 4, maxHeight: collapsing ? 0 : 400, opacity: collapsing ? 0 : 1, transition: dragging || removing ? "none" : "max-height 220ms ease, opacity 220ms ease" }}>
      {/* Red delete reveal behind the sliding row */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: "linear-gradient(90deg, rgba(255,55,55,0.45) 0%, rgba(255,55,55,0.05) 30%, rgba(120,20,20,0.10) 70%, rgba(255,55,55,0.45) 100%)", opacity: dragging || removing ? (removing ? 1 : 0.2 + Math.min(1, Math.abs(dx) / 90) * 0.8) : 0, transition: "opacity 160ms ease", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#ff8a80", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, opacity: dragging || removing ? 1 : 0, background: "rgba(0,0,0,0.35)", padding: "3px 8px", borderRadius: 99, transition: "opacity 160ms ease" }}><FiTrash2 size={14} /> Swipe to remove</span>
      </div>
      <div
        ref={rowRef}
        onPointerDown={(e) => { if (e.pointerType === "mouse" && e.button !== 0) return; begin(e.clientX, e.clientY); if (startRef.current) { try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {} } }}
        onPointerMove={(e) => moveTo(e.clientX, e.clientY)}
        onPointerUp={end}
        onPointerCancel={cancel}
        onTouchStart={(e) => begin(e.touches[0]?.clientX ?? 0, e.touches[0]?.clientY ?? 0)}
        onTouchMove={(e) => moveTo(e.touches[0]?.clientX ?? 0, e.touches[0]?.clientY ?? 0)}
        onTouchEnd={end}
        onTouchCancel={cancel}
        style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border-subtle)", opacity: a.read ? 0.55 : 1, background: a.read ? "transparent" : "rgba(255,215,0,0.03)", position: "relative", zIndex: 1, touchAction: "pan-y", userSelect: dragging ? "none" : undefined, transform: removing ? `translateX(${offPct})` : `translateX(${dx}px)`, transition: dragging ? "none" : "transform 220ms ease", willChange: "transform" }}
      >
        <NotificationAvatar name={a.from} src={a.avatar} letter={a._systemAvatar} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: "var(--text)", display: "flex", alignItems: "flex-start", gap: 6 }}>
            <span style={{ flexShrink: 0, marginTop: 2 }}>{notifIcon}</span>
            <span><strong>{a.from}</strong> {a.text}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{new Date(a.created_at).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function ActivityPanel({ authFetch, appliedBriefs, savedBriefs, bookingsForHub, weeklyLogins, loginStreak, setShowHamburger, showScreen, onStreakTap, onMarkAllRead, briefTitleById }: ActivityPanelProps) {
  const [hubTab, setHubTab] = useState<"notif" | "applied" | "saved" | "bookings" | "reports">("notif");
  const [myReports, setMyReports] = useState<any[] | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  // Bumped on every loadNotifications call, and stamped onto that call's own
  // closure as reqId — see the comment below for why.
  const notifReqIdRef = useRef(0);
  // Swipe-to-dismiss: only one row is draggable at a time. activeDragId carries
  // the id of the row currently being dragged so every other SwipeableNotification
  // short-circuits its handlers. pendingDeletionRef guards the backend call so a
  // notification is deleted exactly once (it also stays deleted on reload).
  const [activeDragId, setActiveDragId] = useState<any>(null);
  const pendingDeletionRef = useRef<Set<any>>(new Set());
  const removeNotification = useCallback((id: any) => {
    if (pendingDeletionRef.current.has(id)) return;
    pendingDeletionRef.current.add(id);
    setNotifications(prev => prev.filter(n => String(n.id) !== String(id)));
    if (authFetch) {
      authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-notification", id }) }).catch(() => {});
    }
  }, [authFetch]);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "match" | "message" | "booking" | "quest" | "brief" | "community">("all");
  const [notifOffset, setNotifOffset] = useState(0);
  const [notifHasMore, setNotifHasMore] = useState(true);
  // Robust brief lookup for the Applied/Saved tabs: fetch the real briefs once
  // so titles resolve from live data instead of showing a bare "Quest #<id>"
  // when briefTitleById (a precomputed map) doesn't happen to cover the id.
  const [briefTitleMap, setBriefTitleMap] = useState<Record<string, string>>(briefTitleById || {});
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/muse?type=briefs").then((r: any) => r.json()).then((d: any) => {
      if (cancelled) return;
      const map: Record<string, string> = { ...(briefTitleById || {}) };
      for (const b of (d.briefs || [])) { if (b?.id != null && (b.title || b.name)) map[String(b.id)] = b.title || b.name; }
      setBriefTitleMap(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [authFetch, briefTitleById]);

  useEffect(() => {
    if (hubTab === "reports" && myReports === null && authFetch) {
      authFetch("/api/muse?type=my-reports").then((r: any) => r.json()).then((d: any) => setMyReports(d.reports || [])).catch(() => setMyReports([]));
    }
  }, [hubTab, myReports, authFetch]);

  const loadNotifications = useCallback(async (append = false) => {
    if (!authFetch) return;
    // Ghost-notification bug: switching tabs fast (e.g. All -> Unread before
    // All's request finished) used to let the OLD, slower request's response
    // land AFTER the new one and unconditionally overwrite `notifications`
    // with the wrong tab's data — so "0 unread" could still show whatever
    // items "All" had just fetched, instead of the empty state. A loading-
    // flag guard here previously made it worse: it silently dropped the
    // NEW request while the old one was still in flight, so nothing ever
    // re-fetched for the tab actually being viewed. Stamping each call with
    // an incrementing id and only applying the result if it's still the
    // most recent one fixes both: stale responses are discarded, and every
    // tab switch always gets its own fetch.
    const reqId = ++notifReqIdRef.current;
    try {
      // "unread" is a read-state meta-filter, not a notification `type` — sending it as
      // type: "unread" (as this used to) filtered the query down to rows whose real
      // `type` column literally equals the string "unread" (none), which is why the
      // Unread tab silently returned an empty/different list from every other tab.
      // Only forward `type` for actual category filters (match/message/booking/etc).
      const isCategoryFilter = notifFilter !== "all" && notifFilter !== "unread";
      const res = await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-notifications", limit: 30, offset: append ? notifOffset : 0, unreadOnly: notifFilter === "unread", type: isCategoryFilter ? notifFilter : undefined }) });
      const data = await res.json();
      if (reqId !== notifReqIdRef.current) return; // superseded by a newer request — discard
      if (data.success) {
        const newNotifs = data.notifications || [];
        setNotifications(prev => append ? [...prev, ...newNotifs] : newNotifs);
        setNotifHasMore(newNotifs.length >= 30);
        if (!append) setNotifOffset(newNotifs.length);
        else setNotifOffset(prev => prev + newNotifs.length);
      } else {
        // Root cause of the "Load more" under an empty state bug: this
        // branch (API responded but data.success was false) used to leave
        // notifHasMore at its initial `true` forever. The render guard
        // above (notifications.length > 0) now masks it either way, but
        // fixing it here too keeps the state itself honest.
        setNotifHasMore(false);
      }
    } catch (e) {
      console.error("[ActivityPanel] loadNotifications failed:", e);
      setNotifHasMore(false);
    }
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
      // Audit fix (2026-09-08): this only cleared THIS panel's own,
      // separately-fetched `notifications` list — the bottom-nav bell badge
      // is driven by a different state (page.tsx's activityFeed, via
      // unreadCount/onOpenActivity), so tapping "Mark all read" here used to
      // leave the bell showing a stale nonzero count. Same underlying fact
      // ("do I have unread notifications"), two disconnected sources of
      // truth — the same class of bug already fixed for the bell's shape
      // (dot vs. pill) elsewhere in this app.
      onMarkAllRead?.();
    } catch {}
  };

  const clearAll = async () => {
    if (!authFetch) return;
    try {
      await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear-all-notifications" }) });
      setNotifications([]);
      onMarkAllRead?.();
    } catch {}
  };

  const tabBtn = (key: any, label: string) => (
    <div key={key} className={"conn-tab-sub" + (hubTab === key ? " active" : "")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHubTab(key); } }} onClick={() => setHubTab(key)} style={{ cursor: "pointer", fontSize: 11, padding: "5px 10px", flexShrink: 0 }}>{label}</div>
  );

  return (
    <>
      {/* Own header removed — "Your Activity" now renders in the hamburger panel's
          single top bar (centered next to its one back arrow) instead of duplicating
          a second header+back-button combo here, further down the scrolling body. */}
      <StreakWidget weeklyLogins={weeklyLogins} loginStreak={loginStreak} onTap={onStreakTap} />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, paddingTop: 10, marginBottom: 10, scrollbarWidth: "none" }}>
        {tabBtn("notif", "Notifications")}
        {tabBtn("applied", `Applied (${appliedBriefs.length})`)}
        {tabBtn("saved", `Saved (${savedBriefs.length})`)}
        {tabBtn("bookings", `Bookings (${(bookingsForHub?.asBooker || []).length + (bookingsForHub?.asHost || []).length})`)}
        {tabBtn("reports", "Reports")}
      </div>

      {hubTab === "notif" && (
        <>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, paddingTop: 10, marginBottom: 10, scrollbarWidth: "none" }}>
            {(["all", "unread", "match", "message", "booking", "quest", "brief", "community"] as const).map(f => (
              <div key={f} className={"conn-tab-sub" + (notifFilter === f ? " active" : "")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNotifFilter(f); } }} onClick={() => setNotifFilter(f)} style={{ cursor: "pointer", fontSize: 10, padding: "4px 10px", flexShrink: 0, textTransform: "capitalize" }}>{f}</div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>{notifications.filter(n => !n.read).length} unread</div>
            <div style={{ display: "flex", gap: 12 }}>
              {notifications.some(n => !n.read) && <button onClick={markAllRead} style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>}
              {notifications.length > 0 && <button onClick={clearAll} style={{ fontSize: 11, color: "#ff8a80", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Clear all</button>}
            </div>
          </div>
          {notifications.length === 0
            ? <EmptyState icon="🔔" title="No notifications yet" sub="Likes, matches, bookings and activity will appear here." />
            : notifications.map(a => {
                const typeIcons: Record<string, React.ReactNode> = {
                  like: <FiHeart size={16} color="#FF69B4" />,
                  match: <FiStar size={16} color="#FFD700" />,
                  message: <FiMessageCircle size={16} color="#7B68EE" />,
                  booking: <FiBriefcase size={16} color="#00E676" />,
                  quest: <FiZap size={16} color="#FFA500" />,
                  brief: <FiPackage size={16} color="#87CEEB" />,
                  community: <FiUsers size={16} color="#D4A5FF" />,
                };
                const notifIcon = typeIcons[a.type] || <FiBell size={16} color="var(--gold)" />;
                return (
                  <SwipeableNotification key={a.id} a={a} notifIcon={notifIcon} activeDragId={activeDragId} setActiveDragId={setActiveDragId} onRemove={removeNotification} />
                );
              })}
          {/* Audit fix (2026-09-08): notifHasMore starts true and is only
              flipped to false once a fetch actually resolves — if that
              fetch errors (network hiccup, auth not ready yet) the catch
              block below leaves it true forever, so "Load more" could sit
              directly under the "No notifications yet" empty state,
              offering to load more of a list that's empty. Gating on an
              actual loaded item removes the contradiction regardless of
              why the fetch didn't complete. */}
          {notifHasMore && notifications.length > 0 && (
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
              <div key={`${id}-${i}`} style={{ padding: "12px 14px", background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Audit fix (2026-09-08): appliedBriefs/savedBriefs are
                    just id arrays, so this used to always fall back to a
                    generic "Quest #<id>" — never the brief's real title
                    shown everywhere else in the app (Collab card, etc.).
                    Look the real title up by id first; keep the old
                    heuristic only as a last-resort fallback for an id this
                    session's brief lists don't happen to cover. */}
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "center" }}>{briefTitleMap?.[String(id)] || (typeof id === "string" && /\s/.test(id) ? id : "Quest #" + id)}</span>
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
          <div key={x.id} style={{ padding: "10px 12px", background: "var(--card-bg)", borderRadius: 12, marginBottom: 8 }}>
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
          : myReports.map((r: any) => {
            const status = r.status || "open";
            const statusMeta: Record<string, { label: string; color: string }> = {
              open: { label: "Under review", color: "#ffd166" },
              actioned: { label: "Action taken", color: "#7ee2a0" },
              dismissed: { label: "Reviewed — no action needed", color: "var(--muted)" },
            };
            const meta = statusMeta[status] || statusMeta.open;
            return (
              <div key={r.id} style={{ padding: "10px 12px", background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border-subtle)", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ fontWeight: 700, textTransform: "capitalize", color: "#ff8a80" }}>{String(r.target_type).replace("_", " ")}</span>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>{r.reason}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                </div>
                {r.resolution_note && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{r.resolution_note}</div>}
              </div>
            );
          }))}
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
  setShowBlockedUsers?: (v: boolean) => void;
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
  onMarkAllRead?: () => void;
  briefTitleById?: Record<string, string>;
  unreadCount?: number;
  activityFeed?: {id:number;from:string;avatar:string;text:string;time:string;read:boolean}[];
  getReferralTier?: (count: number) => { tier: string; perks: string; discount?: number; nextThreshold?: number | null };
}

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
  setShowBlockedUsers,
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
  onMarkAllRead,
  briefTitleById,
  unreadCount,
  activityFeed = [],
  liveProfessionals,
  getReferralTier,
}: MenuModalProps) {
  const [mounted, setMounted] = useState(showHamburger);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Muse Pro banner sheen: used to be a plain CSS `infinite` loop sweeping
  // every 2.8s on a fixed metronome. Torreé asked for it ~30% less frequent
  // and irregular rather than a steady beat, so this drives it with a
  // randomized timer instead — each sweep is a one-shot animation
  // (triggered by adding a class), and the *next* one is scheduled only
  // after this one finishes, with a random wait. 2.8s was the old interval;
  // averaging ~4s here (2.8-5.2s, randomized) is ~30% less often, and never
  // lands on the same beat twice.
  const [proShineOn, setProShineOn] = useState(false);
  useEffect(() => {
    if (proShineOn) return;
    const delay = 3600 + Math.random() * 5200;
    const t = setTimeout(() => setProShineOn(true), delay);
    return () => clearTimeout(t);
  }, [proShineOn]);

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
            {/* Numeric pill (was a bare dot) to match the bottom nav's Menu
                badge (Nav.tsx) — audit finding ig-2: the two unread-count
                indicators in the app used different shapes (dot vs. pill)
                for the same underlying unreadCount, which reads as an
                inconsistent visual language for "you have unread items". */}
            {unreadCount ? <span className="hamburger-bell-dot">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
          </button>
        )}
        {!hamburgerScreen && <div className="hamburger-menu-title" style={{ display: "none" }}>Menu</div>}
        {hamburgerScreen === "activity" && (
          <div className="hamburger-menu-title" style={{ display: "none" }}>Activity</div>
        )}
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
                // Audit fix (2026-09-08): "profile"/"settings" used to open older,
                // separate inline tabs here (setHamburgerScreen) instead of the
                // full-page ProfileScreen.tsx/SettingsScreen.tsx that every other
                // menu item already routes to. The full pages are a strict superset
                // of what the inline tabs had (SettingsScreen gained Discovery
                // Preferences + Show Distance/Online toggles in the prior audit
                // commit specifically to close that gap) and are already reachable
                // today via "Edit Profile"/other indirect taps — this just makes the
                // primary Menu entry point consistent with Sessions/Network/Community.
                setShowHamburger(false);
                showScreen(item.key as any);
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
            <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: "linear-gradient(135deg, rgba(212,165,255,0.10) 0%, rgba(255,105,180,0.10) 100%)", border: "1px solid rgba(212,165,255,0.18)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                {loginStreak > 0 && <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>🔥 {loginStreak} day streak</div>}
                {questClaimables > 0 && <div style={{ fontSize: 11, color: "#FF69B4", fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(255,105,180,0.1)", border: "1px solid rgba(255,105,180,0.2)" }}>{questClaimables} reward{questClaimables > 1 ? "s" : ""} ready</div>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>Your Quests</div>
              {topQuests.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>Complete challenges to earn rewards — streaks, likes, bookings and more.</div>
              ) : topQuests.map(q => {
                const pct = Math.round((q.progress / q.target) * 100);
                return (
                  <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{q.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--border-subtle)", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: q.color, transition: "width .4s" }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: q.color, minWidth: 24, textAlign: "right" }}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 10, textAlign: "right" }}>
                <button style={{ fontSize: 11, color: "#D4A5FF", fontWeight: 600, cursor: "pointer", background: "none", border: "none", padding: 0 }} onClick={() => { setShowHamburger(false); setShowQuests?.(true); }}>View all →</button>
              </div>
            </div>
            <button className="muse-pro-banner" onClick={() => { setShowHamburger(false); showScreen("subscription"); }} tabIndex={0} aria-label="Muse Pro">
              <div className={"muse-pro-banner-shine" + (proShineOn ? " shine-play" : "")} onAnimationEnd={() => setProShineOn(false)} />
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
            {hamburgerScreen === "activity" && (
              <div className="conn-scroll">
                <ActivityPanel authFetch={authFetch} appliedBriefs={appliedBriefs} savedBriefs={savedBriefs} bookingsForHub={bookingsForHub} weeklyLogins={weeklyLogins} loginStreak={loginStreak} setShowHamburger={setShowHamburger} showScreen={showScreen} onStreakTap={() => { setShowHamburger(false); setShowQuests?.(true); }} onMarkAllRead={onMarkAllRead} briefTitleById={briefTitleById} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default MenuModal;

