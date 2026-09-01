"use client";

import React, { useState, useMemo, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { createSpatialScene } from "../hooks/useDeviceTilt";
import {
  FiArrowLeft,
  FiShare2,
  FiMapPin,
  FiBriefcase,
  FiStar,
  FiFlag,
  FiMessageCircle,
  FiChevronDown,
  FiChevronUp,
  FiUserPlus,
  FiSearch,
  FiTarget,
  FiZap,
  FiArrowUpRight,
  FiDollarSign,
} from "react-icons/fi";
import type { Screen, Match } from "../components/types";
import { PROFESSIONALS, FORUM_POSTS } from "../components/types";
import { BADGE_COLORS } from "../components/badgeColors";
import { viewerSide } from "@/lib/role";
import { MUSE_CLOSED_BETA_HIDE_SOCIAL } from "@/lib/config";
import Nav from "../components/Nav";

export interface NetworkScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  showNsfw: boolean;
  openHamburger: () => void;
  unreadNotificationCount: number;
  matches: Match[];
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  setViewProfile: (p: any) => void;
  currentUser: any;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  openChat: (m: any) => void;
  liveForum: any[] | null;
  setLiveForum?: React.Dispatch<React.SetStateAction<any[] | null>>;
  showNewPost: boolean;
  setShowNewPost: (v: boolean) => void;
  newPostTitle: string;
  setNewPostTitle: (v: string) => void;
  newPostBody: string;
  setNewPostBody: (v: string) => void;
  setForumPosts: React.Dispatch<React.SetStateAction<any[]>>;
  forumSort: "hot" | "new" | "top";
  setForumSort: (s: "hot" | "new" | "top") => void;
  forumCategory: string;
  uid: () => any;
  setShowReport?: (v: boolean) => void;
  setReportTarget?: (t: any) => void;
  liveProfessionals: any[] | null;
  /** One-shot request to switch the internal pros/forum tab (e.g. so the
   *  Forum tutorial can be started from anywhere and land on the right
   *  tab). Not a controlled value — the user's own taps on the tab pills
   *  still just use local state after this fires once. */
  openTab?: "pros" | "forum";
}

const SKILL_COLORS = [
  { bg: "rgba(212,165,255,0.18)", border: "rgba(212,165,255,0.35)", color: "#e6d3ff" },
  { bg: "rgba(100,181,246,0.18)", border: "rgba(100,181,246,0.35)", color: "#90caf9" },
  { bg: "rgba(0,188,212,0.18)", border: "rgba(0,188,212,0.35)", color: "#4dd0e1" },
  { bg: "rgba(255,215,0,0.18)", border: "rgba(255,215,0,0.35)", color: "#ffd54f" },
  { bg: "rgba(129,199,132,0.18)", border: "rgba(129,199,132,0.35)", color: "#a5d6a7" },
  { bg: "rgba(255,138,128,0.18)", border: "rgba(255,138,128,0.35)", color: "#ffab91" },
];

function getSkillColor(i: number) {
  return SKILL_COLORS[i % SKILL_COLORS.length];
}

function generateBio(exp: string, skills: string[]): string {
  const years = parseInt(exp, 10) || 0;
  const main = skills[0] || "creative work";
  if (years >= 10)
    return `A seasoned professional with ${years}+ years in ${main}. Deep expertise across ${skills.join(", ")}. Passionate about pushing creative boundaries.`;
  if (years >= 5)
    return `Experienced in ${main} with ${years} years of hands-on work. Skilled in ${skills.join(", ")}. Always looking for the next challenge.`;
  return `Rising talent in ${main} with ${years} years of practice. Exploring ${skills.join(", ")} and eager to collaborate.`;
}

export const NetworkScreen = memo(function NetworkScreen({
  screen,
  showScreen,
  showNsfw,
  openHamburger,
  unreadNotificationCount,
  matches,
  apiFetch,
  showToast,
  setViewProfile,
  currentUser,
  handleImgError,
  openChat,
  liveForum,
  setLiveForum,
  showNewPost,
  setShowNewPost,
  newPostTitle,
  setNewPostTitle,
  newPostBody,
  setNewPostBody,
  setForumPosts,
  forumSort,
  setForumSort,
  forumCategory,
  uid,
  setShowReport = () => {},
  setReportTarget = () => {},
  liveProfessionals,
  openTab,
}: NetworkScreenProps) {
  const [netTab, setNetTab] = useState<"pros" | "forum">("pros");
  // Session 55 closed beta: Forum is built but deferred, so ignore any
  // deep-link/tutorial request to open it while the flag is on — otherwise
  // a stale FeatureTour link etc. could land a user on a tab with no
  // visible way back to it.
  useEffect(() => { if (openTab && !(MUSE_CLOSED_BETA_HIDE_SOCIAL && openTab === "forum")) setNetTab(openTab); }, [openTab]);

  useEffect(() => {
    if (screen !== "connections" && screen !== "community") return;
    return createSpatialScene(
      ".pro-card",
      ".pro-card img",
      ".pro-card .pro-card-content",
      { imgShift: 6, imgRotate: 8, infoShift: 8, containerShift: 4, scale: 1.06 }
    );
  }, [screen]);
  const [proDetail, setProDetail] = useState<any | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<number>>(new Set());
  const [connectLoading, setConnectLoading] = useState<number | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [votedPosts, setVotedPosts] = useState<Record<number, "up" | "down" | null>>({});
  const [proExp, setProExp] = useState<"all" | "rising" | "established" | "veteran">("all");
  const [proSort, setProSort] = useState<"match" | "expDesc" | "expAsc" | "rateDesc" | "rateAsc" | "openings">("match");
  const [proHiringOnly, setProHiringOnly] = useState(false);
  const [proSearch, setProSearch] = useState("");
  const [forumSearch, setForumSearch] = useState("");
  const [forumSearchOpen, setForumSearchOpen] = useState(false);
  const [proSkill, setProSkill] = useState<string[]>([]);
  const [proRateBand, setProRateBand] = useState<"all" | "tfp" | "50to100" | "100to150" | "gt150">("all");
  const [proLooking, setProLooking] = useState<string>("all");
  const [proSearchServer, setProSearchServer] = useState("");
  const [proServerResults, setProServerResults] = useState<any[]>([]);
  const [forumSearchServer, setForumSearchServer] = useState("");
  const [forumServerResults, setForumServerResults] = useState<any[]>([]);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [threadSort, setThreadSort] = useState<"best" | "new">("best");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [commentVotes, setCommentVotes] = useState<Record<string, "up" | "down" | null>>({});
  const [filterSections, setFilterSections] = useState<Record<string, boolean>>({ experience: false, sort: false, rate: false, skills: false, looking: false });
  const iAmIndustry = viewerSide(currentUser?.type) === "industry";

  const parseYrs = (e: string) => parseInt(e, 10) || 0;
  const parseRate = (r?: string) => parseInt(String(r || "").replace(/[^0-9]/g, ""), 10) || 0;
  const expBand = (e: string): "rising" | "established" | "veteran" => {
    const y = parseYrs(e);
    return y >= 12 ? "veteran" : y >= 8 ? "established" : "rising";
  };

  const proList = (() => {
    // If server search has results, use those
    if (proSearchServer.trim().length >= 2 && proServerResults.length > 0) {
      return proServerResults.filter((p: any) => showNsfw || !p.nsfw);
    }
    let list = (liveProfessionals?.length ? liveProfessionals : PROFESSIONALS).filter((p) => showNsfw || !p.nsfw);
    if (proExp !== "all") list = list.filter((p) => expBand(p.exp) === proExp);
    if (proHiringOnly) list = list.filter((p) => p.openings > 0);
    const q = proSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.skills.some((s: string) => s.toLowerCase().includes(q)) ||
          (p.looking || []).some((l: string) => l.toLowerCase().includes(q))
      );
    }
    if (proSkill.length) list = list.filter((p) => proSkill.every((s) => p.skills.includes(s)));
    if (proRateBand !== "all") {
      list = list.filter((p) => {
        const r = parseRate(p.rate);
        if (proRateBand === "tfp") return /tfp/i.test(String(p.rate || ""));
        if (proRateBand === "50to100") return r >= 50 && r < 100;
        if (proRateBand === "100to150") return r >= 100 && r <= 150;
        return r > 150;
      });
    }
    if (proLooking !== "all") list = list.filter((p) => (p.looking || []).some((l: string) => l === proLooking));
    const arr = [...list];
    if (proSort === "expDesc") arr.sort((a, b) => parseYrs(b.exp) - parseYrs(a.exp));
    else if (proSort === "expAsc") arr.sort((a, b) => parseYrs(a.exp) - parseYrs(b.exp));
    else if (proSort === "rateDesc") arr.sort((a, b) => parseRate(b.rate) - parseRate(a.rate));
    else if (proSort === "rateAsc") arr.sort((a, b) => parseRate(a.rate) - parseRate(b.rate));
    else if (proSort === "openings") arr.sort((a, b) => b.openings - a.openings);
    return arr;
  })();

  const filteredForum = useMemo(() => {
    return [...(liveForum?.length ? liveForum : FORUM_POSTS)]
      .filter((p) => forumCategory === "all" || p.cat === forumCategory)
      .sort((a, b) =>
        forumSort === "top"
          ? b.votes + b.comments.length * 2 - (a.votes + a.comments.length * 2)
          : forumSort === "new"
            ? b.id - a.id
            : b.votes * 2 + b.comments.length - (a.votes * 2 + a.comments.length)
      );
  }, [liveForum, forumCategory, forumSort]);

  // Server-side search for professionals
  const handleProSearch = async (value: string) => {
    setProSearchServer(value);
    if (value.trim().length >= 2) {
      try {
        const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", query: value, type: "users", limit: 50 }) });
        const data = await res.json();
        if (data.success) setProServerResults(data.results.users || []);
      } catch { setProServerResults([]); }
    } else {
      setProServerResults([]);
    }
  };

  // Server-side search for forum
  const handleForumSearch = async (value: string) => {
    setForumSearchServer(value);
    if (value.trim().length >= 2) {
      try {
        const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", query: value, type: "communities", limit: 20 }) });
        const data = await res.json();
        if (data.success) setForumServerResults(data.results.communities || []);
      } catch { setForumServerResults([]); }
    } else {
      setForumServerResults([]);
    }
  };

  function openProProfile(p: any) {
    setProDetail(p);
  }

  function handleConnect(p: any) {
    if (connectedIds.has(p.id)) return;
    setConnectLoading(p.id);
    // muse_professionals rows aren't keyed by muse_profiles.id — the connect
    // action needs the real profile id, resolved server-side as `profileId`.
    const targetId = p.profileId || p.id;
    apiFetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", targetId }),
    })
      .then((r: any) => {
        if (!r.ok) throw new Error("failed");
        setConnectedIds((prev) => {
          const n = new Set(prev);
          n.add(p.id);
          return n;
        });
        showToast(`Request sent \u2014 ${p.name} will be notified`);
      })
      .catch(() => {
        // Was masking every failure with the same success toast.
        showToast(`Couldn't send request \u2014 try again`);
      })
      .finally(() => setConnectLoading(null));
  }

  function handleShare(p: any) {
    const text = `Check out ${p.name} \u2014 ${p.type} on Muse`;
    if (navigator.share) {
      navigator.share({ title: p.name, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard")).catch(() => {});
    }
  }

  function handlePostShare(post: any) {
    const text = `${post.title} \u2014 by ${post.author} on Muse Forum`;
    if (navigator.share) {
      navigator.share({ title: post.title, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard")).catch(() => {});
    }
  }

  function handleVote(postId: number, direction: "up" | "down") {
    const current = votedPosts[postId];
    setVotedPosts((prev) => ({ ...prev, [postId]: current === direction ? null : direction }));
    const applyDelta = (p: any) => {
      if (p.id !== postId) return p;
      let delta = 0;
      if (direction === "up") {
        if (current === "up") delta = -1;
        else if (current === "down") delta = 2;
        else delta = 1;
      } else {
        if (current === "down") delta = 1;
        else if (current === "up") delta = -2;
        else delta = -1;
      }
      return { ...p, votes: p.votes + delta };
    };
    // liveForum, not forumPosts, is what's rendered. When liveForum is null/empty,
    // filteredForum falls back to the static FORUM_POSTS import — so mapping only
    // over `prev` was a no-op and the fallback's vote count never moved (arrow
    // highlighted via votedPosts, count frozen). Seed liveForum from FORUM_POSTS
    // on first interaction so the rendered copy updates.
    setLiveForum?.((prev) => (prev && prev.length ? prev.map(applyDelta) : FORUM_POSTS.map(applyDelta)));
    setForumPosts((prev) => prev.map(applyDelta));
    if (typeof postId === "number" && !liveForum?.length) return;
    apiFetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forum", type: "vote", postId, direction }),
    }).catch(() => {});
  }

  const threadPost =
    threadId != null ? filteredForum.find((p) => p.id === threadId) || null : null;

  function addComment(postId: number) {
    const text = (commentTexts[postId] || "").trim();
    if (!text) return;
    const newComment = { author: currentUser.name || "You", text };
    const addC = (p: any) => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p);
    const removeC = (p: any) => (p.id === postId ? { ...p, comments: p.comments.filter((c: any) => c !== newComment) } : p);
    // Same fallback-seeding fix as handleVote — without it, replying to a seed post
    // showed "Comment added" but the comment never appeared.
    setLiveForum?.((prev) => (prev && prev.length ? prev.map(addC) : FORUM_POSTS.map(addC)));
    setForumPosts((prev) => prev.map(addC));
    setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
    if (typeof postId === "number" && !liveForum?.length) { showToast("Comment added"); return; }
    apiFetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forum", type: "reply", postId, text }),
    }).then((r: any) => {
      if (!r.ok) throw new Error("failed");
      showToast("Comment added");
    }).catch(() => {
      setLiveForum?.((prev) => (prev && prev.length ? prev.map(removeC) : prev));
      setForumPosts((prev) => prev.map(removeC));
      showToast("Failed to post comment");
    });
  }

  return (
    <div className={"screen-el" + (screen === "network" ? " active" : "")}>
      <div
        className="hdr"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px`,
        }}
      >
        <button className="chat-back" onClick={() => showScreen("discover")}>
          <FiArrowLeft size={20} />
        </button>
        <div
          className="logo-link"
          style={{
            fontSize: 30,
            backgroundImage: "linear-gradient(90deg,#1E90FF,#87CEEE,#B0C4DE,#1E90FF,#ADD8E6,#1E90FF)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            position: "relative",
            fontFamily: "'Playfair Display',serif",
            fontStyle: "italic",
            fontWeight: 900,
            lineHeight: "1",
            padding: "0 0.18em",
            display: "inline-block",
            margin: 0,
            animation: "lavaFlow 7s ease-in-out infinite,logoShimmer 4s ease-in-out infinite"
          }}
        >
          Network
        </div>
        <div style={{ width: 42 }} />
      </div>

      {!MUSE_CLOSED_BETA_HIDE_SOCIAL && (
      <div className="conn-tabs" style={{ padding: "0 16px" }}>
        {(["pros", "forum"] as const).map((t) => (
          <div
            key={t}
            role="tab"
            tabIndex={0}
            aria-selected={netTab === t}
            className={"conn-tab" + (netTab === t ? " active" : "")}
            onClick={() => setNetTab(t)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNetTab(t); } }}
          >
            {t === "pros" ? "Professionals" : "Forum"}
          </div>
        ))}
      </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 16px 80px" }}>
        {netTab === "pros" && (
          <>
            <div style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              {iAmIndustry
                ? "Your industry peers — network, co-hire, and trade talent across markets."
                : "Industry professionals who can book, pay, and launch your career."}
            </div>
            <input
              className="inp"
              placeholder="Search pros — name, craft, skills, who they're looking for…"
              value={proSearch}
              onChange={(e) => setProSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleProSearch(e.currentTarget.value); }}
              style={{ margin: "0 0 10px", fontSize: 13 }}
            />
            {/* Filter bubbles row - horizontally scrollable */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", paddingBottom: 2 }}>
              {([
                { key: "experience", label: "Experience", active: proExp !== "all" },
                { key: "sort", label: "Sort", active: proSort !== "match" },
                { key: "rate", label: "Rate", active: proRateBand !== "all" },
                { key: "skills", label: "Skills", active: proSkill.length > 0 },
                { key: "looking", label: "Looking", active: proLooking !== "all" },
              ]).map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterSections(s => ({ ...s, [f.key]: !s[f.key] }))}
                  style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: f.active ? "#0a0612" : "var(--text)", background: f.active ? "linear-gradient(135deg,var(--gold),var(--amber))" : "rgba(255,255,255,0.06)", border: f.active ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 99, padding: "6px 14px", transition: "all .2s", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {f.label}{f.active ? " ✓" : ""}
                </button>
              ))}
              <span
                role="tab"
                aria-selected={proHiringOnly}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setProHiringOnly(!proHiringOnly); } }}
                onClick={() => setProHiringOnly(!proHiringOnly)}
                style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: proHiringOnly ? "#0a0612" : "var(--text)", background: proHiringOnly ? "#4cdd88" : "rgba(255,255,255,0.06)", border: proHiringOnly ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 99, padding: "6px 14px", transition: "all .2s", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Hiring{proHiringOnly ? " ✓" : ""}
              </span>
            </div>
            {/* Expanded filter panels — single-line horizontal scroll, color-coded per category */}
            {filterSections.experience && (
              <div className="filter-scroll-row" style={{ marginBottom: 10 }}>
                {([
                  { k: "all", label: "All levels", color: "var(--muted)", accent: "rgba(255,255,255,0.1)" },
                  { k: "rising", label: "Rising", color: "#90caf9", accent: "rgba(144,202,249,0.3)" },
                  { k: "established", label: "Established", color: "#FFD700", accent: "rgba(255,215,0,0.3)" },
                  { k: "veteran", label: "Veteran", color: "#e6d3ff", accent: "rgba(230,211,255,0.3)" },
                ] as const).map((b) => (
                  <button type="button" key={b.k} role="tab" aria-selected={proExp === b.k} tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setProExp(b.k); } }}
                    onClick={() => setProExp(b.k)}
                    style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proExp === b.k ? "#0a0612" : b.color, background: proExp === b.k ? b.accent : "rgba(255,255,255,0.06)", border: proExp === b.k ? `1.5px solid ${b.accent}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "6px 14px", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}
                  >{b.label}</button>
                ))}
              </div>
            )}
            {filterSections.sort && (
              <div className="filter-scroll-row" style={{ marginBottom: 10 }}>
                {([
                  { k: "match", label: "Featured", color: "#FFD700", accent: "rgba(255,215,0,0.25)" },
                  { k: "expDesc", label: "Most exp", color: "#90caf9", accent: "rgba(144,202,249,0.25)" },
                  { k: "expAsc", label: "Least exp", color: "#81D4FA", accent: "rgba(129,212,250,0.25)" },
                  { k: "rateDesc", label: "Rate ↓", color: "#e6d3ff", accent: "rgba(230,211,255,0.25)" },
                  { k: "rateAsc", label: "Rate ↑", color: "#CE93D8", accent: "rgba(206,147,216,0.25)" },
                  { k: "openings", label: "Most openings", color: "#4cdd88", accent: "rgba(76,221,136,0.25)" },
                ] as const).map((b) => (
                  <button type="button" key={b.k}
                    onClick={() => setProSort(b.k)}
                    style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proSort === b.k ? "#0a0612" : b.color, background: proSort === b.k ? b.accent : "rgba(255,255,255,0.06)", border: proSort === b.k ? `1.5px solid ${b.accent}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "6px 14px", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}
                  >{b.label}</button>
                ))}
              </div>
            )}
            {filterSections.rate && (
              <div className="filter-scroll-row" style={{ marginBottom: 10 }}>
                {([
                  { k: "all", label: "Any rate", color: "var(--muted)", accent: "rgba(255,255,255,0.1)" },
                  { k: "tfp", label: "TFP", color: "#90caf9", accent: "rgba(144,202,249,0.3)" },
                  { k: "50to100", label: "$50-100", color: "#4cdd88", accent: "rgba(76,221,136,0.3)" },
                  { k: "100to150", label: "$100-150", color: "#FFD700", accent: "rgba(255,215,0,0.3)" },
                  { k: "gt150", label: "$150+", color: "#e6d3ff", accent: "rgba(230,211,255,0.3)" },
                ] as const).map((b) => (
                  <button type="button" key={b.k}
                    onClick={() => setProRateBand(b.k)}
                    style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proRateBand === b.k ? "#0a0612" : b.color, background: proRateBand === b.k ? b.accent : "rgba(255,255,255,0.06)", border: proRateBand === b.k ? `1.5px solid ${b.accent}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "6px 14px", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}
                  >{b.label}</button>
                ))}
              </div>
            )}
            {(() => {
              const proSource = liveProfessionals?.length ? liveProfessionals : PROFESSIONALS;
              const allSkills = [...new Set(proSource.flatMap((p) => p.skills))];
              const allLooking = [...new Set(proSource.flatMap((p) => p.looking || []))];
              return (
                <>
                {filterSections.skills && (
                  <div className="filter-scroll-row" style={{ marginBottom: 10 }}>
                    <button type="button" aria-pressed={!proSkill.length} onClick={() => setProSkill([])}
                      className="filter-chip" style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: !proSkill.length ? "#0a0612" : "#FF69B4", background: !proSkill.length ? "rgba(255,105,180,0.3)" : "rgba(255,255,255,0.06)", border: !proSkill.length ? "1.5px solid rgba(255,105,180,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "6px 14px", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}>All skills</button>
                    {allSkills.map((s) => (
                      <button key={s} type="button" aria-pressed={proSkill.includes(s)}
                        onClick={() => setProSkill(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                        style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proSkill.includes(s) ? "#0a0612" : "#FF69B4", background: proSkill.includes(s) ? "rgba(255,105,180,0.3)" : "rgba(255,255,255,0.06)", border: proSkill.includes(s) ? "1.5px solid rgba(255,105,180,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "6px 14px", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}>{s}</button>
                    ))}
                  </div>
                )}
                {filterSections.looking && allLooking.length > 0 && (
                  <div className="filter-scroll-row" style={{ marginBottom: 10 }}>
                    <button type="button" onClick={() => setProLooking("all")}
                      style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proLooking === "all" ? "#0a0612" : "#20B2AA", background: proLooking === "all" ? "rgba(32,178,170,0.25)" : "rgba(255,255,255,0.06)", border: proLooking === "all" ? "1.5px solid rgba(32,178,170,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "6px 14px", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}>Anyone</button>
                    {allLooking.map((l) => (
                      <button key={l} type="button" onClick={() => setProLooking(l)}
                        style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proLooking === l ? "#0a0612" : "#20B2AA", background: proLooking === l ? "rgba(32,178,170,0.25)" : "rgba(255,255,255,0.06)", border: proLooking === l ? "1.5px solid rgba(32,178,170,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "6px 14px", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}>{l}</button>
                    ))}
                  </div>
                )}
                </>
              );
            })()}
            {proList.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center", gap: 12 }}>
                <div style={{ fontSize: 36 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No professionals match those filters</div>
                <div style={{ fontSize: 13, color: "var(--text2)", maxWidth: 280 }}>Try clearing filters or adjust your search — new pros join weekly.</div>
              </div>
            )}
            {proList.map((p) => (
            <div
              key={p.id}
              className="pro-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProProfile(p); } }}
              onClick={() => openProProfile(p)}
              style={{
                marginBottom: 14,
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                height: 570,
              }}
            >
              <img
                loading="lazy"
                src={p.img}
                alt={p.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={handleImgError}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top,rgba(10,6,18,0.88) 0%,rgba(10,6,18,0.25) 55%,rgba(10,6,18,0.1) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#fff",
                    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--gold)",
                    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  <FiBriefcase size={13} /> {p.type}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <FiMapPin size={13} /> {p.loc}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "4px 12px",
                      borderRadius: 99,
                      background: "rgba(255,215,0,0.22)",
                      border: "1px solid rgba(255,215,0,0.4)",
                      color: "var(--gold)",
                      fontWeight: 700,
                    }}
                  >
                    {p.exp}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "4px 12px",
                      borderRadius: 99,
                      background: "rgba(135,206,235,0.2)",
                      border: "1px solid rgba(135,206,235,0.35)",
                      color: "#b7e4f7",
                      fontWeight: 700,
                    }}
                  >
                    {p.openings} openings
                  </span>
                  {p.rate && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "4px 12px",
                        borderRadius: 99,
                        background: "rgba(76,221,136,0.15)",
                        border: "1px solid rgba(76,221,136,0.35)",
                        color: "#4cdd88",
                        fontWeight: 700,
                      }}
                    >
                      {p.rate}
                    </span>
                  )}
                </div>
                {(p.looking || []).length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
                    <FiUserPlus size={12} style={{ color: "var(--lavender)" }} />
                    <span>Seeking:</span>
                    {p.looking.map((l: string) => (
                      <span key={l} style={{ padding: "2px 8px", borderRadius: 99, background: "rgba(212,165,255,0.14)", border: "1px solid rgba(212,165,255,0.3)", color: "#e6d3ff", fontWeight: 600 }}>{l}</span>
                    ))}
                  </div>
                )}
                {/* BADGES ROW */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {(() => {
                    const badges: { icon: string; label: string; c: string; bg: string; bd: string }[] = [];
                    const yrs = parseInt(p.exp, 10) || 0;
                    if (yrs >= 10) badges.push({ icon: "🏅", label: "Pro", ...BADGE_COLORS.gold });
                    else if (yrs >= 5) badges.push({ icon: "⭐", label: "Experienced", ...BADGE_COLORS.lavender });
                    else badges.push({ icon: "🌱", label: "Rising", ...BADGE_COLORS.blue });
                    if (p.openings >= 5) badges.push({ icon: "🔥", label: "Hiring", ...BADGE_COLORS.red });
                    if (p.skills?.includes("Fashion") || p.skills?.includes("Editorial")) badges.push({ icon: "👗", label: "Fashion", ...BADGE_COLORS.lavender });
                    if (p.skills?.includes("Commercial") || p.skills?.includes("Branding")) badges.push({ icon: "💼", label: "Commercial", ...BADGE_COLORS.gold });
                    if (p.skills?.includes("Music Video") || p.skills?.includes("Film")) badges.push({ icon: "🎬", label: "Film", ...BADGE_COLORS.red });
                    if (p.skills?.includes("Fine Art") || p.skills?.includes("Body Art")) badges.push({ icon: "🎨", label: "Fine Art", ...BADGE_COLORS.lavender });
                    if (p.skills?.includes("Experimental")) badges.push({ icon: "🧪", label: "Experimental", ...BADGE_COLORS.blue });
                    if (p.skills?.includes("Photography") || p.skills?.includes("Editorial")) badges.push({ icon: "📸", label: "Photo", ...BADGE_COLORS.blue });
                    return badges.slice(0, 5).map((b) => (
                      <span key={b.label} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 99, background: b.bg, border: `1px solid ${b.bd}`, color: b.c, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                        {b.icon} {b.label}
                      </span>
                    ));
                  })()}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.6)",
                    marginTop: 4,
                  }}
                >
                  Tap to see details ›
                </div>
              </div>
            </div>
          ))}
          </>
        )}

        {netTab === "forum" && (
          <>
            {showNewPost && (
              <div className="modal-overlay" style={{ position: "fixed", zIndex: 400 }}>
                <div className="modal-header">
                  <button className="modal-back" onClick={() => setShowNewPost(false)}>
                    <FiArrowLeft size={20} />
                  </button>
                  <div className="modal-title">New Post</div>
                  <button className="modal-close" onClick={() => setShowNewPost(false)} aria-label="Close">
                    {"\u2715"}
                  </button>
                </div>
                <div
                  className="modal-body"
                  style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
                >
                  <input
                    className="inp"
                    placeholder="Title"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <textarea
                    className="inp"
                    placeholder="What's on your mind?"
                    rows={4}
                    value={newPostBody}
                    onChange={(e) => setNewPostBody(e.target.value)}
                    style={{ marginBottom: 10, resize: "none" }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-gold"
                      style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12 }}
                      onClick={async () => {
                        if (!newPostTitle.trim()) return;
                        const title = newPostTitle.trim();
                        const body = newPostBody.trim();
                        try {
                          const r = await apiFetch("/api/muse", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "forum", title, body, userId: currentUser.id }),
                          });
                          if (!r.ok) {
                            const d = await r.json().catch(() => ({} as any));
                            showToast(d.code === "SAFETY_BLOCK" ? "Post blocked by safety policy" : "Failed to post");
                            return;
                          }
                          apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-quest", action_keys: ["forum_post"] }) }).catch(() => {});
                          // Create response doesn't echo the new row's real id —
                          // re-fetch so filteredForum renders it and votes/comments
                          // on it can match.
                          try {
                            const rf = await apiFetch("/api/muse?type=forum");
                            const df = await rf.json();
                            if (df.posts) setLiveForum?.(df.posts);
                          } catch {}
                          setForumPosts((prev) => [
                            {
                              id: uid(),
                              title,
                              body,
                              author: currentUser.name,
                              avatar: currentUser.avatar,
                              votes: 1,
                              comments: [],
                              cat: "General",
                              time: "Just now",
                              pinned: false,
                            },
                            ...prev,
                          ]);
                          setNewPostTitle("");
                          setNewPostBody("");
                          setShowNewPost(false);
                          showToast("Posted!");
                        } catch {
                          showToast("Failed to post");
                        }
                      }}
                    >
                      Post
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12 }}
                      onClick={() => setShowNewPost(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "0 20px 10px", flexWrap: "nowrap" }}>
              {!forumSearchOpen && (
                <>
                  {(["hot", "new", "top"] as const).map((s) => (
                    <div
                      key={s}
                      role="tab"
                      aria-selected={forumSort === s}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setForumSort(s); } }}
                      className={"conn-tab-sub" + (forumSort === s ? " active" : "")}
                      onClick={() => setForumSort(s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </div>
                  ))}
                </>
              )}
              {forumSearchOpen && (
                <input
                  className="inp"
                  placeholder="Search the forum…"
                  value={forumSearch}
                  onChange={(e) => setForumSearch(e.target.value)}
                  onBlur={() => { if (!forumSearch.trim()) setForumSearchOpen(false); }}
                  autoFocus
                  style={{ flex: 1, fontSize: 13, margin: 0 }}
                />
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <FiSearch
                  size={18}
                  style={{ cursor: "pointer", color: forumSearchOpen ? "var(--gold)" : "var(--muted)", flexShrink: 0 }}
                  onClick={() => {
                    if (forumSearchOpen) {
                      if (!forumSearch.trim()) setForumSearch("");
                      setForumSearchOpen(false);
                    } else {
                      setForumSearchOpen(true);
                    }
                  }}
                />
                <button
                  className="conn-btn conn-btn-primary"
                  style={{ fontSize: 12, padding: "6px 14px" }}
                  onClick={() => setShowNewPost(!showNewPost)}
                >
                  + Post
                </button>
              </div>
            </div>
            {filteredForum
              .filter((post) => {
                const q = forumSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  post.title.toLowerCase().includes(q) ||
                  post.body.toLowerCase().includes(q) ||
                  post.author.toLowerCase().includes(q)
                );
              })
              .map((post) => (
              <div
                key={post.id}
                className="conn-card"
                style={{ flexDirection: "column", marginBottom: 8, padding: 14 }}
              >
                {post.pinned && (
                  <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 4 }}>
                    {"\uD83D\uDCCC"} Pinned
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 36 }}>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: votedPosts[post.id] === "up" ? "#FFD700" : "var(--muted)",
                        cursor: "pointer",
                        fontSize: 18,
                        padding: 0,
                        transition: "color 0.2s",
                      }}
                      onClick={() => handleVote(post.id, "up")}
                    >
                      {"\u25B2"}
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{post.votes}</span>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: votedPosts[post.id] === "down" ? "#ff6b6b" : "var(--muted)",
                        cursor: "pointer",
                        fontSize: 18,
                        padding: 0,
                        transition: "color 0.2s",
                      }}
                      onClick={() => handleVote(post.id, "down")}
                    >
                      {"\u25BC"}
                    </button>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      role="button"
                      tabIndex={0}
                      style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4, cursor: "pointer" }}
                      onClick={() => { setThreadId(post.id); setReplyTo(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setThreadId(post.id); setReplyTo(null); } }}
                    >
                      {post.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>
                      {post.author} · {post.time}
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4, cursor: "pointer" }}
                      onClick={() => { setThreadId(post.id); setReplyTo(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setThreadId(post.id); setReplyTo(null); } }}
                    >
                      {post.body.slice(0, 120)}
                      {post.body.length > 120 ? "..." : ""}
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text2)",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setExpandedPostId((prev) => (prev === post.id ? null : post.id))
                        }
                      >
                        <FiMessageCircle size={13} />
                        {post.comments.length} {post.comments.length === 1 ? "reply" : "replies"}
                        {expandedPostId === post.id ? (
                          <FiChevronUp size={12} />
                        ) : (
                          <FiChevronDown size={12} />
                        )}
                      </button>
                      <button
                        style={{
                          background: "none",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text2)",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                          padding: "3px 10px",
                          borderRadius: 99,
                        }}
                        onClick={() => handlePostShare(post)}
                      >
                        <FiShare2 size={12} /> Share
                      </button>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff6b6b",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={() => { setReportTarget({ id: post.id, type: "forum_post", name: post.author }); setShowReport(true); }}
                      >
                        <FiFlag size={12} /> Report
                      </button>
                    </div>

                    {expandedPostId === post.id && (
                      <div
                        style={{
                          marginTop: 10,
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          paddingTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {post.comments.length === 0 && (
                          <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
                            No comments yet. Be the first to reply.
                          </div>
                        )}
                        {post.comments.map((c: any, i: number) => (
                          <div
                            key={i}
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              borderRadius: 10,
                              padding: "8px 12px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--text2)",
                                marginBottom: 2,
                              }}
                            >
                              {c.author}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>
                              {c.text}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                          <input
                            className="inp"
                            placeholder="Write a reply..."
                            value={commentTexts[post.id] || ""}
                            onChange={(e) =>
                              setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addComment(post.id);
                            }}
                            style={{ width: "100%", fontSize: 12, padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "var(--text)" }}
                          />
                          <button
                            className="btn btn-gold"
                            style={{
                              width: "100%",
                              padding: "10px 0",
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 10,
                            }}
                            onClick={() => addComment(post.id)}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ─── THREAD DETAIL (Reddit-style) ─── */}
        {threadPost && createPortal(
          <div className="modal-overlay" style={{ position: "fixed", zIndex: 500 }}>
            <div className="modal-header">
              <button className="modal-back" onClick={() => { setThreadId(null); setReplyTo(null); }}>
                <FiArrowLeft size={20} />
              </button>
              <div className="modal-title">Thread</div>
              <button className="modal-close" onClick={() => { setThreadId(null); setReplyTo(null); }} aria-label="Close">{"\u2715"}</button>
            </div>
            <div className="modal-body">
              {/* FULL POST */}
              <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 40, paddingTop: 2 }}>
                  <button
                    style={{ background: "none", border: "none", color: votedPosts[threadPost.id] === "up" ? "#FFD700" : "var(--muted)", cursor: "pointer", fontSize: 20, padding: 0 }}
                    onClick={() => handleVote(threadPost.id, "up")}
                  >
                    ▲
                  </button>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{threadPost.votes}</span>
                  <button
                    style={{ background: "none", border: "none", color: votedPosts[threadPost.id] === "down" ? "#ff6b6b" : "var(--muted)", cursor: "pointer", fontSize: 20, padding: 0 }}
                    onClick={() => handleVote(threadPost.id, "down")}
                  >
                    ▼
                  </button>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {threadPost.cat && (
                    <span style={{ display: "inline-block", fontSize: 10, padding: "3px 10px", borderRadius: 99, background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.25)", color: "var(--gold)", fontWeight: 700, marginBottom: 8 }}>{threadPost.cat}</span>
                  )}
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1.3, marginBottom: 6 }}>{threadPost.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10 }}>{threadPost.author} · {threadPost.time}</div>
                  <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{threadPost.body}</div>
                  <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                    <button style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 12, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }} onClick={() => handlePostShare(threadPost)}>
                      <FiShare2 size={13} /> Share
                    </button>
                    <button style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: 12, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }} onClick={() => { setReportTarget({ id: threadPost.id, type: "forum_post", name: threadPost.author }); setShowReport(true); }}>
                      <FiFlag size={13} /> Report
                    </button>
                  </div>
                </div>
              </div>

              {/* COMMENTS */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{threadPost.comments.length} {threadPost.comments.length === 1 ? "comment" : "comments"}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["best", "new"] as const).map((s) => (
                    <div key={s} role="tab" aria-selected={threadSort === s} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setThreadSort(s); } }} className={"conn-tab-sub" + (threadSort === s ? " active" : "")} onClick={() => setThreadSort(s)} style={{ cursor: "pointer", fontSize: 11, padding: "4px 10px" }}>
                      {s === "best" ? "Best" : "New"}
                    </div>
                  ))}
                </div>
              </div>

              {(threadSort === "new" ? [...threadPost.comments].reverse() : threadPost.comments).map((c: any, i: number) => {
                const key = `${threadPost.id}:${threadSort === "new" ? threadPost.comments.length - 1 - i : i}`;
                const cv = commentVotes[key];
                return (
                  <div key={key} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),var(--lavender))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#0a0612" }}>
                        {(c.author || "?").charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)" }}>{c.author}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                        <button style={{ background: "none", border: "none", color: cv === "up" ? "#FFD700" : "var(--muted)", cursor: "pointer", fontSize: 12, padding: 0 }} onClick={() => setCommentVotes((p) => ({ ...p, [key]: p[key] === "up" ? null : "up" }))}>▲</button>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{cv === "up" ? 2 : cv === "down" ? 0 : 1}</span>
                        <button style={{ background: "none", border: "none", color: cv === "down" ? "#ff6b6b" : "var(--muted)", cursor: "pointer", fontSize: 12, padding: 0 }} onClick={() => setCommentVotes((p) => ({ ...p, [key]: p[key] === "down" ? null : "down" }))}>▼</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, marginBottom: 6 }}>{c.text}</div>
                    <button
                      style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}
                      onClick={() => {
                        setReplyTo(c.author);
                        setCommentTexts((prev) => ({ ...prev, [threadPost.id]: prev[threadPost.id] || `@${c.author} ` }));
                      }}
                    >
                      Reply
                    </button>
                  </div>
                );
              })}
              {threadPost.comments.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 12, fontStyle: "italic" }}>
                  No comments yet — start the conversation.
                </div>
              )}

              {/* COMPOSER */}
              <div style={{ marginTop: 14 }}>
                {replyTo && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, padding: "6px 10px", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--gold)" }}>Replying to @{replyTo}</span>
                    <button style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 12 }} onClick={() => setReplyTo(null)}>✕</button>
                  </div>
                )}
                <input
                  className="inp"
                  placeholder="Add a comment…"
                  value={commentTexts[threadPost.id] || ""}
                  onChange={(e) => setCommentTexts((prev) => ({ ...prev, [threadPost.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") addComment(threadPost.id); }}
                  style={{ width: "100%", fontSize: 13, padding: "10px 12px", marginBottom: 8 }}
                />
                <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 10 }} onClick={() => addComment(threadPost.id)}>
                  Comment
                </button>
              </div>
            </div>
          </div>, document.body)
        }
      </div>
      {proDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            overflowY: "auto",
          }}
          role="presentation"
          aria-hidden="true"
          onClick={() => setProDetail(null)}
        >
          <div
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 480,
              marginTop: "env(safe-area-inset-top, 0px)",
              background: "linear-gradient(135deg,#0d0520,#1a0a2e,#0d0520)",
              borderRadius: "0 0 24px 24px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => setProDetail(null)}
              style={{
                position: "absolute",
                top: "calc(48px + env(safe-area-inset-top, 0px))",
                right: 16,
                zIndex: 10,
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 99,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              {"\u2715"}
            </button>

            <div style={{ position: "relative", height: 420, flexShrink: 0 }}>
              <img
                src={proDetail.img}
                alt={proDetail.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={handleImgError}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top,rgba(13,5,32,1) 0%,rgba(13,5,32,0.7) 40%,rgba(13,5,32,0.2) 70%,transparent 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 24,
                  right: 24,
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: 6,
                    textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                  }}
                >
                  {proDetail.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--gold)",
                    marginBottom: 4,
                  }}
                >
                  <FiBriefcase size={14} /> {proDetail.type}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <FiMapPin size={13} /> {proDetail.loc}
                </div>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 24px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.75)",
                  lineHeight: 1.6,
                }}
              >
                {generateBio(proDetail.exp, proDetail.skills || [])}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "var(--muted)",
                    marginBottom: 8,
                  }}
                >
                  Skills
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(proDetail.skills || []).map((s: string, i: number) => {
                    const sc = getSkillColor(i);
                    return (
                      <span
                        key={s}
                        style={{
                          fontSize: 12,
                          padding: "5px 14px",
                          borderRadius: 99,
                          background: sc.bg,
                          border: `1px solid ${sc.border}`,
                          color: sc.color,
                          fontWeight: 600,
                        }}
                      >
                        {s}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* BADGES SECTION IN DETAIL MODAL */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 8 }}>
                  Badges
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(() => {
                    const badges: { icon: string; label: string; color: string; bg: string; border: string }[] = [];
                    const yrs = parseInt(proDetail.exp, 10) || 0;
                    if (yrs >= 10) badges.push({ icon: "🏅", label: "Pro", color: "#FFD700", bg: "rgba(255,215,0,0.15)", border: "rgba(255,215,0,0.3)" });
                    else if (yrs >= 5) badges.push({ icon: "⭐", label: "Experienced", color: "#FFBF00", bg: "rgba(255,191,0,0.12)", border: "rgba(255,191,0,0.25)" });
                    else badges.push({ icon: "🌱", label: "Rising", color: "#A5D6A7", bg: "rgba(165,214,167,0.12)", border: "rgba(165,214,167,0.25)" });
                    if (proDetail.openings >= 5) badges.push({ icon: "🔥", label: "Hiring", color: "#FF6B6B", bg: "rgba(255,107,107,0.12)", border: "rgba(255,107,107,0.25)" });
                    if (proDetail.skills?.includes("Fashion") || proDetail.skills?.includes("Editorial")) badges.push({ icon: "👗", label: "Fashion", color: "#F48FB1", bg: "rgba(244,143,177,0.12)", border: "rgba(244,143,177,0.25)" });
                    if (proDetail.skills?.includes("Commercial") || proDetail.skills?.includes("Branding")) badges.push({ icon: "💼", label: "Commercial", color: "#FFCC80", bg: "rgba(255,204,128,0.12)", border: "rgba(255,204,128,0.25)" });
                    if (proDetail.skills?.includes("Music Video") || proDetail.skills?.includes("Film")) badges.push({ icon: "🎬", label: "Film", color: "#EF9A9A", bg: "rgba(239,154,154,0.12)", border: "rgba(239,154,154,0.25)" });
                    if (proDetail.skills?.includes("Fine Art") || proDetail.skills?.includes("Body Art")) badges.push({ icon: "🎨", label: "Fine Art", color: "#CE93D8", bg: "rgba(206,147,216,0.12)", border: "rgba(206,147,216,0.25)" });
                    if (proDetail.skills?.includes("Experimental")) badges.push({ icon: "🧪", label: "Experimental", color: "#80DEEA", bg: "rgba(128,222,234,0.12)", border: "rgba(128,222,234,0.25)" });
                    if (proDetail.skills?.includes("Photography") || proDetail.skills?.includes("Editorial")) badges.push({ icon: "📸", label: "Photo", color: "#90CAF9", bg: "rgba(144,202,249,0.12)", border: "rgba(144,202,249,0.25)" });
                    if (connectedIds.has(proDetail.id)) badges.push({ icon: "🤝", label: "Connected", color: "#81C784", bg: "rgba(129,199,132,0.12)", border: "rgba(129,199,132,0.25)" });
                    return badges.map((b) => (
                      <span key={b.label} style={{ fontSize: 11, padding: "4px 11px", borderRadius: 99, background: b.bg, border: `1px solid ${b.border}`, color: b.color, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        {b.icon} {b.label}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>
                    {proDetail.exp}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text2)" }}>Experience</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>
                    {proDetail.openings}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text2)" }}>Openings</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>
                    {connectedIds.has(proDetail.id) ? 1 : 0}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text2)" }}>Connected</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    disabled={connectedIds.has(proDetail.id) || connectLoading === proDetail.id}
                    style={{
                      flex: 1,
                      padding: "14px 0",
                      fontSize: 14,
                      fontWeight: 700,
                      borderRadius: 12,
                      border: "none",
                      cursor: connectedIds.has(proDetail.id) || connectLoading === proDetail.id ? "default" : "pointer",
                      background: connectedIds.has(proDetail.id)
                        ? "rgba(255,255,255,0.08)"
                        : "linear-gradient(135deg,var(--coral),var(--gold))",
                      color: connectedIds.has(proDetail.id) ? "var(--text2)" : "#fff",
                      opacity: connectLoading === proDetail.id ? 0.7 : 1,
                      transition: "all 0.3s",
                    }}
                    onClick={() => handleConnect(proDetail)}
                  >
                    {connectedIds.has(proDetail.id)
                      ? "\u2713 Requested"
                      : connectLoading === proDetail.id
                        ? "Sending..."
                        : iAmIndustry
                          ? "Network"
                          : "Connect"}
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: "14px 0",
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 12,
                      border: "1px solid rgba(0,188,212,0.3)",
                      background: "transparent",
                      color: "#00BCD4",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      // Was a dead-end stub — never actually opened a conversation.
                      openChat({ id: proDetail.profileId || proDetail.id, name: proDetail.name, type: proDetail.type || "Creative", img: proDetail.img, messages: [] });
                      setProDetail(null);
                    }}
                  >
                    Message
                  </button>
                </div>
                <button
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "var(--text2)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                  onClick={() => handleShare(proDetail)}
                >
                  <FiShare2 size={14} /> Share Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Nav active="network" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default NetworkScreen;
