"use client";

import { useCallback } from "react";
import type { RawApiProfile, RawFeedPost, RawForumPost } from "../page-models";
import { viewerSide } from "@/lib/role";
import { initialsAvatarUrl } from "../lib/initials-avatar";
import {
  normalizeCommunity,
  normalizeEvent,
  normalizeForumPost,
  normalizeBrief,
  normalizeSession,
  normalizeFeedPost,
} from "./normalizers";

/**
 * P2 controller-hook extraction (verbatim from page.tsx).
 *
 * The API data bootstrap: pulls match recommendations, briefs, feed, forum,
 * events, communities, sessions and professionals, and writes them into the
 * live-state setters. Behaviour is unchanged from the inline `bootstrapData`
 * useCallback it replaces — the same requests, the same dedup/skipWrap logic,
 * and the same dependency semantics (the caller passes the `.length` values the
 * original dep array keyed on, so the callback re-creates at exactly the same
 * times).
 */
export type UseBootstrapDataParams = {
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  authUserProfileId: string | null | undefined;
  liveBriefsLen: number;
  feedPostsLen: number;
  forumPostsLen: number;
  liveForumLen: number;
  liveEventsLen: number;
  liveCommunitiesLen: number;
  liveSessionsLen: number;
  setLiveProfiles: (value: any) => void;
  setLiveBriefs: (value: any) => void;
  setLiveFeed: (value: any) => void;
  setFeedPosts: (value: any) => void;
  setLiveForum: (value: any) => void;
  setForumPosts: (value: any) => void;
  setLiveEvents: (value: any) => void;
  setLiveCommunities: (value: any) => void;
  setLiveSessions: (value: any) => void;
  setLiveProfessionals: (value: any) => void;
  setBootstrapped: (value: any) => void;
  setDiscoverLoading: (value: any) => void;
};

export function useBootstrapData({
  apiFetch,
  authUserProfileId,
  liveBriefsLen,
  feedPostsLen,
  forumPostsLen,
  liveForumLen,
  liveEventsLen,
  liveCommunitiesLen,
  liveSessionsLen,
  setLiveProfiles,
  setLiveBriefs,
  setLiveFeed,
  setFeedPosts,
  setLiveForum,
  setForumPosts,
  setLiveEvents,
  setLiveCommunities,
  setLiveSessions,
  setLiveProfessionals,
  setBootstrapped,
  setDiscoverLoading,
}: UseBootstrapDataParams) {
  const bootstrapData = useCallback(async () => {    try {
      let token = "";
      try { token = JSON.parse(localStorage.getItem("muse_user") || "{}")?.access_token || ""; } catch { console.debug("[muse] ignored unreadable persisted session"); }
      // Match recommendations require auth — skip when there's no session yet
      // (avoids a 401 on the pre-login boot).
      const matchPromise = token
        ? apiFetch("/api/muse/match?limit=50").then(r => r.ok ? r.json() : null).catch(() => null)
        : Promise.resolve(null);
      // Dedup: useFeedData/useCommunityData/useBriefsData/useSessionData already
      // fetch briefs/feed/forum/events/communities/sessions and write the SAME
      // setters. Skip the redundant request when the hook has already populated
      // state (avoids ~6 duplicate GETs per load). If the hook is profileId-
      // gated and hasn't fired yet, the fetch still runs as a safe fallback.
      //
      // Live-verified regression (this session): FeedScreen does NOT actually
      // render from `liveFeed` — it renders `feedPosts` (this effect's own
      // mapped output) plus `feedPostsStatic` when DEMO_MODE is on. `liveFeed`
      // is only used there for id-matching (isLivePost) and dedup-by-text, not
      // as the displayed list. useFeedData's separate profileId-gated effect
      // DOES populate `liveFeed` independently — so once that resolved first,
      // this dedup's `liveFeed.length>0` check skipped the fetch that's the
      // ONLY thing that ever populates `feedPosts`, leaving the Feed screen
      // permanently blank (confirmed live: no `type=feed` GET fired at all,
      // and with DEMO_MODE now gating off feedPostsStatic too there was no
      // fallback content either). Fixed by keying the skip on `feedPosts`
      // alone — the thing actually rendered — not on `liveFeed`.
      const skipWrap = (already: boolean, type: string) => already ? Promise.resolve(null) : apiFetch("/api/muse?type=" + type).then(r => r.ok ? r.json() : null).catch(() => null);
      const [matchData, briefs, feed, forum, events, communities, sessions, professionals] = await Promise.all([
        matchPromise,
        skipWrap(liveBriefsLen > 0, "briefs"),
        skipWrap(feedPostsLen > 0, "feed"),
        skipWrap(liveForumLen > 0 || forumPostsLen > 0, "forum"),
        skipWrap(liveEventsLen > 0, "events"),
        skipWrap(liveCommunitiesLen > 0, "communities"),
        skipWrap(liveSessionsLen > 0, "sessions"),
        apiFetch("/api/muse?type=professionals").then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (matchData?.profiles?.length) setLiveProfiles((matchData.profiles as RawApiProfile[]).map((p) => ({
        id: p.id, name: p.name || "Creative", img: p.avatar || initialsAvatarUrl(p.name || "Creative", p.id), type: p.type || "artist",
        bio: p.bio || "", loc: p.loc || "Unknown", styles: Array.isArray(p.styles) ? p.styles : [],
        score: p.matchScore || 70, nsfw: !!p.nsfw, looking: Array.isArray(p.looking) ? p.looking : [],
        zodiac: p.zodiac || "", chinese: p.chinese || "", mbti: p.mbti || "", lifePath: p.life_path || "",
        photos: Array.isArray(p.photos) ? p.photos : [], collabs: p.collabs || 0, verified: !!p.verified,
        matchScore: p.matchScore, rulesScore: p.rulesScore, cosineScore: p.cosineScore,
        showDistance: p.showDistance !== false, age: p.age, showAge: p.showAge !== false,
        side: p.side || viewerSide(p.type),
      })));
      if (briefs?.briefs?.length) setLiveBriefs(briefs.briefs.map(normalizeBrief));
      if (feed?.posts?.length) {
        // Bug fix: this used to call setLiveFeed(feed.posts) with the raw,
        // un-normalized DB rows (author still nested under `author_id`
        // instead of a flat `author` string). useFeedData.ts's own
        // profileId-gated fetch normalizes the same endpoint properly —
        // whichever of the two effects resolved last silently won, so
        // depending on timing the feed could render every post with a
        // blank author name/avatar, and the feedPosts dedup below (matched
        // by `.author`) would fail to match against the raw rows, showing
        // every post twice. Normalize here too so both effects always
        // agree on the same shape regardless of which resolves last.
        setLiveFeed((feed.posts as RawFeedPost[]).map((p) => normalizeFeedPost(p, authUserProfileId ?? null)));
        setFeedPosts((feed.posts as RawFeedPost[]).map((p, i: number) => ({
          id: 100000 + i,
          // Real DB id — synthetic display ids break server-side lookups
          // (reports pointed at posts no moderator could ever resolve).
          rid: p.id, author: p.author_id?.name || "Muse", avatar: p.author_id?.avatar || "",
          type: p.img ? "photo" : "text", text: p.text || "", likes: p.likes || 0, comments: p.comments || 0,
          shares: p.shares || 0, time: p.created_at ? new Date(p.created_at).toLocaleString() : "Just now",
          img: p.img || "", liked: false, saved: false
        })));
      }
      if (forum?.posts?.length) {
        setLiveForum(forum.posts.map(normalizeForumPost));
        setForumPosts((forum.posts as RawForumPost[]).map((p, i: number) => ({
          id: 100000 + i, title: p.title || "", body: p.body || "", author: p.author_id?.name || "Creative",
          avatar: p.author_id?.avatar || "", votes: p.votes || 0, comments: Array.isArray(p.comments) ? p.comments : [],
          cat: p.cat || "General", time: p.created_at ? new Date(p.created_at).toLocaleString() : "Just now", pinned: false
        })));
      }
      if (events?.events?.length) setLiveEvents(events.events.map(normalizeEvent));
      if (communities?.communities?.length) setLiveCommunities(communities.communities.map(normalizeCommunity));
      if (sessions?.sessions?.length) setLiveSessions(sessions.sessions.map(normalizeSession));
      if (professionals?.professionals?.length) setLiveProfessionals(professionals.professionals as unknown[]);
    } catch { console.debug("[muse] initial recommendation refresh failed"); }
    setBootstrapped(true);
    setDiscoverLoading(false);
  }, [apiFetch, authUserProfileId, feedPostsLen, forumPostsLen, liveBriefsLen, liveCommunitiesLen, liveEventsLen, liveForumLen, liveSessionsLen, setDiscoverLoading, setFeedPosts, setForumPosts, setLiveBriefs, setLiveCommunities, setLiveEvents, setLiveFeed, setLiveForum, setLiveProfiles, setLiveSessions]);

  return { bootstrapData };
}
