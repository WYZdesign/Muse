-- 015_add_photo_likes.sql
-- Global per-photo likes keyed by the image URL (stable across Discover cards,
-- portfolio/album photos, and profile photos). "Like this photo" on a Discover
-- card now likes the picture itself, and the same URL shows the same count on
-- every surface that renders it. Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS muse_photo_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, photo_url)
);

CREATE INDEX IF NOT EXISTS idx_photo_likes_url ON muse_photo_likes(photo_url);
COMMENT ON TABLE muse_photo_likes IS 'Global per-image likes keyed by photo URL so the same image shares one count across Discover/portfolio/profile.';
