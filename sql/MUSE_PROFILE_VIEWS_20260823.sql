-- Profile views counter (duality/stats plumbing)
-- Run in Supabase Dashboard → SQL Editor.
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;
