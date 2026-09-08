-- 013_add_boost_inventory_and_expiry.sql
-- Unified boost model for Muse:
--   - boost_inventory  = count of unused boosts the user owns (from quest rewards or paid one-offs)
--   - boost_expires_at = when the user's CURRENTLY ACTIVE boost expires (null if not boosted now)
-- Idempotent: safe to re-run.

ALTER TABLE muse_profiles
  ADD COLUMN IF NOT EXISTS boost_inventory INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN muse_profiles.boost_inventory IS 'Count of unused boosts the user owns (quest rewards + paid one-off purchases).';
COMMENT ON COLUMN muse_profiles.boost_expires_at IS 'When the user''s currently active boost expires. Null when not boosted.';

-- Track one-off boost purchases (paid via Stripe) so credits can be granted idempotently.
CREATE TABLE IF NOT EXISTS muse_boost_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  amount_cents INT NOT NULL DEFAULT 0,
  stripe_payment_intent TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'granted', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  granted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_boost_purchases_user ON muse_boost_purchases(user_id, status);
