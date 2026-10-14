/** Raw API normalizers: converts PostgREST rows for profiles, communities, events, briefs, sessions, feed posts and forum posts into the flat render shapes the screens consume. */
"use client";

import { viewerSide } from "@/lib/role";
import type { ViewerSide } from "@/lib/role";
import type { CommunityRule } from "../components/types";
import type { DiscoveryProfile } from "../lib/discover-deck";

// Raw API row shapes: the opaque JSON each endpoint returns (PostgREST rows,
// joined authors, embedded counts). Every normalizer reads its input
// defensively with `??` fallback chains and emits the flat render shape the
// screens consume, so the input type only needs the fields it actually reads.
type RawProfileInput = {
  id?: string | number;
  name?: string;
  img?: string;
  avatar?: string;
  type?: string;
  bio?: string;
  loc?: string;
  styles?: string[];
  matchScore?: number;
  score?: number;
  nsfw?: boolean;
  looking?: string[];
  zodiac?: string;
  chinese?: string;
  mbti?: string;
  lifePath?: number | string;
  life_path?: number | string;
  photos?: string[];
  collabs?: number;
  verified?: boolean;
  rulesScore?: number;
  cosineScore?: number;
  showDistance?: boolean;
  side?: ViewerSide;
};

// normalizeProfile's output: the Discover card/view-model shape (DiscoveryProfile)
// plus the `side` it derives, so live-ranked profiles stay assignable where
// page.tsx feeds them to buildFilteredProfiles.
type NormalizedProfile = DiscoveryProfile & { side: ViewerSide };

type RawCommunityInput = {
  id: number;
  name: string;
  img: string;
  members?: number | string;
  member_count?: number | string;
  desc?: string;
  description?: string;
  cat?: string;
  category?: string;
  nsfw?: boolean;
  is_nsfw?: boolean;
  created_by?: string;
  created_at?: string;
  rules?: CommunityRule[];
};

type RawEventInput = {
  id: number;
  title: string;
  img: string;
  date: string;
  desc?: string;
  description?: string;
  loc?: string;
  location?: string;
  nsfw?: boolean;
  is_nsfw?: boolean;
};

type RawForumPostInput = {
  id?: string | number;
  title?: string;
  body?: string;
  author?: string;
  avatar?: string;
  author_id?: { name?: string; avatar?: string } | null;
  cat?: string;
  category?: string;
  comments?: { author: string; text: string }[];
  time?: string;
  created_at?: string;
};

type RawBriefInput = {
  id?: string | number;
  title?: string;
  budget?: string;
  tags?: string[];
  desc?: string;
  description?: string;
  cat?: string;
  category?: string;
  author?: string;
  authorImg?: string;
  author_id?: { name?: string; avatar?: string; id?: string } | null;
  muse_brief_applications?: { count?: number }[] | null;
  applicantCount?: number;
};

// normalizeBrief's output: the shape CollabScreen's CollabBrief expects (author
// join flattened, applicantCount unpacked, id keyed as number to match the
// optimistic apply/save state, same convention as FeedPostRow).
type NormalizedBrief = {
  id: number;
  title: string;
  budget: string;
  tags: string[];
  desc: string;
  cat: string;
  author: string;
  authorImg: string;
  applicantCount: number;
  author_id?: { id?: string } | null;
};

type RawSessionInput = {
  id: number;
  name?: string;
  title?: string;
  type: string;
  img: string;
  rate: string;
  rating: number;
  sessions?: number;
  available: boolean;
  description: string;
  location: string;
  skills: string[];
  hostVerified?: boolean;
  hostCompletedSessions?: number;
};

type RawFeedPostInput = {
  id?: string | number;
  author?: string;
  avatar?: string;
  author_id?: { id?: string | number; name?: string; avatar?: string; verified?: boolean; last_seen_at?: string } | null;
  authorVerified?: boolean;
  rid?: string | number;
  type?: string;
  text?: string;
  img?: string;
  media?: string[];
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  liked?: boolean;
  liked_by?: string[];
  saved?: boolean;
  reactions?: Record<string, number>;
  time?: string;
  createdAt?: number;
  created_at?: string;
  isBts?: boolean;
  lastSeen?: string;
};

/**
 * Normalizes a Discover profile card. Two different endpoints feed the same
 * `liveProfiles` state slot (page.tsx's bootstrapData hits the scored
 * `/api/muse/match` recommendation endpoint on mount; useDiscoveryData.ts's
 * own profileId-gated effect hits the plain `type=profiles` list endpoint,
 * which has no matchScore/zodiac/mbti/etc. fields at all) — whichever
 * resolves last used to win with its own raw shape, so a raw `type=profiles`
 * response landing after the scored one would blank out the match-percentage
 * bar (`profile.score` undefined → `width: "undefined%"`) and the
 * zodiac/mbti/life-path badges on every Discover card. Idempotent like the
 * other normalizers here so it's safe to call from both fetch sites.
 */
export function normalizeProfile(p: RawProfileInput) {
  return {
    ...p,
    id: p.id,
    name: p.name || "Creative",
    img: p.img ?? p.avatar ?? "",
    type: p.type || "artist",
    bio: p.bio || "",
    loc: p.loc || "Unknown",
    styles: Array.isArray(p.styles) ? p.styles : [],
    score: p.score ?? p.matchScore ?? 70,
    nsfw: !!p.nsfw,
    looking: Array.isArray(p.looking) ? p.looking : [],
    zodiac: p.zodiac || "",
    chinese: p.chinese || "",
    mbti: p.mbti || "",
    lifePath: p.lifePath ?? p.life_path ?? "",
    photos: Array.isArray(p.photos) ? p.photos : [],
    collabs: p.collabs || 0,
    verified: !!p.verified,
    matchScore: p.matchScore,
    rulesScore: p.rulesScore,
    cosineScore: p.cosineScore,
    showDistance: p.showDistance !== false,
    side: p.side || viewerSide(p.type),
  } as NormalizedProfile;
}

export function normalizeCommunity(c: RawCommunityInput) {
  return {
    ...c,
    members: c.members ?? c.member_count ?? 0,
    desc: c.desc ?? c.description ?? "",
    cat: c.cat ?? c.category ?? "",
    nsfw: c.nsfw ?? c.is_nsfw ?? false,
  };
}

export function normalizeEvent(e: RawEventInput) {
  return {
    ...e,
    desc: e.desc ?? e.description ?? "",
    loc: e.loc ?? e.location ?? "",
    nsfw: e.nsfw ?? e.is_nsfw ?? false,
  };
}

export function normalizeForumPost(p: RawForumPostInput) {
  return {
    ...p,
    author: p.author ?? p.author_id?.name ?? "Creative",
    avatar: p.avatar ?? p.author_id?.avatar ?? "",
    cat: p.cat ?? p.category ?? "General",
    comments: Array.isArray(p.comments) ? p.comments : [],
    time: p.time ?? (p.created_at ? new Date(p.created_at).toLocaleString() : "Just now"),
  };
}

export function normalizeBrief(b: RawBriefInput) {
  // muse_brief_applications(count) comes back as [{ count: N }] (PostgREST
  // embedded-count shape) or already-normalized as a plain number if this
  // row has been through normalizeBrief before (idempotent, like the other
  // normalizers here).
  const rawCount = b.muse_brief_applications;
  const applicantCount = typeof b.applicantCount === "number"
    ? b.applicantCount
    : (Array.isArray(rawCount) ? (rawCount[0]?.count ?? 0) : 0);
  return {
    ...b,
    desc: b.desc ?? b.description ?? "",
    cat: b.cat ?? b.category ?? "concept",
    author: b.author ?? b.author_id?.name ?? "Creative",
    authorImg: b.authorImg ?? b.author_id?.avatar ?? "",
    applicantCount,
  } as NormalizedBrief;
}

export function normalizeSession(s: RawSessionInput) {
  return {
    ...s,
    name: s.name ?? s.title ?? "Creative Pro",
    sessions: s.sessions ?? 0,
    hostVerified: !!s.hostVerified,
    hostCompletedSessions: s.hostCompletedSessions ?? 0,
  };
}

/**
 * Normalizes a raw `muse_feed_posts` row (DB shape, joined author, UUID id)
 * into the flat shape FeedScreen.tsx expects from its hardcoded demo posts
 * (`feedPostsStatic`) and locally-created posts (`feedPosts`) — author/avatar
 * pulled out of the join, a human `time` string plus a numeric `createdAt`
 * sort key (real post ids are UUIDs, not sortable via subtraction the way
 * the demo posts' numeric ids are).
 *
 * Idempotent like the other normalizers here (`??` fallback chains): safe to
 * call on a row that's already been normalized, since bootstrapData and
 * useFeedData's own fetch both currently hit `type=feed` independently and
 * whichever resolves last must not clobber the other with an unnormalized
 * shape — that mismatch (raw `author_id` object vs a plain `author` string)
 * previously caused blank author names/avatars and undeduped double posts
 * whenever bootstrapData's fetch won the race.
 */
export function normalizeFeedPost(p: RawFeedPostInput, profileId?: string | null) {
  const author = p.author_id || {};
  const createdAtMs = p.createdAt ?? (p.created_at ? new Date(p.created_at).getTime() : Date.now());
  return {
    ...p,
    id: p.id,
    author: p.author ?? author.name ?? "Musa",
    avatar: p.avatar ?? author.avatar ?? "",
    authorVerified: p.authorVerified ?? !!author.verified,
    rid: p.rid ?? author.id,
    type: p.type ?? (p.img ? "photo" : "text"),
    text: p.text ?? "",
    img: p.img ?? undefined,
    media: p.media ?? (p.img ? [p.img] : []),
    likes: p.likes ?? 0,
    comments: p.comments ?? 0,
    shares: p.shares ?? 0,
    views: typeof p.views === "number" ? p.views : undefined,
    liked: p.liked ?? !!(profileId && Array.isArray(p.liked_by) && p.liked_by.includes(profileId)),
    saved: p.saved ?? false,
    reactions: p.reactions ?? {},
    time: p.time ?? (p.created_at ? new Date(p.created_at).toLocaleDateString() : ""),
    createdAt: createdAtMs,
    isBts: p.isBts ?? (p.type === "video" && !p.text),
    lastSeen: p.lastSeen ?? author.last_seen_at ?? undefined,
  };
}
