"use client";

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
  };
}
