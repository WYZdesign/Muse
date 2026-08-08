-- ═══════════════════════════════════════════════════════════════════════════
-- MUSE — OWNER PREMIUM + ADMIN GRANT
-- Run this in Supabase SQL Editor, then click "Run".
-- Grants the owner account full Muse Pro (lifetime founding tier),
-- unlimited swipes, and admin access.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Ensure the premium columns exist (they may not yet)
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS founding_tier TEXT DEFAULT '';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2) Ensure the owner profile exists (email must match signup)
INSERT INTO muse_profiles (auth_id, email, name, tier, founding_tier, pro_expires_at, is_admin)
SELECT id, email, COALESCE(raw_user_meta_data->>'name','Owner'), 'muse_pro', 'founding', NULL, true
FROM auth.users
WHERE email = 'torree.marcel@gmail.com'
ON CONFLICT (email) DO NOTHING;

-- 3) Upgrade the owner to Muse Pro (lifetime) + founding member badge + admin
UPDATE muse_profiles
SET tier = 'muse_pro',
    founding_tier = 'founding',
    pro_expires_at = NULL,
    is_admin = true,
    updated_at = NOW()
WHERE email = 'torree.marcel@gmail.com';

-- 4) Verify
SELECT email, tier, founding_tier, is_admin
FROM muse_profiles
WHERE email = 'torree.marcel@gmail.com';
