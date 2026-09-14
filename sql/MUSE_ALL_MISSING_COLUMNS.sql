-- ═══════════════════════════════════════════════════════════════════
-- MUSE: ALL 7 missing columns on muse_profiles
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).
-- Created: 2026-09-14
-- ═══════════════════════════════════════════════════════════════════

-- From MUSE_ADD_MISSING_COLUMNS_20260914.sql
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS nsfw BOOLEAN DEFAULT false;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS collabs INTEGER DEFAULT 0;

-- From muse_complete_schema.sql
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- From MUSE_OPENROUTER_AI_20260813.sql
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS embedding JSONB;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS embedding_model TEXT NOT NULL DEFAULT '';

-- From MUSE_MEDIA_KIT_20260906.sql
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS media_kit_url TEXT DEFAULT '';

-- ═══ VERIFY ═══
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'muse_profiles'
AND column_name IN ('nsfw','verified','collabs','photos','embedding','embedding_model','media_kit_url')
ORDER BY column_name;
