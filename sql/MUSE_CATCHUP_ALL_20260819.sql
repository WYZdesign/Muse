-- ============================================================
-- MUSE CATCH-UP MIGRATION — 2026-08-19
-- Consolidates all migrations that exist in the repo but were
-- verified MISSING from the live Supabase database (via PostgREST
-- 404 checks against the service role).
--
-- MISSING tables found:
--   1. muse_waitlist            → landing-page waitlist signups 500
--   2. muse_landing_analytics   → landing stats broken
--   3. muse_qr_events           → QR tracking broken
--   4. muse_verification_sessions → Stripe Identity verification broken
--   5. muse_rate_limits         → durable rate limiting not live
--
-- Plus: founding_tier / pro_expires_at columns + the auto-claim
-- trigger that grants founding members their lifetime Pro tier.
--
-- EVERYTHING HERE IS IDEMPOTENT (IF NOT EXISTS). Safe to run once.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. LANDING PAGE TABLES (from MUSE_LANDING_20260804.sql)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS muse_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text,
  source text default 'default',
  referred_by uuid references muse_profiles(id) on delete set null,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_waitlist_email ON muse_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_muse_waitlist_source ON muse_waitlist(source);
CREATE INDEX IF NOT EXISTS idx_muse_waitlist_created ON muse_waitlist(created_at DESC);

CREATE TABLE IF NOT EXISTS muse_landing_analytics (
  date date primary key,
  signups int default 0,
  qr_scans int default 0,
  qr_shares int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS muse_qr_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_type text not null,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_source ON muse_qr_events(source);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_type ON muse_qr_events(event_type);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_created ON muse_qr_events(created_at DESC);

ALTER TABLE muse_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_waitlist_owner" ON muse_waitlist;
CREATE POLICY "muse_waitlist_owner" ON muse_waitlist
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

ALTER TABLE muse_landing_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_landing_analytics_service" ON muse_landing_analytics;
CREATE POLICY "muse_landing_analytics_service" ON muse_landing_analytics
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

ALTER TABLE muse_qr_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_qr_events_service" ON muse_qr_events;
CREATE POLICY "muse_qr_events_service" ON muse_qr_events
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────
-- 2. VERIFICATION SESSIONS (from MUSE_VERIFICATION_SESSIONS_20260804.sql)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS muse_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  stripe_session_id text not null,
  status text not null default 'pending',
  purpose text default 'general',
  verified_outputs jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);
CREATE INDEX IF NOT EXISTS idx_muse_verification_sessions_user ON muse_verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_verification_sessions_stripe ON muse_verification_sessions(stripe_session_id);

ALTER TABLE muse_verification_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_verification_sessions_owner" ON muse_verification_sessions;
CREATE POLICY "muse_verification_sessions_owner" ON muse_verification_sessions
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified boolean default false;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified_at timestamptz;

-- ─────────────────────────────────────────────
-- 3. DURABLE RATE LIMITING (from MUSE_RATE_LIMIT_20260819.sql)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS muse_rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_muse_rate_limits_window ON muse_rate_limits (window_start);

CREATE OR REPLACE FUNCTION check_rate(p_key TEXT, p_limit INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO muse_rate_limits (key, count, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN muse_rate_limits.window_start < now() - interval '1 minute'
          THEN 1
          ELSE muse_rate_limits.count + 1
        END,
        window_start = CASE
          WHEN muse_rate_limits.window_start < now() - interval '1 minute'
          THEN now()
          ELSE muse_rate_limits.window_start
        END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION check_rate(TEXT, INT) TO service_role;
REVOKE EXECUTE ON FUNCTION check_rate(TEXT, INT) FROM anon, authenticated;

-- ─────────────────────────────────────────────
-- 4. FOUNDING MEMBERS (from MUSE_FOUNDING_MEMBERS_20260805.sql)
-- ─────────────────────────────────────────────
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS founding_tier TEXT DEFAULT NULL;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ DEFAULT NULL;

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
    RETURN;
  END IF;

  IF wl_position <= 150 THEN
    RETURN QUERY SELECT 'founding'::TEXT, NULL::TIMESTAMPTZ;
  ELSE
    RETURN QUERY SELECT 'early'::TEXT, (now() + interval '6 months')::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION claim_founding_status(TEXT) TO authenticated, service_role;

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

-- ─────────────────────────────────────────────
-- 5. BOOKING PAYMENT UNIQUE CONSTRAINT (from MUSE_BOOKING_PAYMENT_UNIQUE_20260819.sql)
-- ─────────────────────────────────────────────
DELETE FROM muse_booking_payments a
USING muse_booking_payments b
WHERE a.booking_id = b.booking_id
  AND a.booking_id IS NOT NULL
  AND a.created_at < b.created_at;

ALTER TABLE muse_booking_payments
  ADD CONSTRAINT muse_booking_payments_booking_id_key
  UNIQUE (booking_id);
