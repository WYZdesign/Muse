-- 0002_add_like_anchor_to_matches.sql
-- Hinge-style anchored likes: a like/swipe recorded in muse_matches can now
-- carry which specific piece of content (a prompt answer or a photo) it was
-- anchored to, plus the optional note sent with it. All nullable — existing
-- rows (and plain swipes with no note) are unaffected.
-- Idempotent: safe to re-run.

ALTER TABLE muse_matches ADD COLUMN IF NOT EXISTS anchor_type TEXT;
ALTER TABLE muse_matches ADD COLUMN IF NOT EXISTS anchor_value TEXT;
ALTER TABLE muse_matches ADD COLUMN IF NOT EXISTS note TEXT;

COMMENT ON COLUMN muse_matches.anchor_type IS 'What the like was anchored to: ''prompt'' or ''photo''. Null for a plain like.';
COMMENT ON COLUMN muse_matches.anchor_value IS 'The specific content liked, e.g. the prompt answer text or "Photo #2".';
COMMENT ON COLUMN muse_matches.note IS 'Optional note text sent along with the like.';
