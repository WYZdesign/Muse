-- Migration 009: Saved searches with alerts
-- Users can save search queries and get notified when new matches appear.

CREATE TABLE IF NOT EXISTS muse_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  query TEXT NOT NULL DEFAULT '',
  filters JSONB DEFAULT '{}',
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON muse_saved_searches (user_id);