// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — ALBUMS
// Extracted from api/muse/route.ts (monolith). Handlers are exported functions;
// the monolith's ACTIONS registry still dispatches them, so POST URL / frontend
// call sites are UNCHANGED. Phase-1 decoupling: code leaves the monolith file,
// the dispatch wiring stays put and safe.
// ══════════════════════════════════════════════════════════════════════════════
import { NextResponse } from "next/server";
import { checkRate } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/http";
import { validateInput, type ActionContext } from "./shared";

export async function albumCreate({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "create-album", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const vErr = validateInput(rest);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
  const { title, description, cover_url, access_level, tags } = rest;
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const level = ["public", "private", "invite"].includes(access_level as string) ? access_level : "public";
  const { data, error } = await sb.from("muse_albums").insert({
    profile_id: profile.id, title: (title as string).trim(), description: description || "",
    cover_url: cover_url || "", access_level: level, tags: Array.isArray(tags) ? tags.slice(0, 20) : [],
  }).select().single();
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, album: data });
}

export async function albumUpdate({ sb, profile, rest }: ActionContext) {
  const { albumId, title, description, cover_url, access_level, tags } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = String(title).slice(0, 200);
  if (description !== undefined) updates.description = String(description).slice(0, 2000);
  if (cover_url !== undefined) updates.cover_url = cover_url;
  if (access_level !== undefined && ["public", "private", "invite"].includes(access_level as string)) updates.access_level = access_level;
  if (tags !== undefined && Array.isArray(tags)) updates.tags = tags.slice(0, 20);
  const { error } = await sb.from("muse_albums").update(updates).eq("id", albumId);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
}

export async function albumDelete({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "delete-album", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { error } = await sb.from("muse_albums").delete().eq("id", albumId);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
}

export async function albumAddPhoto({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "add-album-photo", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId, img_url, caption } = rest;
  if (!albumId || !img_url) return NextResponse.json({ error: "albumId and img_url required" }, { status: 400 });
  const storageHost = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/^https?:\/\//, "").split("/")[0];
  if (storageHost && !String(img_url).includes(storageHost)) {
    return NextResponse.json({ error: "Images must be uploaded through Muse" }, { status: 400 });
  }
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { count } = await sb.from("muse_album_photos").select("*", { count: "exact", head: true }).eq("album_id", albumId);
  const { data, error } = await sb.from("muse_album_photos").insert({ album_id: albumId, img_url, caption: String(caption || "").slice(0, 500), position: count ?? 0 }).select().single();
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, photo: data });
}

export async function albumRemovePhoto({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "remove-album-photo", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { photoId } = rest;
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });
  const { data: photo } = await sb.from("muse_album_photos").select("album_id").eq("id", photoId).maybeSingle();
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: album } = await sb.from("muse_albums").select("profile_id").eq("id", photo.album_id).maybeSingle();
  if (!album || String(album.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { error } = await sb.from("muse_album_photos").delete().eq("id", photoId);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
}

export async function albumGrantAccess({ sb, profile, rest }: ActionContext) {
  const { albumId, viewerProfileId } = rest;
  if (!albumId || !viewerProfileId) return NextResponse.json({ error: "albumId and viewerProfileId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { error } = await sb.from("muse_album_access").upsert({ album_id: albumId, viewer_profile_id: viewerProfileId }, { onConflict: "album_id,viewer_profile_id", ignoreDuplicates: true });
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
}

export async function albumRevokeAccess({ sb, profile, rest }: ActionContext) {
  const { albumId, viewerProfileId } = rest;
  if (!albumId || !viewerProfileId) return NextResponse.json({ error: "albumId and viewerProfileId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await sb.from("muse_album_access").delete().eq("album_id", albumId).eq("viewer_profile_id", viewerProfileId);
  return NextResponse.json({ success: true });
}

export async function albumListAccess({ sb, profile, rest }: ActionContext) {
  const { albumId } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums").select("profile_id").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data } = await sb.from("muse_album_access").select("viewer_profile_id, granted_at, viewer_profile_id(id, name, avatar)").eq("album_id", albumId);
  return NextResponse.json({ access: data || [] });
}

export async function albumView({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "view-album", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: album } = await sb.from("muse_albums").select("view_count, access_level, profile_id").eq("id", albumId).maybeSingle();
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (album.access_level === "private") return NextResponse.json({ error: "Album is private" }, { status: 403 });
  if (album.access_level === "invite") {
    const { data: access } = await sb.from("muse_album_access").select("id").eq("album_id", albumId).eq("viewer_profile_id", profile.id).limit(1);
    if (!access || access.length === 0) return NextResponse.json({ error: "Album is invite-only" }, { status: 403 });
  }
  await sb.from("muse_albums").update({ view_count: (album.view_count || 0) + 1 }).eq("id", albumId);
  return NextResponse.json({ success: true });
}

export async function albumLike({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "like-album", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: album } = await sb.from("muse_albums").select("like_count, access_level, profile_id").eq("id", albumId).maybeSingle();
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (album.access_level === "private" && String(album.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Album is private" }, { status: 403 });
  if (album.access_level === "invite") {
    const { data: access } = await sb.from("muse_album_access").select("id").eq("album_id", albumId).eq("viewer_profile_id", profile.id).maybeSingle();
    if (!access && String(album.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Album is invite-only" }, { status: 403 });
  }
  const { data: existingLike } = await sb.from("muse_album_likes").select("id").eq("album_id", albumId).eq("user_id", profile.id).maybeSingle();
  if (existingLike) return NextResponse.json({ success: true, alreadyLiked: true });
  await sb.from("muse_album_likes").insert({ album_id: albumId, user_id: profile.id });
  const { count } = await sb.from("muse_album_likes").select("*", { count: "exact", head: true }).eq("album_id", albumId);
  await sb.from("muse_albums").update({ like_count: (count ?? 0) }).eq("id", albumId);
  return NextResponse.json({ success: true });
}
