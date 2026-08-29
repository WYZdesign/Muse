-- Muse RSVP system — event attendance tracking
-- Applied: 2026-08-19

CREATE TABLE IF NOT EXISTS muse_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES muse_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE muse_rsvps ENABLE ROW LEVEL SECURITY;

-- Users can read their own RSVPs
DROP POLICY IF EXISTS "Users read own RSVPs" ON muse_rsvps;
CREATE POLICY "Users read own RSVPs" ON muse_rsvps
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own RSVPs
DROP POLICY IF EXISTS "Users insert own RSVPs" ON muse_rsvps;
CREATE POLICY "Users insert own RSVPs" ON muse_rsvps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own RSVPs
DROP POLICY IF EXISTS "Users delete own RSVPs" ON muse_rsvps;
CREATE POLICY "Users delete own RSVPs" ON muse_rsvps
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_muse_rsvps_event ON muse_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_muse_rsvps_user ON muse_rsvps(user_id);
