-- Add album likes table for idempotent like counting (prevents like inflation).
-- The like-album action upserts here; like_count is derived from this table.
CREATE TABLE IF NOT EXISTS muse_album_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES muse_albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (album_id, user_id)
);
