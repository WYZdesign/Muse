"use client";
import { useEffect, useState, useCallback } from "react";

type Album = {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  access_level: "public" | "private" | "invite";
  tags: string[];
  photo_count: number;
  view_count: number;
  like_count: number;
};

type AlbumPhoto = { id: string; img_url: string; caption: string; position: number };

/**
 * Model Mayhem-style portfolio browser. Shown when scrolling down on a
 * profile — separate from the profile's top-level swipe photos. Albums the
 * viewer isn't permitted to see (private, or invite-only without a grant)
 * are simply never returned by the API, so they render as if they don't
 * exist rather than showing a locked placeholder — matching the requested
 * "full autonomy on who sees what" behavior.
 */
export default function AlbumGallery({ profileId, authToken }: { profileId: string | number; authToken?: string }) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [enlargedIdx, setEnlargedIdx] = useState(0);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    fetch(`/api/muse?type=albums&profile_id=${encodeURIComponent(String(profileId))}`, { headers })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const list: Album[] = Array.isArray(d.albums) ? d.albums : [];
        setAlbums(list);
        if (list.length) setSelectedId(list[0].id);
      })
      .catch(() => { if (!cancelled) setAlbums([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profileId, authToken]);

  const loadPhotos = useCallback((albumId: string) => {
    setPhotosLoading(true);
    setError(null);
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    fetch(`/api/muse?type=album-photos&album_id=${encodeURIComponent(albumId)}`, { headers })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) { setError(d.error || "Unable to load album"); setPhotos([]); return; }
        setPhotos(Array.isArray(d.photos) ? d.photos : []);
        setEnlargedIdx(0);
      })
      .catch(() => { setError("Unable to load album"); setPhotos([]); })
      .finally(() => setPhotosLoading(false));
  }, [authToken]);

  useEffect(() => {
    if (selectedId) loadPhotos(selectedId);
  }, [selectedId, loadPhotos]);

  if (loading) return null;
  if (!albums.length) return null;

  return (
    <div className="album-gallery">
      <div className="section-title" style={{ marginBottom: 10 }}>Portfolio</div>
      <div className="album-tabs">
        {albums.map(a => (
          <button
            key={a.id}
            className={"album-tab" + (selectedId === a.id ? " active" : "")}
            onClick={() => setSelectedId(a.id)}
          >
            {a.cover_url && <img className="album-tab-cover" src={a.cover_url} alt="" />}
            <span>{a.title}</span>
            <span className="album-tab-count">{a.photo_count}</span>
          </button>
        ))}
      </div>

      {error && <div className="album-error">{error}</div>}

      {!error && photosLoading && <div className="album-loading">Loading album…</div>}

      {!error && !photosLoading && photos.length > 0 && (
        <>
          <div className="album-grid">
            {photos.map((p, i) => (
              <button
                key={p.id}
                className={"album-thumb" + (i === enlargedIdx ? " active" : "")}
                onClick={() => setEnlargedIdx(i)}
              >
                <img src={p.img_url} alt={p.caption || ""} />
              </button>
            ))}
          </div>
          <div className="album-enlarged">
            <img src={photos[enlargedIdx]?.img_url} alt={photos[enlargedIdx]?.caption || ""} />
            {photos[enlargedIdx]?.caption && <div className="album-caption">{photos[enlargedIdx].caption}</div>}
          </div>
        </>
      )}

      {!error && !photosLoading && photos.length === 0 && (
        <div className="album-loading">No photos in this album yet.</div>
      )}
    </div>
  );
}
