-- ============================================================
-- MUSE FOUNDING MEMBERS MIGRATION
-- Run this in Supabase SQL Editor
-- Adds founding-tier support to profiles:
--   founding_tier TEXT  -> NULL | 'founding' | 'early'
--   pro_expires_at      -> NULL (lifetime) or date free Pro ends
-- Auto-assigns tier based on muse_waitlist position:
--   position <= 150  -> founding (lifetime Pro)
--   position <= 1000 -> early (6 months free Pro)
-- ============================================================

-- 1. Columns on muse_profiles
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS founding_tier TEXT DEFAULT NULL;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Function: claim founding status for an email (called at signup)
-- Position computed live via row_number() — no generated column needed.
CREATE OR REPLACE FUNCTION claim_founding_status(target_email TEXT)
RETURNS TABLE(founding_tier TEXT, pro_expires_at TIMESTAMPTZ) AS $$
DECLARE
  wl_position INT;
BEGIN
  SELECT wl.pos INTO wl_position
  FROM (
    SELECT email, row_number() OVER (ORDER BY created_at ASC) AS pos
    FROM muse_waitlist
  ) wl
  WHERE lower(wl.email) = lower(target_email)
  LIMIT 1;

  IF wl_position IS NULL OR wl_position > 1000 THEN
    RETURN; -- not a founding member
  END IF;

  IF wl_position <= 150 THEN
    RETURN QUERY SELECT 'founding'::TEXT, NULL::TIMESTAMPTZ; -- lifetime Pro
  ELSE
    RETURN QUERY SELECT 'early'::TEXT, (now() + interval '6 months')::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execution to authenticated users (idempotent, safe)
GRANT EXECUTE ON FUNCTION claim_founding_status(TEXT) TO authenticated, service_role;

-- 4. Trigger: auto-claim founding tier when a profile is created
CREATE OR REPLACE FUNCTION auto_claim_founding_trigger()
RETURNS TRIGGER AS $$
DECLARE
  claimed RECORD;
BEGIN
  IF NEW.founding_tier IS NULL THEN
    SELECT ft.founding_tier, ft.pro_expires_at INTO claimed
    FROM claim_founding_status(NEW.email) ft;
    IF claimed.founding_tier IS NOT NULL THEN
      NEW.founding_tier := claimed.founding_tier;
      NEW.pro_expires_at := claimed.pro_expires_at;
      -- founding members get active Pro for free
      NEW.tier := 'muse_pro';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_claim_founding ON muse_profiles;
CREATE TRIGGER trg_auto_claim_founding
  BEFORE INSERT ON muse_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_claim_founding_trigger();
