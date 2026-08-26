"use client";

import { useState, useEffect } from "react";
import { trackError } from "@/lib/errorTracker";
import { normalizeForumPost } from "./normalizers";

export type UseFeedDataArgs = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  profileId: string | null;
  initialStories: any[];
};

export function useFeedData({ authFetch, profileId, initialStories }: UseFeedDataArgs) {
  const [liveFeed, setLiveFeed] = useState<any[] | null>(null);
  const [feedPosts, setFeedPosts] = useState<{id:number;author:string;avatar:string;type:string;text:string;likes:number;comments:number;shares:number;time:string;liked:boolean;saved:boolean;img?:string;media?:string[];reactions?:Record<string,number>}[]>([]);
  const [stories, setStories] = useState<any[]>(initialStories);
  const [liveForum, setLiveForum] = useState<any[] | null>(null);
  const [forumPosts, setForumPosts] = useState<{id:number;title:string;body:string;author:string;avatar:string;votes:number;comments:{author:string;text:string}[];cat:string;time:string;pinned:boolean}[]>([]);

  // ═══ FEED: fetch real feed posts from API ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=feed")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.posts) setLiveFeed(d.posts); })
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
        const mapped = d.moments.map((m: any) => ({
          id: m.id,
          author: m.author_id?.name || "Muse",
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
    liveFeed, setLiveFeed,
    feedPosts, setFeedPosts,
    stories, setStories,
    liveForum, setLiveForum,
    forumPosts, setForumPosts,
  };
}
