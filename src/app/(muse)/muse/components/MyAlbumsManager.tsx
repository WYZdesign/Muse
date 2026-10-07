"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { FiPlus, FiLock, FiGlobe, FiUsers, FiTrash2, FiX, FiStar } from "react-icons/fi";
import { authFetch } from "../lib/api";
import { useFocusTrap } from "../hooks/useFocusTrap";

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

const ACCESS_META: Record<string, { icon: React.ReactNode; label: string }> = {
  public: { icon: <FiGlobe size={12} />, label: "Public" },
  private: { icon: <FiLock size={12} />, label: "Private" },
  invite: { icon: <FiUsers size={12} />, label: "Invite Only" },
};
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

// Populated demo portfolio. Owner requirement: demo mode must look published,
// so the Portfolio screen shows real albums + photos instead of the
// "Album management is unavailable in this demo" placeholder.
const DEMO_ALBUMS: Album[] = [
  { id: "demo-a1", title: "Editorial", description: "Commissioned and personal editorial work.", cover_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600", access_level: "public", tags: ["editorial", "studio"], photo_count: 3, view_count: 1284, like_count: 96 },
  { id: "demo-a2", title: "Portrait", description: "Natural-light portraits shot on location.", cover_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600", access_level: "public", tags: ["portrait", "natural light"], photo_count: 3, view_count: 962, like_count: 71 },
  { id: "demo-a3", title: "Fashion", description: "Styled test shoots with emerging designers.", cover_url: "https://images.unsplash.com/photo-1524253482453-3fed8d2fe12b?w=600", access_level: "invite", tags: ["fashion", "styled"], photo_count: 3, view_count: 508, like_count: 44 },
];
const DEMO_ALBUM_PHOTOS: Record<string, AlbumPhoto[]> = {
  "demo-a1": [
    { id: "demo-a1-p1", img_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800", caption: "Rooftop editorial", position: 0 },
    { id: "demo-a1-p2", img_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800", caption: "Studio, one light", position: 1 },
    { id: "demo-a1-p3", img_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800", caption: "Window light test", position: 2 },
  ],
  "demo-a2": [
    { id: "demo-a2-p1", img_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800", caption: "Golden hour", position: 0 },
    { id: "demo-a2-p2", img_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800", caption: "Backlit", position: 1 },
    { id: "demo-a2-p3", img_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800", caption: "Location scout", position: 2 },
  ],
  "demo-a3": [
    { id: "demo-a3-p1", img_url: "https://images.unsplash.com/photo-1524253482453-3fed8d2fe12b?w=800", caption: "Runway inspired", position: 0 },
    { id: "demo-a3-p2", img_url: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800", caption: "Editorial styling", position: 1 },
    { id: "demo-a3-p3", img_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800", caption: "Studio look", position: 2 },
  ],
};

/**
 * Full album management for the signed-in user's own profile: create/delete
 * albums, set per-album privacy (public / private / invite-only), upload
 * and remove photos, and — for invite-only albums — grant or revoke access
 * to specific matched profiles. This is the owner-side counterpart to
 * AlbumGallery (which is the read-only viewer shown on other people's cards).
 */
export default function MyAlbumsManager({
  authToken,
  uploadImage,
  showToast,
  matchOptions,
}: {
  authToken: string;
  uploadImage: (file: File, folder: string) => Promise<string | null>;
  showToast: (msg: string) => void;
  matchOptions: { id: string | number; name: string; avatar?: string }[];
}) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAccess, setNewAccess] = useState<"public" | "private" | "invite">("public");
  const [accessList, setAccessList] = useState<{ viewer_profile_id: string }[]>([]);
  const [showInviteManager, setShowInviteManager] = useState(false);
  const inviteManagerTrap = useFocusTrap(showInviteManager, () => setShowInviteManager(false));
  const createAlbumTrap = useFocusTrap(showCreate, () => setShowCreate(false));
  const [liked, setLiked] = useState(false);
  const albumReqId = useRef(0);

  const authedFetch = useCallback((body: Record<string, unknown>) =>
    DEMO_MODE
      ? Promise.resolve({ success: false, error: "Album management is unavailable in this demo." })
      : authFetch("/api/muse", { method: "POST", body: JSON.stringify(body) }).then(r => r.json())
  , []);

  const refreshAlbums = useCallback(() => {
    if (DEMO_MODE) { setAlbums(DEMO_ALBUMS); setLoading(false); return; }
    if (!authToken) { setLoading(false); return; }
    authFetch("/api/muse?type=albums&profile_id=me")
      .then(r => r.json())
      .then(d => setAlbums(Array.isArray(d.albums) ? d.albums : []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false));
  }, [authToken]);

  useEffect(() => { refreshAlbums(); }, [refreshAlbums]);

  const openAlbum = useCallback((album: Album) => {
    setSelected(album);
    setLiked(false);
    const reqId = ++albumReqId.current;
    if (DEMO_MODE) { setPhotos(DEMO_ALBUM_PHOTOS[album.id] || []); return; }
    authFetch(`/api/muse?type=album-photos&album_id=${album.id}`)
      .then(r => r.json())
      .then(d => { if (reqId === albumReqId.current) setPhotos(Array.isArray(d.photos) ? d.photos : []); })
      .catch(() => {});
    authedFetch({ action: "view-album", albumId: album.id }).catch(() => {});
  }, [authFetch, authedFetch]);

  const likeAlbum = useCallback(async () => {
    if (!selected) return;
    const d = await authedFetch({ action: "like-album", albumId: selected.id });
    if (d.success || d.alreadyLiked) {
      setLiked(true);
      setSelected(prev => prev ? { ...prev, like_count: (prev.like_count || 0) + (d.alreadyLiked ? 0 : 1) } : prev);
      refreshAlbums();
    } else {
      showToast(d.error || "Failed to like");
    }
  }, [selected, authedFetch, refreshAlbums, showToast]);

  const createAlbum = useCallback(async () => {
    if (!newTitle.trim()) { showToast("Album title required"); return; }
    const d = await authedFetch({ action: "create-album", title: newTitle.trim(), access_level: newAccess });
    if (d.success) {
      showToast("Album created");
      setShowCreate(false);
      setNewTitle("");
      setNewAccess("public");
      refreshAlbums();
    } else {
      showToast(d.error || "Failed to create album");
    }
  }, [newTitle, newAccess, authedFetch, showToast, refreshAlbums]);

  const deleteAlbum = useCallback(async (albumId: string) => {
    const d = await authedFetch({ action: "delete-album", albumId });
    if (d.success) {
      showToast("Album deleted");
      setSelected(null);
      refreshAlbums();
    } else {
      showToast(d.error || "Failed to delete album");
    }
  }, [authedFetch, showToast, refreshAlbums]);

  const changeAccess = useCallback(async (albumId: string, access_level: string) => {
    const d = await authedFetch({ action: "update-album", albumId, access_level });
    if (d.success) {
      refreshAlbums();
      setSelected(prev => prev ? { ...prev, access_level: access_level as Album["access_level"] } : prev);
      showToast("Privacy updated");
    } else {
      showToast(d.error || "Failed to update");
    }
  }, [authedFetch, refreshAlbums, showToast]);

  const addPhoto = useCallback(async (file: File) => {
    if (!selected) return;
    const url = await uploadImage(file, "album");
    if (!url) return;
    const d = await authedFetch({ action: "add-album-photo", albumId: selected.id, img_url: url });
    if (d.success) {
      setPhotos(prev => [...prev, d.photo]);
      refreshAlbums();
    } else {
      showToast(d.error || "Failed to add photo");
    }
  }, [selected, uploadImage, authedFetch, refreshAlbums, showToast]);

  const removePhoto = useCallback(async (photoId: string) => {
    const d = await authedFetch({ action: "remove-album-photo", photoId });
    if (d.success) setPhotos(prev => prev.filter(p => p.id !== photoId));
  }, [authedFetch]);

  const openInviteManager = useCallback(async () => {
    if (!selected) return;
    const d = await authedFetch({ action: "list-album-access", albumId: selected.id });
    setAccessList(Array.isArray(d.access) ? d.access : []);
    setShowInviteManager(true);
  }, [selected, authedFetch]);

  const toggleGrant = useCallback(async (viewerProfileId: string, hasAccess: boolean) => {
    if (!selected) return;
    const action = hasAccess ? "revoke-album-access" : "grant-album-access";
    await authedFetch({ action, albumId: selected.id, viewerProfileId });
    const d = await authedFetch({ action: "list-album-access", albumId: selected.id });
    setAccessList(Array.isArray(d.access) ? d.access : []);
  }, [selected, authedFetch]);

  // NOTE: the old `if (DEMO_MODE) return <div>…unavailable in this demo…</div>`
  // placeholder is gone — demo now renders the real album UI seeded with
  // DEMO_ALBUMS / DEMO_ALBUM_PHOTOS above.
  if (loading) return <div className="album-loading">Loading your albums…</div>;

  if (selected) {
    const grantedIds = new Set(accessList.map(a => a.viewer_profile_id));
    return (
      <div className="my-albums-detail">
        <div className="my-albums-detail-hdr">
          <button className="hdr-btn" onClick={() => setSelected(null)} aria-label="Close"><FiX size={18} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.title}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{selected.photo_count} photos · {selected.view_count} views · {selected.like_count} likes</div>
          </div>
          <button className="hdr-btn" onClick={likeAlbum} aria-label="Like album" style={{ color: liked ? "var(--gold)" : undefined }}><FiStar size={16} /></button>
                <button className="hdr-btn" aria-label="Delete album" onClick={() => deleteAlbum(selected.id)}><FiTrash2 size={16} /></button>
        </div>

        <div className="album-access-row">
          {(["public", "private", "invite"] as const).map(level => (
            <button
              key={level}
              className={"access-pill" + (selected.access_level === level ? " active" : "")}
              onClick={() => changeAccess(selected.id, level)}
            >
              {ACCESS_META[level].icon} {ACCESS_META[level].label}
            </button>
          ))}
        </div>

        {selected.access_level === "invite" && (
          <button className="btn" style={{ width: "100%", marginBottom: 14, fontSize: 13 }} onClick={openInviteManager}>
            Manage who can see this album
          </button>
        )}

        <label className="album-upload-btn">
          <FiPlus size={16} /> Add Photo
          <input type="file" accept="image/*" aria-label="Add album photo" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />
        </label>

        <div className="album-grid" style={{ marginTop: 14 }}>
          {photos.map(p => (
            <div key={p.id} className="album-thumb-owner">
              <Image src={p.img_url} alt={p.caption || ""} fill sizes="(max-width: 600px) 33vw, 200px" />
              <button className="album-thumb-remove" onClick={() => removePhoto(p.id)} aria-label="Remove photo"><FiX size={12} /></button>
            </div>
          ))}
        </div>
        {photos.length === 0 && <div className="album-loading">No photos yet. Add your first one above.</div>}

        {showInviteManager && (
          <div ref={inviteManagerTrap} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Invite manager" onClick={() => setShowInviteManager(false)}>
            <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, width: "90%", padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Album Access</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Only people you toggle on below can see this album. Everyone else, including people you've matched with, cannot.</div>
              {matchOptions.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>You don't have any matches yet to invite.</div>}
              {matchOptions.map(m => {
                const has = grantedIds.has(String(m.id));
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {m.avatar && <Image src={m.avatar} alt="Avatar" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} />}
                    <div style={{ flex: 1, fontSize: 13 }}>{m.name}</div>
                    <button className={"access-pill" + (has ? " active" : "")} onClick={() => toggleGrant(String(m.id), has)}>
                      {has ? "Granted" : "Grant"}
                    </button>
                  </div>
                );
              })}
              <button className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={() => setShowInviteManager(false)}>Done</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="my-albums">
      {albums.length === 0 && (
        <div className="empty-state">
          <div className="empty-title">No albums yet</div>
          <div className="empty-sub">Create albums to organize your portfolio with your own privacy settings for each one.</div>
        </div>
      )}
      <div className="portfolio-grid">
        {albums.map(a => (
          <div key={a.id} className="portfolio-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAlbum(a); } }} onClick={() => openAlbum(a)} style={{ cursor: "pointer" }}>
            {a.cover_url ? <Image src={a.cover_url} alt={a.title} fill sizes="(max-width: 600px) 50vw, 300px" /> : <div style={{ width: "100%", height: "100%", background: "var(--surface)" }} />}
            <div className="portfolio-item-overlay">
              <div className="portfolio-item-title">{a.title}</div>
              <div className="portfolio-item-likes" style={{ display: "flex", alignItems: "center", gap: 4 }}>{ACCESS_META[a.access_level].icon} {a.photo_count} photos</div>
            </div>
          </div>
        ))}
      </div>
      <button className="album-upload-btn" style={{ marginTop: 14 }} onClick={() => setShowCreate(true)}>
        <FiPlus size={16} /> New Album
      </button>

      {showCreate && (
        <div ref={createAlbumTrap} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Create album" onClick={() => setShowCreate(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, width: "90%", padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>New Album</div>
            <input
              className="text-input"
              placeholder="Album title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              style={{ width: "100%", marginBottom: 14 }}
            />
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Who can see this album?</div>
            <div className="album-access-row" style={{ marginBottom: 16 }}>
              {(["public", "private", "invite"] as const).map(level => (
                <button key={level} className={"access-pill" + (newAccess === level ? " active" : "")} onClick={() => setNewAccess(level)}>
                  {ACCESS_META[level].icon} {ACCESS_META[level].label}
                </button>
              ))}
            </div>
            <button className="btn btn-gold" style={{ width: "100%" }} onClick={createAlbum}>Create Album</button>
          </div>
        </div>
      )}
    </div>
  );
}
