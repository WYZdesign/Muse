-- ═══════════════════════════════════════════════════════════════════
-- MUSE MISSING COLUMNS — Paste into Supabase SQL Editor & Run
-- Created: 2026-08-27
-- ═══════════════════════════════════════════════════════════════════

-- 1. Login streak columns (Session 45 feature — code exists, DB missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='muse_user_xp' AND column_name='current_streak') THEN
    ALTER TABLE muse_user_xp ADD COLUMN current_streak integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='muse_user_xp' AND column_name='longest_streak') THEN
    ALTER TABLE muse_user_xp ADD COLUMN longest_streak integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='muse_user_xp' AND column_name='last_login_date') THEN
    ALTER TABLE muse_user_xp ADD COLUMN last_login_date date;
  END IF;
END $$;

-- 2. Event creator ownership (Session 47 — create-event now writes created_by)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='muse_events' AND column_name='created_by') THEN
    ALTER TABLE muse_events ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- 3. Community creator ownership (Session 47 — create-community now writes created_by)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='muse_communities' AND column_name='created_by') THEN
    ALTER TABLE muse_communities ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- ═══ DONE ═══
-- Verify after running:
--   SELECT column_name FROM information_schema.columns WHERE table_name='muse_user_xp' ORDER BY ordinal_position;
--   SELECT column_name FROM information_schema.columns WHERE table_name='muse_events' ORDER BY ordinal_position;
--   SELECT column_name FROM information_schema.columns WHERE table_name='muse_communities' ORDER BY ordinal_position;
