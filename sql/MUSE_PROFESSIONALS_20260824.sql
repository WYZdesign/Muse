-- MUSE_PROFESSIONALS: backend for NetworkScreen > Professionals tab
-- Currently demo-only (hardcoded PROFESSIONALS array in types.ts).
-- This table + RLS policies + get-professionals action let real industry
-- users appear in the Professionals tab when they onboard as industry type.
--
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS muse_professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  img TEXT,
  loc TEXT,
  exp TEXT,
  openings INTEGER DEFAULT 0,
  rate TEXT,
  skills TEXT[] DEFAULT '{}',
  looking TEXT[] DEFAULT '{}',
  nsfw BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE muse_professionals ENABLE ROW LEVEL SECURITY;

-- Everyone can read (public directory)
CREATE POLICY "professionals_select" ON muse_professionals
  FOR SELECT USING (true);

-- Users can upsert their own professional profile
CREATE POLICY "professionals_upsert" ON muse_professionals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "professionals_update" ON muse_professionals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "professionals_delete" ON muse_professionals
  FOR DELETE USING (auth.uid() = user_id);

-- Index for type-based filtering
CREATE INDEX IF NOT EXISTS idx_muse_professionals_type ON muse_professionals(type);
