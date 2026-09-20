-- MUSE — voice & video moments (idempotent).
-- muse_moments (the 24h "story" surface) only carried text + an image URL.
-- Recorded clips need the same shape as messages and feed posts.

ALTER TABLE muse_moments ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE muse_moments ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE muse_moments ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE muse_moments ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN muse_moments.media_url IS 'Storage URL for a voice/video moment (muse-uploads bucket)';
COMMENT ON COLUMN muse_moments.media_type IS 'audio/webm | video/webm (recorded clips)';
COMMENT ON COLUMN muse_moments.duration_ms IS 'Clip length in milliseconds, for the inline player';
COMMENT ON COLUMN muse_moments.transcript IS 'Auto-transcript of a voice moment (Whisper)';
