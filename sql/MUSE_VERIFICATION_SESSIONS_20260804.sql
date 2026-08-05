-- ============================================================
-- MUSE VERIFICATION SESSIONS MIGRATION
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- Adds Stripe Identity age verification sessions table + profile columns
-- ============================================================

-- 1. Create verification sessions table
CREATE TABLE IF NOT EXISTS muse_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  stripe_session_id text not null,
  status text not null default 'pending', -- pending, verified, requires_input, canceled, expired
  purpose text default 'general', -- general, age_gate_booking
  verified_outputs jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);
CREATE INDEX IF NOT EXISTS idx_muse_verification_sessions_user ON muse_verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_verification_sessions_stripe ON muse_verification_sessions(stripe_session_id);

-- 2. Enable RLS + owner-only policy
ALTER TABLE muse_verification_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_verification_sessions_owner" ON muse_verification_sessions;
CREATE POLICY "muse_verification_sessions_owner" ON muse_verification_sessions
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));
-- Service role manages insert/update via API (bypasses RLS)

-- 3. Add age_verified columns to profiles
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified boolean default false;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified_at timestamptz;

-- 4. Optional: Add to realtime for live updates (if you want real-time verification status)
-- ALTER PUBLICATION supabase_realtime ADD TABLE muse_verification_sessions;