-- ═══════════════════════════════════════════════════════════════════
-- MUSE: Add missing columns to muse_profiles (2026-09-14)
-- These columns are referenced in code but never migrated to prod.
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- 1. nsfw — profile-level NSFW flag (used by NSFW gating in Discover/matches)
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS nsfw BOOLEAN DEFAULT false;

-- 2. verified — identity verification status (used by trust signals on cards)
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- 3. collabs — collaboration count (used by profile stats)
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS collabs INTEGER DEFAULT 0;

-- ═══ DONE ═══
-- Verify after running:
--   SELECT column_name FROM information_schema.columns WHERE table_name='muse_profiles' AND column_name IN ('nsfw','verified','collabs','photos','embedding','embedding_model','media_kit_url') ORDER BY column_name;
