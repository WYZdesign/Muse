"use client";
import { useState } from "react";

export function useSettingsState() {
  const [connTab, setConnTab] = useState<"community" | "events" | "sessions" | "forum" | "feed" | "professional">("community");
  const [sessTab, setSessTab] = useState<"sessions" | "bookings" | "requests">("sessions");
  const [forumSort, setForumSort] = useState<"hot" | "new" | "top">("hot");
  const [forumCategory, setForumCategory] = useState<string>("all");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [feedFilter, setFeedFilter] = useState<"all" | "photos" | "videos" | "text" | "bts">("all");
  const [museCat, setMuseCat] = useState<"all" | "tfp" | "paid" | "opencall" | "concept">("all");
  const [discoveryPrefs, setDiscoveryPrefs] = useState<{ ageMin: number; ageMax: number; distance: number; gender: string }>({ ageMin: 18, ageMax: 50, distance: 50, gender: "all" });
  const [savedSearches, setSavedSearches] = useState<{ id: string; name: string; query?: string; filters?: any }[]>([]);
  const [myGeo, setMyGeo] = useState<{ lat: number; long: number; city: string; state: string; requiresIdVerification: boolean } | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [theme, setTheme] = useState<"lasunset" | "deepspace" | "nebula" | "deepsea" | "cinder" | "boreal" | "sunrise" | "daylight" | "sky" | "rose" | "meadow" | "frost">("lasunset");
  const [activityFeed, setActivityFeed] = useState<{ id: number; type: string; from: string; avatar: string; text: string; time: string; read: boolean }[]>([]);
  const [serverNotifCount, setServerNotifCount] = useState(0);
  const [matchesView, setMatchesView] = useState<"list" | "grid">("list");
  const [messageRequests, setMessageRequests] = useState<any[]>([]);
  const [profileViews, setProfileViews] = useState(0);
  const [profileViewers, setProfileViewers] = useState<{ name: string; avatar: string; time: string }[]>([]);
  const [showStory, setShowStory] = useState<number | null>(null);

  return {
    connTab, setConnTab,
    sessTab, setSessTab,
    forumSort, setForumSort,
    forumCategory, setForumCategory,
    newPostTitle, setNewPostTitle,
    newPostBody, setNewPostBody,
    expandedPost, setExpandedPost,
    commentText, setCommentText,
    replyingTo, setReplyingTo,
    feedFilter, setFeedFilter,
    museCat, setMuseCat,
    discoveryPrefs, setDiscoveryPrefs,
    savedSearches, setSavedSearches,
    myGeo, setMyGeo,
    supportOpen, setSupportOpen,
    theme, setTheme,
    activityFeed, setActivityFeed,
    serverNotifCount, setServerNotifCount,
    matchesView, setMatchesView,
    messageRequests, setMessageRequests,
    profileViews, setProfileViews,
    profileViewers, setProfileViewers,
    showStory, setShowStory,
  };
}