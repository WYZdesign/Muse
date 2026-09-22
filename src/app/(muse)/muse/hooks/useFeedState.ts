"use client";
import { useState, useCallback, useRef } from "react";
import type { FeedPost } from "../components/types";

export function useFeedState() {
  const [feedText, setFeedText] = useState("");
  const [feedMedia, setFeedMedia] = useState<string[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<"all" | "photos" | "videos" | "text" | "bts">("all");
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [optimisticPosts, setOptimisticPosts] = useState<FeedPost[]>([]);

  const addOptimisticPost = useCallback((post: FeedPost) => {
    setOptimisticPosts(prev => [post, ...prev]);
  }, []);

  const removeOptimisticPost = useCallback((postId: number | string) => {
    setOptimisticPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  const clearOptimisticPosts = useCallback(() => {
    setOptimisticPosts([]);
  }, []);

  return {
    feedText, setFeedText,
    feedMedia, setFeedMedia,
    feedPosts, setFeedPosts,
    feedFilter, setFeedFilter,
    feedLoading, setFeedLoading,
    feedPage, setFeedPage,
    feedHasMore, setFeedHasMore,
    feedError, setFeedError,
    optimisticPosts, setOptimisticPosts,
    addOptimisticPost,
    removeOptimisticPost,
    clearOptimisticPosts,
  };
}