-- Explicit audience field (Muses vs Creatives duality)
-- Run in Supabase Dashboard → SQL Editor.
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'creative';
