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

const PRIVATE_ALBUM_PREFIX = "storage://muse-private/";
const isPrivateAlbumObject = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith(PRIVATE_ALBUM_PREFIX) && value.length > PRIVATE_ALBUM_PREFIX.length;
const isPrivateAlbumObjectForOwner = (value: unknown, profileId: unknown): value is string =>
  isPrivateAlbumObject(value) && value.slice(PRIVATE_ALBUM_PREFIX.length).startsWith(`${String(profileId)}/`);

type OwnedStorageObject = { bucket: "muse-private" | "muse-uploads"; path: string };
type StorageCleanupFailure = OwnedStorageObject & { error: string };

function isSafeStoragePath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("..") || path.includes("\\") || path.includes("\0")) return false;
  return path.split("/").every((seg) => seg.length > 0);
}

function storageHostFromEnv(): string {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0];
}

/**
 * Resolve a stored media value to an owned bucket+path, or null.
 * - Private album media: storage://muse-private/<profileId>/...
 * - Generic/public bucket: Muse-hosted public object URL under <profileId>/...
 * Foreign owners, traversal, non-Muse hosts, and non-URL junk are rejected.
 * Client-supplied bucket names never pass through this function.
 */
export function parseOwnedAlbumStorageLocator(
  value: unknown,
  profileId: string,
  storageHost: string = storageHostFromEnv(),
): OwnedStorageObject | null {
  if (typeof value !== "string" || !value) return null;

  if (value.startsWith(PRIVATE_ALBUM_PREFIX)) {
    const path = value.slice(PRIVATE_ALBUM_PREFIX.length);
    if (!isSafeStoragePath(path)) return null;
    if (!path.startsWith(`${profileId}/`)) return null;
    return { bucket: "muse-private", path };
  }

  if (!/^https?:\/\//i.test(value) || !storageHost) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.hostname !== storageHost && !url.hostname.endsWith(`.${storageHost}`)) return null;

  const markers = ["/storage/v1/object/public/muse-uploads/", "/storage/v1/object/sign/muse-uploads/", "/muse-uploads/"];
  for (const marker of markers) {
    const idx = value.indexOf(marker);
    if (idx === -1) continue;
    const path = value.slice(idx + marker.length).split(/[?#]/)[0];
    if (!isSafeStoragePath(path)) return null;
    if (!path.startsWith(`${profileId}/`)) return null;
    return { bucket: "muse-uploads", path };
  }
  return null;
}

function collectOwnedLocators(values: Array<unknown>, profileId: string): OwnedStorageObject[] {
  const seen = new Set<string>();
  const out: OwnedStorageObject[] = [];
  for (const value of values) {
    const parsed = parseOwnedAlbumStorageLocator(value, profileId);
    if (!parsed) continue;
    const key = `${parsed.bucket}:${parsed.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

async function removeOwnedStorageObjects(
  sb: ActionContext["sb"],
  objects: OwnedStorageObject[],
): Promise<StorageCleanupFailure[]> {
  const failed: StorageCleanupFailure[] = [];
  const byBucket = new Map<string, string[]>();
  for (const obj of objects) {
    const list = byBucket.get(obj.bucket) || [];
    list.push(obj.path);
    byBucket.set(obj.bucket, list);
  }
  for (const [bucket, paths] of byBucket) {
    try {
      const { error } = await sb.storage.from(bucket).remove(paths);
      if (error) {
        const message = String((error as { message?: string }).message || error);
        for (const path of paths) failed.push({ bucket: bucket as OwnedStorageObject["bucket"], path, error: message });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      for (const path of paths) failed.push({ bucket: bucket as OwnedStorageObject["bucket"], path, error: message });
    }
  }
  return failed;
}

async function enqueueStorageCleanupJobs(
  sb: ActionContext["sb"],
  failures: StorageCleanupFailure[],
  meta: { profileId: string; reason: string; albumId?: string; photoId?: string },
): Promise<boolean> {
  if (failures.length === 0) return true;
  try {
    for (const failure of failures) {
      const { error } = await sb.from("muse_storage_cleanup_jobs").upsert(
        {
          bucket: failure.bucket,
          path: failure.path,
          reason: meta.reason,
          profile_id: meta.profileId,
          album_id: meta.albumId ?? null,
          photo_id: meta.photoId ?? null,
          attempts: 1,
          last_error: failure.error,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "bucket,path" },
      );
      if (error) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function cleanupOwnedAlbumMedia(
  sb: ActionContext["sb"],
  locators: OwnedStorageObject[],
  meta: { profileId: string; reason: string; albumId?: string; photoId?: string },
): Promise<{ queued: boolean; pending: number }> {
  if (locators.length === 0) return { queued: true, pending: 0 };
  const failures = await removeOwnedStorageObjects(sb, locators);
  if (failures.length === 0) return { queued: true, pending: 0 };
  const queued = await enqueueStorageCleanupJobs(sb, failures, meta);
  return { queued, pending: failures.length };
}

export async function albumCreate({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "create-album", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const vErr = validateInput(rest);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
  const { title, description, cover_url, access_level, tags } = rest;
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const level = ["public", "private", "invite"].includes(access_level as string) ? access_level : "public";
  if (level !== "public" && cover_url && !isPrivateAlbumObjectForOwner(cover_url, profile.id)) {
    return NextResponse.json({ error: "Private and invite albums require private Muse media" }, { status: 400 });
  }
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
  const { data: existing } = await sb.from("muse_albums").select("profile_id, cover_url, access_level").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = String(title).slice(0, 200);
  if (description !== undefined) updates.description = String(description).slice(0, 2000);
  const nextAccessLevel = access_level !== undefined && ["public", "private", "invite"].includes(access_level as string)
    ? access_level as string
    : existing.access_level;
  if (cover_url !== undefined) {
    if (nextAccessLevel !== "public" && cover_url && !isPrivateAlbumObjectForOwner(cover_url, profile.id)) {
      return NextResponse.json({ error: "Private and invite albums require private Muse media" }, { status: 400 });
    }
    updates.cover_url = cover_url;
  }
  if (access_level !== undefined && ["public", "private", "invite"].includes(access_level as string)) {
    if (access_level !== "public") {
      const { data: photos } = await sb.from("muse_album_photos").select("img_url").eq("album_id", albumId);
      const nextCoverUrl = cover_url !== undefined ? cover_url : (existing as any).cover_url;
      const hasPublicMedia = (photos || []).some((photo: any) => !isPrivateAlbumObjectForOwner(photo.img_url, profile.id));
      if (hasPublicMedia || (nextCoverUrl && !isPrivateAlbumObjectForOwner(nextCoverUrl, profile.id))) {
        return NextResponse.json({ error: "Re-upload existing album media before making this album private" }, { status: 409 });
      }
    }
    updates.access_level = access_level;
  }
  if (tags !== undefined && Array.isArray(tags)) updates.tags = tags.slice(0, 20);
  const { error } = await sb.from("muse_albums").update(updates).eq("id", albumId);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
}

export async function albumDelete({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "delete-album", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId } = rest;
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  const { data: existing } = await sb.from("muse_albums")
    .select("profile_id, cover_url")
    .eq("id", albumId)
    .maybeSingle();
  // Idempotent: a missing album is already deleted; only a foreign-owned row is forbidden.
  if (!existing) return NextResponse.json({ success: true, alreadyDeleted: true });
  if (String(existing.profile_id) !== String(profile.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: photos } = await sb.from("muse_album_photos")
    .select("img_url")
    .eq("album_id", albumId);
  const ownerProfileId = String(profile.id);
  const locators = collectOwnedLocators(
    [existing.cover_url, ...(photos || []).map((p: { img_url?: unknown }) => p?.img_url)],
    ownerProfileId,
  );
  const { error } = await sb.from("muse_albums").delete().eq("id", albumId);
  if (error) return safeServerError(error, "db op");
  const cleanup = await cleanupOwnedAlbumMedia(sb, locators, {
    profileId: ownerProfileId,
    reason: "album_delete",
    albumId: String(albumId),
  });
  if (!cleanup.queued) {
    return NextResponse.json({
      error: "Album deleted, but storage cleanup could not be recorded for retry",
      code: "STORAGE_CLEANUP_UNRECORDED",
      pending: cleanup.pending,
    }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    cleanedStorage: locators.length - cleanup.pending,
    pendingCleanup: cleanup.pending,
  });
}

export async function albumAddPhoto({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "add-album-photo", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { albumId, img_url, caption } = rest;
  if (!albumId || !img_url) return NextResponse.json({ error: "albumId and img_url required" }, { status: 400 });
  const storageHost = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/^https?:\/\//, "").split("/")[0];
  if (!isPrivateAlbumObject(img_url) && storageHost && !String(img_url).includes(storageHost)) {
    return NextResponse.json({ error: "Images must be uploaded through Muse" }, { status: 400 });
  }
  const { data: existing } = await sb.from("muse_albums").select("profile_id, access_level").eq("id", albumId).maybeSingle();
  if (!existing || String(existing.profile_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (existing.access_level !== "public" && !isPrivateAlbumObjectForOwner(img_url, profile.id)) {
    return NextResponse.json({ error: "Private and invite albums require private Muse media" }, { status: 400 });
  }
  const { count } = await sb.from("muse_album_photos").select("*", { count: "exact", head: true }).eq("album_id", albumId);
  const { data, error } = await sb.from("muse_album_photos").insert({ album_id: albumId, img_url, caption: String(caption || "").slice(0, 500), position: count ?? 0 }).select().single();
  if (error) return safeServerError(error, "db op");
  // The owner needs an immediately renderable URL for optimistic UI; persist
  // only the internal locator and expose a short-lived signed URL in response.
  if (data && isPrivateAlbumObject(data.img_url)) {
    const path = data.img_url.slice(PRIVATE_ALBUM_PREFIX.length);
    const { data: signed } = await sb.storage.from("muse-private").createSignedUrl(path, 3600);
    return NextResponse.json({ success: true, photo: { ...data, img_url: signed?.signedUrl || "" } });
  }
  return NextResponse.json({ success: true, photo: data });
}

export async function albumRemovePhoto({ sb, profile, rest, ip }: ActionContext) {
  if (!await checkRate(ip, "remove-album-photo", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { photoId } = rest;
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });
  const { data: photo } = await sb.from("muse_album_photos")
    .select("album_id, img_url")
    .eq("id", photoId)
    .maybeSingle();
  // Idempotent: missing photo row is already removed.
  if (!photo) return NextResponse.json({ success: true, alreadyDeleted: true });
  const { data: album } = await sb.from("muse_albums").select("profile_id").eq("id", photo.album_id).maybeSingle();
  if (!album || String(album.profile_id) !== String(profile.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ownerProfileId = String(profile.id);
  const locators = collectOwnedLocators([photo.img_url], ownerProfileId);
  const { error } = await sb.from("muse_album_photos").delete().eq("id", photoId);
  if (error) return safeServerError(error, "db op");
  const cleanup = await cleanupOwnedAlbumMedia(sb, locators, {
    profileId: ownerProfileId,
    reason: "remove_photo",
    albumId: String(photo.album_id),
    photoId: String(photoId),
  });
  if (!cleanup.queued) {
    return NextResponse.json({
      error: "Photo deleted, but storage cleanup could not be recorded for retry",
      code: "STORAGE_CLEANUP_UNRECORDED",
      pending: cleanup.pending,
    }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    cleanedStorage: locators.length - cleanup.pending,
    pendingCleanup: cleanup.pending,
  });
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
  if (album.access_level === "private" && String(album.profile_id) !== String(profile.id)) {
    return NextResponse.json({ error: "Album is private" }, { status: 403 });
  }
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
  // Notify the album owner (skip self-likes).
  const ownerId = album.profile_id;
  if (ownerId && String(ownerId) !== String(profile.id)) {
    await sb.from("muse_notifications").insert({ user_id: String(ownerId), from_id: profile.id, type: "like", body: `${profile.name} liked your album`, read: false });
  }
  return NextResponse.json({ success: true });
}
