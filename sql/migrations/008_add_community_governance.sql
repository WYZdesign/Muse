-- Migration 008: Community governance (rules + mod tools)
-- Adds rules JSONB to communities, role update ability, and ban/mute tables.

ALTER TABLE muse_communities
  ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES muse_profiles(id);

-- Community bans: prevents banned users from rejoining
CREATE TABLE IF NOT EXISTS muse_community_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES muse_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES muse_profiles(id),
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Community mutes: temporary or permanent
CREATE TABLE IF NOT EXISTS muse_community_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES muse_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  muted_by UUID REFERENCES muse_profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_bans_community ON muse_community_bans (community_id);
CREATE INDEX IF NOT EXISTS idx_community_mutes_community ON muse_community_mutes (community_id);