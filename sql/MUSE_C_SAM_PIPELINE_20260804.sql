-- ============================================================
-- MUSE CONTENT SCANS & SAFETY INCIDENTS MIGRATION
-- Run this in Supabase SQL Editor for CSAM/content moderation pipeline
-- ============================================================

-- 1. Content scans log (every upload goes through moderation)
CREATE TABLE IF NOT EXISTS muse_content_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  booking_id uuid references muse_bookings(id) on delete set null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  context text not null, -- "upload", "chat", "profile", "booking"
  safe boolean not null,
  flagged_categories text[] default '{}',
  confidence numeric(5,2) default 0,
  should_block boolean default false,
  should_report boolean default false,
  details jsonb default '[]',
  scanned_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_content_scans_user ON muse_content_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_content_scans_booking ON muse_content_scans(booking_id);
CREATE INDEX IF NOT EXISTS idx_muse_content_scans_safe ON muse_content_scans(safe);
CREATE INDEX IF NOT EXISTS idx_muse_content_scans_scanned ON muse_content_scans(scanned_at DESC);

-- 2. Safety incidents (escalated violations requiring review)
CREATE TABLE IF NOT EXISTS muse_safety_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  type text not null, -- "content_policy_violation", "csam_detected", "explicit_nudity_payment", "harassment", "minor_suspected"
  severity text not null default 'medium', -- "low", "medium", "high", "critical"
  details jsonb default '{}',
  status text not null default 'pending_review', -- "pending_review", "under_investigation", "resolved_action_taken", "resolved_no_action", "escalated_to_authorities"
  reviewer_id uuid references muse_profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text,
  ncmec_report_id text, -- If reported to NCMEC
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_user ON muse_safety_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_status ON muse_safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_type ON muse_safety_incidents(type);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_severity ON muse_safety_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_created ON muse_safety_incidents(created_at DESC);

-- 3. RLS policies
ALTER TABLE muse_content_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_content_scans_owner" ON muse_content_scans;
CREATE POLICY "muse_content_scans_owner" ON muse_content_scans
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));
-- Service role manages insert

ALTER TABLE muse_safety_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_safety_incidents_owner" ON muse_safety_incidents;
CREATE POLICY "muse_safety_incidents_owner" ON muse_safety_incidents
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));
-- Admins can view all via service role

-- 4. Add to realtime if needed
-- ALTER PUBLICATION supabase_realtime ADD TABLE muse_safety_incidents;

-- 5. NCMEC reporting helper function (for admin use)
CREATE OR REPLACE FUNCTION report_to_ncmec(p_incident_id uuid, p_report_id text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE muse_safety_incidents 
  SET ncmec_report_id = p_report_id, 
      status = 'escalated_to_authorities',
      updated_at = now()
  WHERE id = p_incident_id;
END;
$$;