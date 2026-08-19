-- ═══════════════════════════════════════════════════════════════════════════
-- MUSE MOMENTS — live BTS/Moments feed (2026-08-18)
-- Fixes the gap where BTS stories only showed local-cache or DEMO_MOMENTS.
-- Ephemeral 24h stories stored server-side.
--═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS muse_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  text TEXT DEFAULT '',
  img TEXT DEFAULT '',
  type TEXT DEFAULT 'photo',
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_muse_moments_created ON muse_moments(created_at DESC);
ALTER TABLE muse_moments ENABLE ROW LEVEL SECURITY;
