/** Network screen: industry professionals directory and forum tabs with thread and pro detail modals. */
"use client";

import React, { useState, useMemo, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { createSpatialScene } from "../hooks/useDeviceTilt";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { FiArrowLeft } from "react-icons/fi";
import type { Screen, Match, Professional } from "../components/types";
import { PROFESSIONALS, FORUM_POSTS } from "../components/types";
import { toProfessionalRow } from "../components/professionalSearch";
import { BadgeInfoModal, type BadgeInfo } from "../components/badgeInfo";
import { viewerSide } from "@/lib/role";
import { MUSE_CLOSED_BETA_HIDE_SOCIAL } from "@/lib/config";
import Nav from "../components/Nav"; import type { CurrentUser, ViewProfile, NetworkForumPost, ThreadReply, ThreadReplyNode, ChatLaunchTarget } from "../page-models";
import { NetworkProsTab, type ProExp, type ProSort, type ProRateBand } from "../components/NetworkProsTab";
import { NetworkForumTab } from "../components/NetworkForumTab";
import { NetworkThreadModal } from "../components/NetworkThreadModal";
import { NetworkProDetailModal } from "../components/NetworkProDetailModal";
import { isPaidTier } from "../components/subscriptionTiers";

export interface NetworkScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  goBack?: () => void;
  showNsfw: boolean;
  openHamburger: () => void;
  unreadNotificationCount: number;
  matches: Match[];
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  setUpsell?: (v: { feature: string; reason: string; icon?: string } | null) => void;
  setViewProfile: (p: ViewProfile | null) => void;
  currentUser: CurrentUser;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  openChat(m: ChatLaunchTarget): void;
  liveForum: NetworkForumPost[] | null;
  setLiveForum?: React.Dispatch<React.SetStateAction<NetworkForumPost[] | null>>;
  showNewPost: boolean;
  setShowNewPost: (v: boolean) => void;
  newPostTitle: string;
  setNewPostTitle: (v: string) => void;
  newPostBody: string;
  setNewPostBody: (v: string) => void;
  setForumPosts: React.Dispatch<React.SetStateAction<NetworkForumPost[]>>;
  forumSort: "hot" | "new" | "top";
  setForumSort: (s: "hot" | "new" | "top") => void;
  forumCategory: string;
  uid: () => number;
  setShowReport?: (v: boolean) => void;
  setReportTarget?: (t: { id: number | string; type: string; name: string }) => void;
  liveProfessionals: Professional[] | null;
  /** One-shot request to switch the internal pros/forum tab (e.g. so the
   *  Forum tutorial can be started from anywhere and land on the right
   *  tab). Not a controlled value — the user's own taps on the tab pills
   *  still just use local state after this fires once. */
  openTab?: "pros" | "forum";
  savedProfileIds?: (string | number)[];
  setSavedProfileIds?: React.Dispatch<React.SetStateAction<(string | number)[]>>;
  demo?: boolean;
  /** Fires whenever the internal pros/forum tab changes, so page.tsx can
   *  show the Forum's own first-visit tutorial the first time someone
   *  opens that tab (Forum isn't a top-level `screen`, so it can't be
   *  caught the same way the other per-screen tutorials are). */
  onTabChange?: (tab: "pros" | "forum") => void;
}

export const NetworkScreen = memo(function NetworkScreen({
  screen,
  showScreen,
  goBack,
  showNsfw,
  openHamburger,
  unreadNotificationCount,
  matches: _matches,
  apiFetch,
  showToast,
  setUpsell,
  setViewProfile: _setViewProfile,
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
  savedProfileIds = [],
  setSavedProfileIds = () => {},
  demo = false,
  onTabChange,
}: NetworkScreenProps) {
  // Save/bookmark toggle — same client+server pattern as Briefs' savedBriefs.
  const toggleSaveProfessional = (id: string | number) => {
    const isSaved = savedProfileIds.includes(id);
    const next = isSaved ? savedProfileIds.filter(x => x !== id) : [...savedProfileIds, id];
    setSavedProfileIds(next);
    showToast(demo ? (isSaved ? "Removed from this demo session" : "Saved for this demo session") : (isSaved ? "Unsaved" : "Saved!"));
    if (demo) return;
    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { savedProfileIds: next } }) }).catch(() => showToast(isSaved ? "Couldn't unsave — try again" : "Couldn't save — try again"));
  };
  const [netTab, setNetTab] = useState<"pros" | "forum">("pros");
  // Session 55 closed beta: Forum is built but deferred, so ignore any
  // deep-link/tutorial request to open it while the flag is on — otherwise
  // a stale FeatureTour link etc. could land a user on a tab with no
  // visible way back to it.
  useEffect(() => { if (openTab && !(MUSE_CLOSED_BETA_HIDE_SOCIAL && openTab === "forum")) setNetTab(openTab); }, [openTab]);

  // Let page.tsx know when Forum is actually opened, so it can trigger the
  // Forum tutorial the first time — Forum lives as a tab here, not as its
  // own top-level `screen`.
  useEffect(() => { if (netTab === "forum") onTabChange?.("forum"); }, [netTab, onTabChange]);

  useEffect(() => {
    if (screen !== "connections" && screen !== "community") return;
    return createSpatialScene(
      ".pro-card",
      ".pro-card img",
      ".pro-card .pro-card-content",
      { imgShift: 15, imgRotate: 18, infoShift: 15, containerShift: 8, scale: 1.12 }
    );
  }, [screen]);
  const [proDetail, setProDetail] = useState<Professional | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<number>>(new Set());
  const [connectLoading, setConnectLoading] = useState<number | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [votedPosts, setVotedPosts] = useState<Record<number, "up" | "down" | null>>({});
  const [proExp, setProExp] = useState<ProExp>("all");
  const [proSort, setProSort] = useState<ProSort>("match");
  const [proHiringOnly, setProHiringOnly] = useState(false);
  const [proSearch, setProSearch] = useState("");
  const [forumSearch, setForumSearch] = useState("");
  const [forumSearchOpen, setForumSearchOpen] = useState(false);

  const [proSkill, setProSkill] = useState<string[]>([]);
  const [proRateBand, setProRateBand] = useState<ProRateBand>("all");
  const [proLooking, setProLooking] = useState<string>("all");
  const [proSearchServer, setProSearchServer] = useState("");
  const [proServerResults, setProServerResults] = useState<Professional[]>([]);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [threadSort, setThreadSort] = useState<"best" | "new">("best");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [commentVotes, setCommentVotes] = useState<Record<string, "up" | "down" | null>>({});
  // Real, DB-backed replies for the open thread (nested via parentReplyId); falls back to a post's inline `comments` for demo/seed posts.
  const [threadReplies, setThreadReplies] = useState<Record<string, ThreadReply[]>>({});
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
  const [filterSections, setFilterSections] = useState<Record<string, boolean>>({ experience: false, sort: false, rate: false, skills: false, looking: false });
  const iAmIndustry = viewerSide(currentUser?.type) === "industry";
  const proFiltersLocked = !isPaidTier(currentUser?.tier); // advanced talent filters are Musa Pro

  const parseYrs = (e: string) => parseInt(e, 10) || 0;
  const parseRate = (r?: string) => parseInt(String(r || "").replace(/[^0-9]/g, ""), 10) || 0;
  const expBand = (e: string): "rising" | "established" | "veteran" => {
    const y = parseYrs(e);
    return y >= 12 ? "veteran" : y >= 8 ? "established" : "rising";
  };

  const proList = (() => {
    // If server search has results, use those
    if (proSearchServer.trim().length >= 2 && proServerResults.length > 0) {
      return proServerResults.filter((p) => showNsfw || !p.nsfw);
    }
    let list: Professional[] = (liveProfessionals?.length ? liveProfessionals : (demo ? PROFESSIONALS : [])).filter((p) => showNsfw || !p.nsfw);
    if (!proFiltersLocked && proExp !== "all") list = list.filter((p) => expBand(p.exp) === proExp);
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
    if (!proFiltersLocked && proSkill.length) list = list.filter((p) => proSkill.every((s) => p.skills.includes(s)));
    if (!proFiltersLocked && proRateBand !== "all") {
      list = list.filter((p) => {
        const r = parseRate(p.rate);
        if (proRateBand === "tfp") return /tfp/i.test(String(p.rate || ""));
        if (proRateBand === "50to100") return r >= 50 && r < 100;
        if (proRateBand === "100to150") return r >= 100 && r <= 150;
        return r > 150;
      });
    }
    if (!proFiltersLocked && proLooking !== "all") list = list.filter((p) => (p.looking || []).some((l: string) => l === proLooking));
    const arr = [...list]; if (proFiltersLocked) return arr;
    if (proSort === "expDesc") arr.sort((a, b) => parseYrs(b.exp) - parseYrs(a.exp));
    else if (proSort === "expAsc") arr.sort((a, b) => parseYrs(a.exp) - parseYrs(b.exp));
    else if (proSort === "rateDesc") arr.sort((a, b) => parseRate(b.rate) - parseRate(a.rate));
    else if (proSort === "rateAsc") arr.sort((a, b) => parseRate(a.rate) - parseRate(b.rate));
    else if (proSort === "openings") arr.sort((a, b) => b.openings - a.openings);
    return arr;
  })();

  const { allSkills, allLooking } = useMemo(() => {
    const proSource = liveProfessionals?.length ? liveProfessionals : PROFESSIONALS;
    return {
      allSkills: [...new Set(proSource.flatMap((p) => p.skills))],
      allLooking: [...new Set(proSource.flatMap((p) => p.looking || []))],
    };
  }, [liveProfessionals]);

  const filteredForum = useMemo(() => {
    return [...(liveForum?.length ? liveForum : (demo ? FORUM_POSTS : []))]
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
    if (demo) { setProServerResults([]); return; }
    if (value.trim().length >= 2) {
      try {
        const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", query: value, type: "users", limit: 50 }) });
        const data: { success?: boolean; results: { users?: unknown[] } } = await res.json();
        if (data.success) {
          // Audit fix (2026-10-07): search returns muse_profiles rows (avatar, styles,
          // no exp/openings/rate) but this directory is built for the muse_professionals shape.
          setProServerResults((data.results.users || []).map(toProfessionalRow));
        }
      } catch { setProServerResults([]); }
    } else {
      setProServerResults([]);
    }
  };

  function openProProfile(p: Professional) {
    setProDetail(p);
  }

  function handleConnect(p: Professional) {
    if (demo) { showToast("Connection requests are unavailable in this demo."); return; }
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
      .then((r: Response) => {
        if (!r.ok) throw new Error("failed");
        setConnectedIds((prev) => {
          const n = new Set(prev);
          n.add(p.id);
          return n;
        });
        showToast(`Request sent — ${p.name} will be notified`);
      })
      .catch(() => {
        // Was masking every failure with the same success toast.
        showToast(`Couldn't send request — try again`);
      })
      .finally(() => setConnectLoading(null));
  }

  function handleShare(p: Professional) {
    const text = `Check out ${p.name} — ${p.type} on Musa`;
    if (navigator.share) {
      navigator.share({ title: p.name, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard")).catch(() => {});
    }
  }

  function handlePostShare(post: NetworkForumPost) {
    const text = `${post.title} — by ${post.author} on Musa Forum`;
    if (navigator.share) {
      navigator.share({ title: post.title, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard")).catch(() => {});
    }
  }

  function handleVote(postId: number, direction: "up" | "down") {
    if (demo) { showToast("Forum voting is unavailable in this demo."); return; }
    const current = votedPosts[postId];
    setVotedPosts((prev) => ({ ...prev, [postId]: current === direction ? null : direction }));
    const applyDelta = (p: NetworkForumPost) => {
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
    setLiveForum?.((prev) => (prev && prev.length ? prev.map(applyDelta) : (demo ? FORUM_POSTS.map(applyDelta) : prev)));
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

  const threadModalRef = useFocusTrap(
    threadPost != null,
    () => { setThreadId(null); setReplyTo(null); setReplyToId(null); },
  );
  const newPostTrap = useFocusTrap(showNewPost, () => setShowNewPost(false));

  // Open a post's thread and lazily load its real replies (nested via
  // parentReplyId/depth). Demo/numeric posts keep using inline `comments`.
  function openThread(postId: number) {
    setThreadId(postId);
    setReplyTo(null);
    setReplyToId(null);
    const key = String(postId);
    if (typeof postId === "number" || threadReplies[key]) return;
    apiFetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forum", type: "get-replies", postId }),
    })
      .then((r: Response) => (r.ok ? r.json() : null))
      .then((d: { replies?: ThreadReply[] } | null) => {
        const replies = d?.replies; if (!Array.isArray(replies)) return;
        setThreadReplies((prev) => {
          const serverIds = new Set(replies.map((r) => String(r.id)));
          const optimistic = (prev[key] || []).filter(
            (r) => String(r.id).startsWith("tmp-") && !serverIds.has(String(r.id))
          );
          return { ...prev, [key]: [...replies, ...optimistic] };
        });
      })
      .catch(() => {});
  }

  function addComment(postId: number, parentReplyId: string | null = null) {
    if (demo) { showToast("Forum replies are unavailable in this demo."); return; }
    const text = (commentTexts[postId] || "").trim();
    if (!text) return;
    const key = String(postId);
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Derive depth from parent's position in the tree (capped at 3)
    let depth = 0;
    if (parentReplyId) {
      const existing = threadReplies[key] || [];
      const findDepth = (list: ThreadReply[], targetId: string, d: number): number | null => {
        for (const r of list) {
          if (String(r.id) === targetId) return d;
          if (r.children?.length) {
            const found = findDepth(r.children, targetId, d + 1);
            if (found !== null) return found;
          }
        }
        return null;
      };
      // Build flat tree to search
      const nodes = new Map<string, ThreadReplyNode>();
      existing.forEach((r: ThreadReply, i: number) => { const rk = r.id != null ? String(r.id) : `idx-${i}`; nodes.set(rk, { ...r, __key: rk, children: [] }); });
      nodes.forEach((node) => { const pid = node.parentReplyId != null ? String(node.parentReplyId) : null; if (pid && nodes.has(pid) && pid !== node.__key) (nodes.get(pid) as ThreadReplyNode).children.push(node); });
      const roots = [...nodes.values()].filter(n => !n.parentReplyId || !nodes.has(String(n.parentReplyId)));
      const found = findDepth(roots, String(parentReplyId), 0);
      if (found !== null) depth = Math.min(found + 1, 3);
    }
    const newComment = {
      id: tempId,
      author: currentUser.name || "You",
      avatar: currentUser.avatar || "",
      text,
      time: "Just now",
      parentReplyId: parentReplyId || null,
      depth,
      isOwn: true,
    };
    const addC = (p: NetworkForumPost) => (p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p);
    const removeC = (p: NetworkForumPost) => (p.id === postId ? { ...p, comments: (p.comments || []).filter((c) => c.id !== tempId) } : p);
    setLiveForum?.((prev) => (prev && prev.length ? prev.map(addC) : (demo ? FORUM_POSTS.map(addC) : prev)));
    setForumPosts((prev) => prev.map(addC));
    setThreadReplies((prev) => (prev[key] ? { ...prev, [key]: [...prev[key], newComment] } : prev));
    setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
    if (typeof postId === "number" && !liveForum?.length) { setReplyTo(null); setReplyToId(null); showToast("Comment added"); return; }
    apiFetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forum", type: "reply", postId, text, parentReplyId: parentReplyId || undefined }),
    }).then((r: Response) => {
      if (!r.ok) throw new Error("failed");
      setReplyTo(null);
      setReplyToId(null);
      showToast(parentReplyId ? "Reply added" : "Comment added");
    }).catch(() => {
      setLiveForum?.((prev) => (prev && prev.length ? prev.map(removeC) : prev));
      setForumPosts((prev) => prev.map(removeC));
      setThreadReplies((prev) => (prev[key] ? { ...prev, [key]: prev[key].filter((c) => c.id !== tempId) } : prev));
      showToast("Failed to post comment");
    });
  }

  async function submitNewPost() {
    if (demo) { showToast("Forum posts are unavailable in this demo."); return; }
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
        const d: { code?: string } = await r.json().catch(() => ({}));
        showToast(d.code === "SAFETY_BLOCK" ? "Post blocked by safety policy" : "Failed to post");
        return;
      }
      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-quest", action_keys: ["forum_post"] }) }).catch(() => {});
      // Create response doesn't echo the new row's real id —
      // re-fetch so filteredForum renders it and votes/comments
      // on it can match.
      try {
        const rf = await apiFetch("/api/muse?type=forum");
        const df: { posts?: NetworkForumPost[] } = await rf.json();
        if (df.posts) setLiveForum?.(df.posts);
      } catch { /* live forum refresh is best-effort */ }
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
  }

  function togglePostPin(post: NetworkForumPost) {
    if (demo) { showToast("Forum moderation is unavailable in this demo."); return; }
    (async () => {
      try {
        const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum-post-pin", postId: post.id }) });
        const d: { success?: boolean; pinned: boolean; error?: string } = await r.json();
        if (d.success) {
          setForumPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, pinned: d.pinned } : p));
          showToast(d.pinned ? "Post pinned" : "Post unpinned");
        } else {
          showToast(d.error || "Couldn't update pin");
        }
      } catch { showToast("Couldn't update pin"); }
    })();
  }

  function reportTarget(t: { id: number | string; type: string; name: string }) {
    setReportTarget(t);
    setShowReport(true);
  }

  return (
    <div className={"screen-el" + (screen === "network" ? " active" : "")} data-screen="network">
      <h1 className="sr-only">Network</h1>
      <div
        className="hdr"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px`,
        }}
      >
        <button className="chat-back" aria-label="Back to menu" onClick={() => (goBack ? goBack() : showScreen("discover"))}>
          <FiArrowLeft size={20} />
        </button>
        <div
          className="logo-link"
          style={{
            fontSize: 37.5,
            backgroundImage: "linear-gradient(90deg,#64B5F6,#90CAF9,#D4A5FF,#64B5F6,#90CAF9,#64B5F6)",
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
      <div className="conn-tabs" role="tablist" aria-label="Network tabs" style={{ padding: "0 16px" }}>
        {(["pros", "forum"] as const).map((t) => (
          <button
            type="button"
            key={t}
            id={`network-tab-${t}`}
            role="tab"
            tabIndex={0}
            aria-selected={netTab === t}
            aria-controls="network-panel"
            className={"conn-tab" + (netTab === t ? " active" : "")}
            onClick={() => setNetTab(t)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNetTab(t); } }}
          >
            {t === "pros" ? "Professionals" : "Forum"}
          </button>
        ))}
      </div>
      )}

      {/* One shared scroll container (pros/forum conditionally rendered inside
          it, same pattern as CommunityScreen's groups/events) — the panel's
          id/aria-labelledby swaps to whichever tab is active. */}
      <div id="network-panel" role="tabpanel" aria-labelledby={`network-tab-${netTab}`} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 16px 80px" }}>
        {netTab === "pros" && (
          <NetworkProsTab
            iAmIndustry={iAmIndustry}
            proSearch={proSearch}
            setProSearch={setProSearch}
            onSearchSubmit={handleProSearch}
            filterSections={filterSections}
            setFilterSections={setFilterSections}
            proExp={proExp}
            setProExp={setProExp}
            proSort={proSort}
            setProSort={setProSort}
            proHiringOnly={proHiringOnly}
            setProHiringOnly={setProHiringOnly}
      proFiltersLocked={proFiltersLocked}
      setUpsell={setUpsell}
            proRateBand={proRateBand}
            setProRateBand={setProRateBand}
            proSkill={proSkill}
            setProSkill={setProSkill}
            proLooking={proLooking}
            setProLooking={setProLooking}
            allSkills={allSkills}
            allLooking={allLooking}
            proList={proList}
            savedProfileIds={savedProfileIds}
            onToggleSave={toggleSaveProfessional}
            handleImgError={handleImgError}
            onOpenProfile={openProProfile}
          />
        )}

        {netTab === "forum" && (
          <NetworkForumTab
            showNewPost={showNewPost}
            setShowNewPost={setShowNewPost}
            newPostTrapRef={newPostTrap}
            newPostTitle={newPostTitle}
            setNewPostTitle={setNewPostTitle}
            newPostBody={newPostBody}
            setNewPostBody={setNewPostBody}
            onSubmitPost={submitNewPost}
            forumSort={forumSort}
            setForumSort={setForumSort}
            forumSearch={forumSearch}
            setForumSearch={setForumSearch}
            forumSearchOpen={forumSearchOpen}
            setForumSearchOpen={setForumSearchOpen}
            filteredForum={filteredForum}
            expandedPostId={expandedPostId}
            setExpandedPostId={setExpandedPostId}
            votedPosts={votedPosts}
            commentTexts={commentTexts}
            setCommentTexts={setCommentTexts}
            currentUser={currentUser}
            onVote={handleVote}
            onShare={handlePostShare}
            onReport={reportTarget}
            onOpenThread={openThread}
            onAddComment={addComment}
            onTogglePin={togglePostPin}
          />
        )}

        {/* ─── THREAD DETAIL (Reddit-style) ─── */}
        {threadPost && createPortal(
          <NetworkThreadModal
            ref={threadModalRef}
            threadPost={threadPost}
            threadReplies={threadReplies}
            threadSort={threadSort}
            setThreadSort={setThreadSort}
            votedPosts={votedPosts}
            commentVotes={commentVotes}
            setCommentVotes={setCommentVotes}
            commentTexts={commentTexts}
            setCommentTexts={setCommentTexts}
            replyTo={replyTo}
            replyToId={replyToId}
            setReplyTo={setReplyTo}
            setReplyToId={setReplyToId}
            onClose={() => { setThreadId(null); setReplyTo(null); setReplyToId(null); }}
            onVote={handleVote}
            onShare={handlePostShare}
            onReport={reportTarget}
            onAddComment={addComment}
            onBadgeInfo={setBadgeInfo}
          />, document.body)
        }
      </div>
      {proDetail && (
        <NetworkProDetailModal
          proDetail={proDetail}
          onClose={() => setProDetail(null)}
          handleImgError={handleImgError}
          connectedIds={connectedIds}
          connectLoading={connectLoading}
          onConnect={handleConnect}
          onShare={handleShare}
          onOpenChat={openChat}
          iAmIndustry={iAmIndustry}
          onBadgeInfo={setBadgeInfo}
        />
      )}

      <BadgeInfoModal info={badgeInfo} onClose={() => setBadgeInfo(null)} />
      <Nav active="network" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});
