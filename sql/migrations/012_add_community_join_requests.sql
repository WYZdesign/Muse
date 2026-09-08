-- 012_add_community_join_requests.sql
-- Add join request queue for private communities.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS muse_community_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES muse_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  user_name TEXT DEFAULT '',
  user_avatar TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES muse_profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, user_id)
);

COMMENT ON TABLE muse_community_join_requests IS 'Join request queue for private communities. Admins/moderators approve or deny.';

CREATE INDEX IF NOT EXISTS idx_join_requests_community ON muse_community_join_requests(community_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON muse_community_join_requests(user_id);
