-- ═══ MUSE APP — ALBUMS & PORTFOLIO PRIVACY MIGRATION (2026-08-02) ═══
-- Copy this entire file into Supabase Dashboard → SQL Editor → New Query → RUN.
-- Safe to re-run: all statements use IF NOT EXISTS / DROP IF EXISTS.
--
-- Replaces the flat muse_profiles.portfolio JSONB array with a real album
-- system: multiple named albums per profile, each with its own photos and
-- its own privacy level (public / private / invite-only), matching the
-- Model Mayhem-style portfolio browsing the app's UI implements.
--
-- Existing muse_profiles.portfolio JSONB column is left untouched (not
-- dropped) so nothing breaks if this migration is only partially applied.

-- ============================================================
-- 1. ALBUMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Album',
  description TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public','private','invite')),
  tags TEXT[] DEFAULT '{}',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_albums_profile ON muse_albums(profile_id);
CREATE INDEX IF NOT EXISTS idx_muse_albums_access ON muse_albums(access_level);

-- ============================================================
-- 2. ALBUM PHOTOS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES muse_albums(id) ON DELETE CASCADE,
  img_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_album_photos_album ON muse_album_photos(album_id);

-- ============================================================
-- 3. ALBUM ACCESS GRANTS (for invite-only albums — per-viewer allowlist)
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_album_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES muse_albums(id) ON DELETE CASCADE,
  viewer_profile_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(album_id, viewer_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_muse_album_access_album ON muse_album_access(album_id);
CREATE INDEX IF NOT EXISTS idx_muse_album_access_viewer ON muse_album_access(viewer_profile_id);

-- ============================================================
-- 4. VIEW/LIKE COUNTERS (denormalized, updated by the app on read/like)
-- ============================================================

ALTER TABLE muse_albums ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE muse_albums ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE muse_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_album_access ENABLE ROW LEVEL SECURITY;

-- Albums: visible if public, owned by the viewer, or invite-granted to the viewer
DROP POLICY IF EXISTS "muse_albums_select" ON muse_albums;
CREATE POLICY "muse_albums_select" ON muse_albums FOR SELECT USING (
  access_level = 'public'
  OR profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR (
    access_level = 'invite'
    AND EXISTS (
      SELECT 1 FROM muse_album_access
      WHERE muse_album_access.album_id = muse_albums.id
        AND muse_album_access.viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "muse_albums_insert" ON muse_albums;
CREATE POLICY "muse_albums_insert" ON muse_albums FOR INSERT WITH CHECK (
  profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

DROP POLICY IF EXISTS "muse_albums_update" ON muse_albums;
CREATE POLICY "muse_albums_update" ON muse_albums FOR UPDATE USING (
  profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

DROP POLICY IF EXISTS "muse_albums_delete" ON muse_albums;
CREATE POLICY "muse_albums_delete" ON muse_albums FOR DELETE USING (
  profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- Album photos: same visibility as their parent album
DROP POLICY IF EXISTS "muse_album_photos_select" ON muse_album_photos;
CREATE POLICY "muse_album_photos_select" ON muse_album_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM muse_albums
    WHERE muse_albums.id = muse_album_photos.album_id
      AND (
        muse_albums.access_level = 'public'
        OR muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
        OR (
          muse_albums.access_level = 'invite'
          AND EXISTS (
            SELECT 1 FROM muse_album_access
            WHERE muse_album_access.album_id = muse_albums.id
              AND muse_album_access.viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "muse_album_photos_write" ON muse_album_photos;
CREATE POLICY "muse_album_photos_write" ON muse_album_photos FOR ALL USING (
  EXISTS (
    SELECT 1 FROM muse_albums
    WHERE muse_albums.id = muse_album_photos.album_id
      AND muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  )
);

-- Album access grants: only the album owner can see/manage the invite list;
-- a viewer can see their own grant row (so the client can show "you have access")
DROP POLICY IF EXISTS "muse_album_access_select" ON muse_album_access;
CREATE POLICY "muse_album_access_select" ON muse_album_access FOR SELECT USING (
  viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM muse_albums
    WHERE muse_albums.id = muse_album_access.album_id
      AND muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "muse_album_access_write" ON muse_album_access;
CREATE POLICY "muse_album_access_write" ON muse_album_access FOR ALL USING (
  EXISTS (
    SELECT 1 FROM muse_albums
    WHERE muse_albums.id = muse_album_access.album_id
      AND muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  )
);

-- ============================================================
-- 6. VERIFY
-- ============================================================

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('muse_albums','muse_album_photos','muse_album_access')
ORDER BY tablename;

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('muse_albums','muse_album_photos','muse_album_access')
ORDER BY tablename, policyname;
