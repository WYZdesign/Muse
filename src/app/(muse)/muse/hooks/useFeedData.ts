"use client";

import { useState, useEffect } from "react";
import type { SetStateAction } from "react";
import type { FeedPostRow, FeedStory, MomentStory, NetworkForumPost } from "../page-models";
import { trackError } from "@/lib/errorTracker";
import { normalizeForumPost, normalizeFeedPost } from "./normalizers";

// Normalized row shapes the two normalizers above emit. The exposed setters are
// widened to accept them (see the casts below) because useBootstrapData's
// bootstrap pass writes the same endpoints with the raw normalized arrays,
// while the rendered value keeps the flat page-models row type.
type NormalizedFeed = ReturnType<typeof normalizeFeedPost>;
type NormalizedForum = ReturnType<typeof normalizeForumPost>;

// Raw /api/muse?type=moments row (joined author, embedded counts) before the
// story slot flattens it.
type RawMoment = {
  id: number | string;
  author_id?: { name?: string; avatar?: string } | null;
  text?: string;
  img?: string;
  type?: string;
  created_at?: string;
  likes?: number;
  comments?: number;
};

export type UseFeedDataArgs = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  profileId: string | null;
  initialStories: MomentStory[];
};

export function useFeedData({ authFetch, profileId, initialStories }: UseFeedDataArgs) {
  const [liveFeed, setLiveFeed] = useState<FeedPostRow[] | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPostRow[]>([]);
  const [stories, setStories] = useState<MomentStory[]>(initialStories);
  const [liveForum, setLiveForum] = useState<NetworkForumPost[] | null>(null);
  const [forumPosts, setForumPosts] = useState<NetworkForumPost[]>([]);

  // ═══ FEED: fetch real feed posts from API ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=feed")
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.posts)) setLiveFeed(d.posts.map((p: Parameters<typeof normalizeFeedPost>[0]) => normalizeFeedPost(p, profileId))); })
      .catch((err) => { trackError("fetch_feed", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  // ═══ MOMENTS: fetch real BTS moments (replaces demo fallback) ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=moments")
      .then(r => r.json())
      .then(d => {
        if (cancelled || !Array.isArray(d.moments)) return;
        const mapped = d.moments.map((m: RawMoment) => ({
          id: m.id,
          author: m.author_id?.name || "Musa",
          avatar: m.author_id?.avatar || "",
          text: m.text || "",
          img: m.img || "",
          video: m.type === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(m.img || ""),
          time: m.created_at ? new Date(m.created_at).toLocaleDateString() : "",
          liked: false,
          likes: m.likes || 0,
          comments: m.comments || 0,
        }));
        if (mapped.length) setStories(mapped);
      })
      .catch((err) => { trackError("fetch_moments", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  // ═══ FORUM: fetch real forum posts from API ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=forum")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.posts) setLiveForum(d.posts.map(normalizeForumPost)); })
      .catch((err) => { trackError("fetch_forum", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  return {
    liveFeed, setLiveFeed: setLiveFeed as (value: SetStateAction<FeedPostRow[] | null> | NormalizedFeed[]) => void,
    feedPosts, setFeedPosts,
    stories, setStories: setStories as (value: SetStateAction<MomentStory[]> | SetStateAction<FeedStory[]> | unknown[]) => void,
    liveForum, setLiveForum: setLiveForum as (value: SetStateAction<NetworkForumPost[] | null> | SetStateAction<unknown[] | null> | NormalizedForum[]) => void,
    forumPosts, setForumPosts,
  };
}
