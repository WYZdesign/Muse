-- MUSE — voice & video notes on feed posts (idempotent).
-- muse_feed_posts previously only carried an image URL and a type of
-- 'photo' | 'text'. Recorded clips need the same shape the chat messages use:
-- a media URL, its MIME type, duration for the player, and a transcript.

ALTER TABLE muse_feed_posts ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE muse_feed_posts ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE muse_feed_posts ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE muse_feed_posts ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN muse_feed_posts.media_url IS 'Storage URL for a voice/video post (muse-uploads bucket)';
COMMENT ON COLUMN muse_feed_posts.media_type IS 'audio/webm | video/webm (recorded clips)';
COMMENT ON COLUMN muse_feed_posts.duration_ms IS 'Clip length in milliseconds, for the inline player';
COMMENT ON COLUMN muse_feed_posts.transcript IS 'Auto-transcript of a voice post (Whisper)';
