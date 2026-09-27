"use client";

import { useEffect, useState } from "react";
import { trackError } from "@/lib/errorTracker";

export type CardAlbum = {
  id: string;
  title: string;
  cover_url: string;
  access_level: string;
  photo_count: number;
};

/**
 * Album + album-photo loading for the active Discover card, extracted verbatim
 * from page.tsx's two adjacent effects. Same order, same guards/early-returns,
 * same cancelled-flag cleanup and same dependency arrays. `filteredProfiles` is
 * only read for the current card's id, so a structural type keeps the hook
 * decoupled from the page-local DiscoveryProfile type.
 */
export type UseCardAlbumPhotosArgs = {
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  filteredProfiles: ReadonlyArray<{ id?: string | number }>;
  currentIdx: number;
};

export function useCardAlbumPhotos({
  apiFetch,
  filteredProfiles,
  currentIdx,
}: UseCardAlbumPhotosArgs) {
  const [cardAlbums, setCardAlbums] = useState<CardAlbum[]>([]);
  const [cardAlbumIdx, setCardAlbumIdx] = useState(0);
  const [cardAlbumPhotos, setCardAlbumPhotos] = useState<string[]>([]);

  useEffect(() => {
    const profile = filteredProfiles[currentIdx];
    if (!profile?.id) { setCardAlbums([]); setCardAlbumPhotos([]); return; }
    let cancelled = false;
    apiFetch(`/api/muse?type=albums&profile_id=${encodeURIComponent(profile.id)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const albums = d.albums || [];
        setCardAlbums(albums);
        if (albums.length > 0) setCardAlbumIdx(0);
      })
      .catch((err) => { trackError("fetch_albums", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [currentIdx, filteredProfiles, apiFetch]);

  useEffect(() => {
    if (cardAlbumIdx === 0) { setCardAlbumPhotos([]); return; }
    const album = cardAlbums[cardAlbumIdx - 1];
    if (!album?.id) return;
    let cancelled = false;
    apiFetch(`/api/muse?type=album-photos&album_id=${encodeURIComponent(album.id)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setCardAlbumPhotos((d.photos || []).map((p: { img_url: string }) => p.img_url));
      })
      .catch((err) => { trackError("fetch_album_photos", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [cardAlbumIdx, cardAlbums, apiFetch]);

  return { cardAlbums, setCardAlbums, cardAlbumIdx, setCardAlbumIdx, cardAlbumPhotos, setCardAlbumPhotos };
}
