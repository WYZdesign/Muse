-- Muse App: Reports, Blocks, and additional tables
-- Run in Supabase SQL Editor

-- Reports table
CREATE TABLE IF NOT EXISTS muse_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks table
CREATE TABLE IF NOT EXISTS muse_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_muse_reports_target ON muse_reports(target_id);
CREATE INDEX IF NOT EXISTS idx_muse_blocks_user ON muse_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_blocks_target ON muse_blocks(target_id);

-- RLS policies
ALTER TABLE muse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports" ON muse_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own reports" ON muse_reports FOR SELECT USING (true);
CREATE POLICY "Users can insert blocks" ON muse_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own blocks" ON muse_blocks FOR SELECT USING (true);
CREATE POLICY "Users can delete own blocks" ON muse_blocks FOR DELETE USING (true);
