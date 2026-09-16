-- ═══════════════════════════════════════════════════════════════════
-- MUSE: Custom (user-submitted) creative type / aesthetic style review
-- flags (2026-09-16)
--
-- Lets a user type their own creative role/type or aesthetic style when
-- it isn't in the preset chip list (Torreé audit item 6). The custom
-- text is saved as a REAL value on muse_profiles.type / muse_profiles.styles
-- (so it works everywhere those columns are already read), but flagged
-- here as user-submitted-and-unverified so the admin moderation panel
-- (/muse/admin/moderation → "Custom Values" tab) can surface it for
-- review. These are coarse per-profile flags (not per-value) — a profile
-- with ANY pending custom type/style trips the corresponding flag; once
-- reviewed, an admin clears it from the moderation panel.
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS custom_type_pending BOOLEAN DEFAULT false;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS custom_style_pending BOOLEAN DEFAULT false;

-- ═══ DONE ═══
-- Verify after running:
--   SELECT column_name FROM information_schema.columns WHERE table_name='muse_profiles' AND column_name IN ('custom_type_pending','custom_style_pending') ORDER BY column_name;
