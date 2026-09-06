"use client";

import { viewerSide } from "@/lib/role";

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
export function normalizeProfile(p: any) {
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
  };
}

export function normalizeCommunity(c: any) {
  return {
    ...c,
    members: c.members ?? c.member_count ?? 0,
    desc: c.desc ?? c.description ?? "",
    cat: c.cat ?? c.category ?? "",
    nsfw: c.nsfw ?? c.is_nsfw ?? false,
  };
}

export function normalizeEvent(e: any) {
  return {
    ...e,
    desc: e.desc ?? e.description ?? "",
    loc: e.loc ?? e.location ?? "",
    nsfw: e.nsfw ?? e.is_nsfw ?? false,
  };
}

export function normalizeForumPost(p: any) {
  return {
    ...p,
    author: p.author ?? p.author_id?.name ?? "Creative",
    avatar: p.avatar ?? p.author_id?.avatar ?? "",
    cat: p.cat ?? p.category ?? "General",
    comments: Array.isArray(p.comments) ? p.comments : [],
    time: p.time ?? (p.created_at ? new Date(p.created_at).toLocaleString() : "Just now"),
  };
}

export function normalizeBrief(b: any) {
  return {
    ...b,
    desc: b.desc ?? b.description ?? "",
    cat: b.cat ?? b.category ?? "concept",
    author: b.author ?? b.author_id?.name ?? "Creative",
    authorImg: b.authorImg ?? b.author_id?.avatar ?? "",
  };
}

export function normalizeSession(s: any) {
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
export function normalizeFeedPost(p: any, profileId?: string | null) {
  const author = p.author_id || {};
  const createdAtMs = p.createdAt ?? (p.created_at ? new Date(p.created_at).getTime() : Date.now());
  return {
    ...p,
    id: p.id,
    author: p.author ?? author.name ?? "Muse",
    avatar: p.avatar ?? author.avatar ?? "",
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
