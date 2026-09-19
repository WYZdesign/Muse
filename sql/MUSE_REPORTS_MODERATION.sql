-- MUSE — report moderation columns (idempotent, safe to re-run).
-- The admin moderation queue reads/writes status + resolution metadata that no
-- earlier schema file defined. ADD COLUMN IF NOT EXISTS keeps this additive and
-- backward-compatible with the running app.

ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS resolved_by TEXT;
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS resolution_note TEXT NOT NULL DEFAULT '';
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'user';
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS ai_classification TEXT DEFAULT '';
