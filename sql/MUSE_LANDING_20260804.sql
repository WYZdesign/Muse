-- ============================================================
-- MUSE LANDING PAGE TABLES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Waitlist table
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

-- 2. Landing analytics (daily counters)
CREATE TABLE IF NOT EXISTS muse_landing_analytics (
  date date primary key,
  signups int default 0,
  qr_scans int default 0,
  qr_shares int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. QR code tracking (each scan/share)
CREATE TABLE IF NOT EXISTS muse_qr_events (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- "mixer_la", "instagram_bio", etc.
  event_type text not null, -- "scan", "share", "signup"
  referrer text, -- HTTP referrer
  user_agent text,
  ip_hash text, -- hashed for privacy
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_source ON muse_qr_events(source);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_type ON muse_qr_events(event_type);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_created ON muse_qr_events(created_at DESC);

-- 4. RLS policies (owner-only for waitlist, service-role for analytics)
ALTER TABLE muse_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_waitlist_owner" ON muse_waitlist;
DROP POLICY IF EXISTS "muse_waitlist_owner" ON muse_waitlist;
CREATE POLICY "muse_waitlist_owner" ON muse_waitlist
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
-- Service role inserts via API

ALTER TABLE muse_landing_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_landing_analytics_service" ON muse_landing_analytics;
DROP POLICY IF EXISTS "muse_landing_analytics_service" ON muse_landing_analytics;
CREATE POLICY "muse_landing_analytics_service" ON muse_landing_analytics
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
-- Service role only

ALTER TABLE muse_qr_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_qr_events_service" ON muse_qr_events;
DROP POLICY IF EXISTS "muse_qr_events_service" ON muse_qr_events;
CREATE POLICY "muse_qr_events_service" ON muse_qr_events
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
-- Service role only