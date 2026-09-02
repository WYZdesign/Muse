"use client";

import React, { memo, useState, useEffect, useCallback } from "react";
import { FiArrowLeft, FiCamera, FiClock } from "react-icons/fi";
import { ensureDeviceTiltActive, getDeviceTilt } from "../hooks/useDeviceTilt";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";
import { getPostShareUrl } from "@/lib/urls";

export interface BtsScreenProps {
  screen: Screen;
  stories: any[];
  setStories: React.Dispatch<React.SetStateAction<any[]>>;
  showScreen: (s: Screen) => void;
  openHamburger: () => void;
  unreadNotificationCount: number;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  setShowStory: (idx: number) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  currentUser?: { name: string; avatar: string } | null;
  uploadImage?: (file: File) => Promise<string>;
  uid?: string;
}

type FilterTab = "All" | "Photos" | "Videos" | "Trending" | "New" | "Liked";

function formatCountdown(ms: number): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

const FILTER_TABS: FilterTab[] = ["All", "Photos", "Videos", "Trending", "New", "Liked"];

export const BtsScreen = memo(function BtsScreen({
  screen,
  stories,
  setStories,
  showScreen,
  openHamburger,
  unreadNotificationCount,
  showToast,
  setShowStory,
  handleImgError,
  apiFetch,
  currentUser,
  uploadImage,
  uid,
}: BtsScreenProps) {
  const [revealedNsfw, setRevealedNsfw] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [windowEnd, setWindowEnd] = useState(() => Date.now() + 24 * 60 * 60 * 1000);

  useEffect(() => {
    if (screen !== "bts") return;
    ensureDeviceTiltActive();
    let raf = 0;
    const tick = () => {
      const { x, y } = getDeviceTilt();
      document.querySelectorAll<HTMLElement>(".bts-photo-wrap").forEach((el) => {
        const img = el.querySelector(".bts-photo") as HTMLElement | null;
        el.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
        if (img) img.style.transform = `perspective(800px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg) translate(${-x * 15}px, ${-y * 15}px) scale(1.12)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  useEffect(() => {
    const id = setInterval(() => {
      setWindowEnd((prev) => {
        if (Date.now() >= prev) return Date.now() + 24 * 60 * 60 * 1000;
        return prev;
      });
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const remaining = formatCountdown(Math.max(0, windowEnd - Date.now()));

  const toggleNsfw = useCallback((id: string) => {
    setRevealedNsfw((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLike = useCallback(
    (s: any) => {
      const newLiked = !s.liked;
      setStories((prev) =>
        prev.map((item) =>
          item.id === s.id
            ? { ...item, liked: newLiked, likes: (item.likes || 0) + (newLiked ? 1 : -1) }
            : item
        )
      );
      // The 5 hardcoded fallback moments (ids 501-505, shown whenever a user
      // has zero real moments) are numeric ids, never rows in muse_moments.
      // Same bug/fix as Feed's seed posts: server would 404 and revert.
      if (typeof s.id === "number") return;
      apiFetch("/api/muse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like-moment", momentId: s.id, liked: newLiked }),
      }).then((r: any) => { if (!r.ok) throw new Error("failed"); }).catch(() => {
        setStories((prev) =>
          prev.map((item) =>
            item.id === s.id
              ? { ...item, liked: !newLiked, likes: (item.likes || 0) + (newLiked ? -1 : 1) }
              : item
          )
        );
        showToast("Failed to update like");
      });
    },
    [apiFetch, setStories, showToast]
  );

  const handleShare = useCallback(
    (s: any) => {
      const url = getPostShareUrl(s.id);
      if (navigator.share) {
        navigator.share({ title: "Muse BTS", text: "Check out this BTS moment on Muse", url }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(url);
        showToast("Moment link copied!");
      }
    },
    [showToast]
  );

  const trendingCutoff = (() => {
    const scores = stories.map((s) => (s.likes || 0) + (s.comments || 0)).sort((a, b) => b - a);
    if (!scores.length) return Infinity;
    return scores[Math.floor(scores.length / 3)] ?? scores[scores.length - 1];
  })();

  const filteredStories = stories.filter((s) => {
    if (activeFilter === "Photos") return !s.video;
    if (activeFilter === "Videos") return !!s.video;
    if (activeFilter === "Trending") return (s.likes || 0) + (s.comments || 0) >= trendingCutoff;
    if (activeFilter === "New") return Date.now() - (s.ts || 0) < 24 * 60 * 60 * 1000;
    if (activeFilter === "Liked") return !!s.liked;
    return true;
  });

  const handleSnap = useCallback(() => {
    showScreen("connections");
    showToast("Share your moment from the Feed composer!");
  }, [showScreen, showToast]);

  const headerGradient = "linear-gradient(135deg, #FF1493 0%, #FF69B4 50%, #FFD700 100%)";
  const pinkGradient = "linear-gradient(135deg, #FF1493 0%, #FF69B4 60%, #FFB6C1 100%)";
  const activePill = "linear-gradient(135deg, #FF1493, #FF69B4)";

  const gridCardStyle: React.CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" };

  return (
    <div className={"screen-el" + (screen === "bts" ? " active" : "")}>
      {/* Header */}
      <div
        style={{
          background: headerGradient,
          padding: "calc(14px + env(safe-area-inset-top,0px)) 18px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <button
          className="chat-back"
          onClick={() => showScreen("discover")}
          style={{
            background: "linear-gradient(135deg,#FF69B4,#fff)",
            border: "none",
            borderRadius: 10,
            color: "#0a0612",
          }}
          aria-label="Back"
        >
          <FiArrowLeft size={20} />
        </button>

          <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 2,
            color: "#fff",
            textShadow: "0 2px 10px rgba(0,0,0,0.35)",
          }}
        >
          BTS
        </div>

        <div style={{ width: 34, height: 34 }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 80 }}>
        {/* BeReal dual-capture prompt */}
        <div
          style={{
            margin: "14px 14px 0",
            background: pinkGradient,
            borderRadius: 16,
            padding: "18px 16px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.12 }}>
            <FiCamera size={100} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiCamera size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Time to Post</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                Dual camera: main + selfie - expires in {remaining.hours}h {remaining.minutes}m
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              background: "rgba(0,0,0,0.15)",
              borderRadius: 10,
              padding: "8px 12px",
            }}
          >
            <FiClock size={14} color="rgba(255,255,255,0.8)" />
            <strong>Window closes in {remaining.hours}h {remaining.minutes}m</strong>
          </div>

          <button
            onClick={handleSnap}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: "#fff",
              color: "#FF1493",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <FiCamera size={16} />
                Snap Moment
          </button>
        </div>

        {/* Stories row */}
        {stories.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "16px 14px 8px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {stories.slice(0, 10).map((s, i) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => setShowStory(i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowStory(i); } }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    padding: 3,
                    background: s.liked
                      ? "linear-gradient(135deg, #FF1493, #FFD700, #FF69B4)"
                      : "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
                  }}
                >
                  <img
                    loading="lazy"
                    src={s.img || s.avatar}
                    alt="Photo"
                    onError={handleImgError}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid var(--bg, #0a0612)",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--muted, #999)",
                    maxWidth: 64,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  {s.author?.split(" ")[0] || "..."}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 14px 4px",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {FILTER_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveFilter(t)}
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: activeFilter === t ? activePill : "rgba(255,255,255,0.08)",
                color: activeFilter === t ? "#fff" : "var(--muted, #999)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div
          className="moments-feed"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            padding: "12px 14px",
          }}
        >
          {filteredStories.map((s) => {
            const isRevealed = revealedNsfw.has(String(s.id));
            const isNsfw = s.nsfw && !isRevealed;

            return (
              <div
                key={s.id}
                style={{
                  ...gridCardStyle,
                  background: "var(--card, rgba(255,255,255,0.05))",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* User header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 12px 0",
                  }}
                >
                  <img
                    loading="lazy"
                    src={s.avatar}
                    alt="Avatar"
                    onError={handleImgError}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text, #fff)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.author}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted, #999)" }}>
                      {typeof s.ts === "number" ? timeAgo(s.ts) : s.time || "now"}
                    </div>
                  </div>
                </div>

                {/* Image area */}
                <div className="bts-photo-wrap" style={{ position: "relative", marginTop: 8, maxWidth: "100%", overflow: "hidden" }}>
                  <img
                    loading="lazy"
                    src={s.img || s.avatar}
                    alt="Photo"
                    className="bts-photo"
                    onError={handleImgError}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      display: "block",
                      filter: isNsfw ? "blur(26px) brightness(0.7)" : "none",
                      transition: "filter 0.3s",
                    }}
                  />

                  {/* Time badge overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(0,0,0,0.55)",
                      borderRadius: 8,
                      padding: "3px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <FiClock size={10} />
                    {typeof s.ts === "number" ? timeAgo(s.ts) : s.time || "now"}
                  </div>

                  {/* NSFW blur overlay */}
                  {isNsfw && (
                    <button
                      onClick={() => toggleNsfw(String(s.id))}
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 5,
                        background: "rgba(10,6,18,0.45)",
                        border: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#FF8A80" }}>18+</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 0.03 }}>
                        NSFW content
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Tap to reveal</div>
                    </button>
                  )}
                </div>

                {/* Caption */}
                <div style={{ padding: "10px 12px 0" }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text, #eee)",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {s.text || "A creative moment captured."}
                  </div>
                </div>

                {/* Reaction pills */}
                {(s.likes > 0 || s.comments > 0) && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      padding: "8px 12px 0",
                      flexWrap: "wrap",
                    }}
                  >
                    {s.likes > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          background: "rgba(255,20,147,0.15)",
                          color: "#FF69B4",
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontWeight: 600,
                        }}
                      >
                        {s.likes} {s.likes === 1 ? "like" : "likes"}
                      </span>
                    )}
                    {s.comments > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          background: "rgba(255,215,0,0.15)",
                          color: "#FFD700",
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontWeight: 600,
                        }}
                      >
                        {s.comments} {s.comments === 1 ? "comment" : "comments"}
                      </span>
                    )}
                  </div>
                )}

                {/* Action row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px 12px",
                    gap: 4,
                  }}
                >
                  <button
                    onClick={() => handleLike(s)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "7px 0",
                      borderRadius: 10,
                      border: "none",
                      background: s.liked ? "rgba(255,20,147,0.15)" : "rgba(255,255,255,0.06)",
                      color: s.liked ? "#FF69B4" : "var(--muted, #999)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    {s.liked ? "\u2665" : "\u2661"} {s.likes || 0}
                  </button>
                  <button
                    onClick={() => {
                      showScreen("connections");
                      showToast("Open feed to comment");
                    }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "7px 0",
                      borderRadius: 10,
                      border: "none",
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--muted, #999)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {"\u270E"} {s.comments || 0}
                  </button>
                  <button
                    onClick={() => handleShare(s)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "7px 0",
                      borderRadius: 10,
                      border: "none",
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--muted, #999)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {"\u2197"} Share
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {filteredStories.length === 0 && (
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "rgba(255,20,147,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiCamera size={32} color="rgba(255,20,147,0.4)" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text, #fff)" }}>
                No moments yet
              </div>
              <div style={{ fontSize: 12, color: "var(--muted, #999)", textAlign: "center", maxWidth: 240 }}>
                Snap a behind-the-scenes moment to light up this feed
              </div>
              <button
                onClick={handleSnap}
                style={{
                  marginTop: 8,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: pinkGradient,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FiCamera size={14} />
            Snap Moment
              </button>
            </div>
          )}
        </div>
      </div>

      <Nav active="bts" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default BtsScreen;