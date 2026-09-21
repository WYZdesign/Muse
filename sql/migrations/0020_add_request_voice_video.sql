-- MUSE — voice/video in message requests (idempotent).
-- A first-contact note could only be text (message_preview). Let someone send a
-- voice or video intro instead.

ALTER TABLE muse_message_requests ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE muse_message_requests ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE muse_message_requests ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE muse_message_requests ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN muse_message_requests.media_url IS 'Storage URL for a voice/video intro (muse-uploads bucket)';
COMMENT ON COLUMN muse_message_requests.media_type IS 'audio/webm | video/webm';
COMMENT ON COLUMN muse_message_requests.duration_ms IS 'Clip length in milliseconds';
COMMENT ON COLUMN muse_message_requests.transcript IS 'Auto-transcript of a voice intro (Whisper)';
