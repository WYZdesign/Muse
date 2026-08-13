-- ════════════════════════════════════════════════════════════════
-- Muse — NCMEC CyberTipline escalation + account suspension
-- Run in Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Account suspension fields on muse_profiles (fails-closed CSAM response)
ALTER TABLE muse_profiles
  ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- 2. NCMEC CyberTipline report queue (CSAM only — human/automated submitter)
CREATE TABLE IF NOT EXISTS muse_ncmec_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  file_name TEXT,
  context TEXT,
  flagged_categories JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC DEFAULT 0,
  report_type TEXT DEFAULT 'child_sexual_abuse_material',
  incident_details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending_submission',  -- pending_submission | submitted | rejected
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add is_csam + scanned columns to content scan log
ALTER TABLE muse_content_scans
  ADD COLUMN IF NOT EXISTS is_csam BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scanned BOOLEAN DEFAULT TRUE;

-- 4. RLS: NCMEC reports are admin/service-role only (never readable by users)
ALTER TABLE muse_ncmec_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ncmec_service_only" ON muse_ncmec_reports;
CREATE POLICY "ncmec_service_only" ON muse_ncmec_reports
  FOR ALL USING (false);
