-- MUSE — voice & video messages (idempotent).
-- muse_messages previously only carried text + an optional image URL. Voice
-- notes and video notes (MediaRecorder output, stored in the muse-uploads
-- bucket) need a discriminator plus duration + an auto-transcript so clips are
-- searchable, accessible and moderatable.

ALTER TABLE muse_messages ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text';
ALTER TABLE muse_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE muse_messages ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE muse_messages ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE muse_messages ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN muse_messages.kind IS 'text | image | voice | video';
COMMENT ON COLUMN muse_messages.media_url IS 'Storage URL for voice/video notes (muse-uploads bucket)';
COMMENT ON COLUMN muse_messages.media_type IS 'audio/webm | video/webm (recorded clips)';
COMMENT ON COLUMN muse_messages.duration_ms IS 'Clip length in milliseconds, for the inline player';
COMMENT ON COLUMN muse_messages.transcript IS 'Auto-transcript of a voice note (Whisper), for search + accessibility';
