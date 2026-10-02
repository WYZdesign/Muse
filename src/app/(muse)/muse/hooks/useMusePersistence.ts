"use client";

import { useCallback, useRef } from "react";
import { DEMO_MODE } from "../page-constants";
import { PROFILES } from "../components/types";
import { MUSE_CLOSED_BETA_HIDE_SOCIAL } from "@/lib/config";

/**
 * P2 controller-hook extraction (verbatim from page.tsx).
 *
 * Owns the whole client-persistence layer: the localStorage schema constant,
 * the debounced server sync, `saveState` (serialize the app state) and
 * `loadState` (hydrate it back). Behaviour is unchanged from the inline
 * useCallbacks it replaces.
 *
 * Two design points that preserve exact behaviour:
 *  - `values` is memoized by the caller on the SAME fields the original
 *    `saveState` useCallback listed, so `useSaveStateTimer` still re-fires the
 *    debounced save exactly when those fields change (not on every render).
 *  - `setters` is memoized once (setters are stable), so `loadState` keeps the
 *    stable identity the original had.
 *
 * The pure `buildPersistPayload` / `applyLoadedState` are exported so the
 * field<->setter mapping can be parity-tested without React.
 */

export const STORAGE_KEY = "muse_v1";
export const STATE_VERSION = 2;

export type PersistRecord = Record<string, any>;

/** Demo story seeds used when there is nothing persisted (DEMO_MODE only). */
const DEMO_MOMENTS = [
  { id: 9001, author: "Maya Chen", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600", caption: "Behind the scenes from today's shoot", views: 1420 },
  { id: 9002, author: "Jordan Rivera", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", img: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600", caption: "Studio setup for the new series", views: 980 },
  { id: 9003, author: "Sam Taylor", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", img: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600", caption: "Golden hour magic", views: 2100 },
] as unknown[];

/** Pure: assemble the persisted payload from the current state values. */
export function buildPersistPayload(v: PersistRecord) {
  const MAX_ITEMS = 50;
  return {
    v: STATE_VERSION,
    currentUser: v.currentUser, obData: v.obData, obStep: v.obStep, matches: v.matches.slice(-MAX_ITEMS), dailyLikes: v.dailyLikes, superLikes: v.superLikes,
    savedBriefs: v.savedBriefs, appliedBriefs: v.appliedBriefs, savedSessionIds: v.savedSessionIds, savedProfileIds: v.savedProfileIds, userBriefs: v.userBriefs.slice(-MAX_ITEMS), blockedUsers: v.blockedUsers, notifPrefs: v.notifPrefs,
    obConnectedSocials: v.obConnectedSocials, showNsfw: v.showNsfw, showOnline: v.showOnline, showDistance: v.showDistance, showZodiac: v.showZodiac, showAge: v.showAge, showMbti: v.showMbti, showLifePath: v.showLifePath, showChinese: v.showChinese, showMatchPercent: v.showMatchPercent, rsvpdEvents: v.rsvpdEvents, forumPosts: v.forumPosts.slice(-MAX_ITEMS), feedPosts: v.feedPosts.slice(-MAX_ITEMS),
    testLevels: v.testLevels, obSelects: v.obSelects, obProfilePic: v.obProfilePic, obPortfolioItems: v.obPortfolioItems, likedBy: v.likedBy.slice(-MAX_ITEMS),
    profileViews: DEMO_MODE ? v.profileViews : 0, profileViewers: DEMO_MODE ? v.profileViewers.slice(-20) : [], stories: v.stories.slice(-20), theme: v.theme, activityFeed: v.activityFeed.slice(-MAX_ITEMS),
    discoveryPrefs: v.discoveryPrefs, chatImages: Object.fromEntries(Object.entries(v.chatImages).slice(-20).map(([k, val]) => [k, (val as any).slice(-20)])), screen: v.screen, filterStyles: v.filterStyles, filterScore: v.filterScore,
    searchQuery: v.searchQuery, connTab: v.connTab, museCat: v.museCat, authUser: v.authRemember ? v.authUser : null, chatTarget: v.chatTarget,
  };
}

/** Pure: apply a decoded persisted record onto the state setters. */
export function applyLoadedState(d: any, s: PersistRecord) {
  if (d.currentUser) s.setCurrentUser((prev: any) => ({ ...prev, ...d.currentUser, tier: "free", foundingTier: "", proExpiresAt: "", stats: { ...prev.stats, ...(d.currentUser.stats || {}) }, portfolios: Array.isArray(d.currentUser.portfolios) ? d.currentUser.portfolios : (prev.portfolios || []) }));
  if (d.obData) s.setObData(d.obData);
  if (d.obStep) s.setObStep(d.obStep);
  if (d.authUser) s.setAuthUser(d.authUser);
  if (d.matches) s.setMatches(d.matches.map((m: any) => {
    const t = m.target_id || {};
    const lastSeen = t.last_seen_at || null;
    const online = !!lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000;
    return { ...m, name: t.name || m.name, img: t.avatar || m.img, type: t.type || m.type, bio: t.bio || m.bio, location: t.loc || m.location, online, lastSeen, nsfw: t.nsfw || m.nsfw };
  }));
  if (!d.matches || d.matches.length === 0) {
    // DEMO_MODE only: never seed a real user's Matches list with fabricated
    // profiles in live production. An empty list shows the real empty state.
    if (DEMO_MODE) {
      const now = Date.now();
      const t = (mins: number) => new Date(now - mins * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const DEMO_THREADS: { from: "me" | "them"; text: string; time: string }[][] = [
        [{ from: "them", text: "Hey! Checked out your portfolio — the studio lighting work is unreal.", time: t(180) },
         { from: "me", text: "Thank you! I've been experimenting with a soft-box setup lately 🙌", time: t(174) },
         { from: "them", text: "Would you be up for a shoot next week? I have a concept in mind.", time: t(12) }],
        [{ from: "me", text: "Your drone reel is incredible. Do you travel for shoots?", time: t(240) },
         { from: "them", text: "I do — mostly the Southeast, but I'll fly anywhere for the right project.", time: t(232) }],
        [{ from: "them", text: "I'd like to feature your work in the community spotlight this month.", time: t(90) },
         { from: "me", text: "That would be amazing, thank you! What do you need from me?", time: t(84) }],
        [{ from: "them", text: "Just sent over the brief for the brand campaign — take a look when you can.", time: t(30) },
         { from: "me", text: "On it. First read looks great, I'll come back with availability.", time: t(26) }],
        [{ from: "me", text: "Congrats on the gallery opening! The turnout looked packed.", time: t(600) },
         { from: "them", text: "Thank you! We sold three pieces on the first night 🥂", time: t(590) }],
        [{ from: "them", text: "Are you free to hop on a quick call about the collaboration?", time: t(20) }],
      ];
      const demoMatches = PROFILES.slice(0, 6).map((p, i) => ({
        id: p.id, name: p.name, img: p.img, type: p.type,
        bio: p.bio, location: p.loc, booked: false, online: !!p.online,
        messages: DEMO_THREADS[i] || [], _demo: true
      }));
      s.setMatches(demoMatches);
    } else {
      s.setMatches([]);
    }
  }
  if (d.dailyLikes != null) s.setDailyLikes(d.dailyLikes);
  if (d.superLikes != null) s.setSuperLikes(d.superLikes);
  if (d.savedBriefs) s.setSavedBriefs(d.savedBriefs);
  if (d.appliedBriefs) s.setAppliedBriefs(d.appliedBriefs);
  if (d.savedSessionIds) s.setSavedSessionIds(d.savedSessionIds);
  if (d.savedProfileIds) s.setSavedProfileIds(d.savedProfileIds);
  if (d.userBriefs) s.setUserBriefs(d.userBriefs);
  if (d.blockedUsers) s.setBlockedUsers(d.blockedUsers);
  if (d.notifPrefs) s.setNotifPrefs(d.notifPrefs);
  if (d.obConnectedSocials) s.setObConnectedSocials(d.obConnectedSocials);
  if (d.showNsfw != null) s.setShowNsfw(d.showNsfw);
  if (d.showOnline != null) s.setShowOnline(d.showOnline);
  if (d.showDistance != null) s.setShowDistance(d.showDistance);
  if (d.showZodiac != null) s.setShowZodiac(d.showZodiac);
  if (d.showAge != null) s.setShowAge(d.showAge);
  if (d.showMbti != null) s.setShowMbti(d.showMbti);
  if (d.showLifePath != null) s.setShowLifePath(d.showLifePath);
  if (d.showChinese != null) s.setShowChinese(d.showChinese);
  if (d.showMatchPercent != null) s.setShowMatchPercent(d.showMatchPercent);
  if (d.rsvpdEvents) s.setRsvpdEvents(d.rsvpdEvents);
  if (d.forumPosts) s.setForumPosts(d.forumPosts);
  if (d.feedPosts) s.setFeedPosts(d.feedPosts);
  if (d.testLevels) s.setTestLevels(d.testLevels);
  if (d.obSelects) s.setObSelects(d.obSelects);
  if (d.obProfilePic) s.setObProfilePic(d.obProfilePic);
  if (d.obPortfolioItems) s.setObPortfolioItems(d.obPortfolioItems);
  if (d.likedBy) s.setLikedBy(d.likedBy);
  if (DEMO_MODE) {
    if (d.profileViews) s.setProfileViews(d.profileViews);
    if (d.profileViewers) s.setProfileViewers(d.profileViewers);
  }
  if (d.stories && d.stories.length) s.setStories(d.stories);
  else s.setStories(DEMO_MOMENTS);
  if (d.theme) s.setTheme((["lasunset","deepspace","nebula","deepsea","cinder","boreal","sunrise","daylight","sky","rose","meadow","frost"].includes(d.theme) ? d.theme : "lasunset"));
  if (d.activityFeed) s.setActivityFeed(d.activityFeed);
  if (d.discoveryPrefs) s.setDiscoveryPrefs(d.discoveryPrefs);
  if (d.chatImages) s.setChatImages(d.chatImages);
  if (d.chatTarget) s.setChatTarget(d.chatTarget);
  // "moments" was BTS's old screen key before it was renamed to "bts" — kept
  // dropping it and never adding "bts" meant reloading mid-BTS silently
  // bounced you back to Discover. "community" is gated behind the closed-beta
  // flag so a stale persisted value from before the flag existed can't restore
  // straight into a screen the menu no longer offers a way to reach.
  const VALID_SCREENS = ["onboard","discover","connections","matches","chat","briefs","sessions","network","portfolio","bts","profile","settings","subscription","codex","studios","analytics", ...(MUSE_CLOSED_BETA_HIDE_SOCIAL ? [] : ["community"])];
  if (d.screen && VALID_SCREENS.includes(d.screen)) {
    // Chat requires a chatTarget to render; fallback to matches if missing.
    s.setScreen(d.screen === "chat" && !d.chatTarget ? "matches" : d.screen);
  }
  if (d.authUser) s.setAuthUser(d.authUser);
  if (d.authUser && !VALID_SCREENS.includes(d.screen || "")) s.setScreen("discover");
}

export type UseMusePersistenceParams = {
  values: PersistRecord;
  setters: PersistRecord;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  safeSetItem: (key: string, value: string) => void;
  safeGetItem: (key: string) => string | null;
  safeGetItemAsync: (key: string) => Promise<string | null>;
  safeRemoveItem: (key: string) => void;
};

export function useMusePersistence({
  values, setters, apiFetch, safeSetItem, safeGetItem, safeGetItemAsync, safeRemoveItem,
}: UseMusePersistenceParams) {
  const lastSyncRef = useRef(0);

  const saveState = useCallback(() => {
    try {
      const data = buildPersistPayload(values);
      safeSetItem(STORAGE_KEY, JSON.stringify(data));
      // Throttle the server sync to once per 30s (was every saveState tick) — big load reduction at scale.
      const now = Date.now();
      if (now - lastSyncRef.current > 30000) {
        lastSyncRef.current = now;
        apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "sync", matches: values.matches, feedPosts: values.feedPosts, forumPosts: values.forumPosts, userBriefs: values.userBriefs, stats: values.currentUser.stats }) }).catch(() => {});
      }
    } catch { console.debug("[muse] persisted client state could not be saved"); }
  }, [apiFetch, safeSetItem, values]);

  const loadState = useCallback(async () => {
    try {
      const raw = await safeGetItemAsync(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      // Schema version gate: discard stale/future schemas to avoid corrupting hydration.
      if (typeof d.v !== "number" || d.v > STATE_VERSION) {
        safeRemoveItem(STORAGE_KEY);
        return;
      }
      applyLoadedState(d, setters);
    } catch { console.debug("[muse] persisted client state could not be restored"); }
    try { const b = safeGetItem("muse_boost"); if (b) { const e = parseInt(b); if (e > Date.now()) { setters.setBoostActive(true); setters.setBoostEnd(e); } else { safeRemoveItem("muse_boost"); } } } catch { console.debug("[muse] persisted boost state could not be restored"); }
  }, [safeGetItem, safeGetItemAsync, safeRemoveItem, setters]);

  return { saveState, loadState };
}
