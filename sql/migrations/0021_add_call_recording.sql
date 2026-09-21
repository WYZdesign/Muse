-- MUSE — call recording metadata (idempotent).
-- Recording runs through LiveKit Egress into the R2 bucket; the call log keeps
-- the egress id (so it can be stopped) and the resulting object path/url.

ALTER TABLE muse_calls ADD COLUMN IF NOT EXISTS recording_egress_id TEXT;
ALTER TABLE muse_calls ADD COLUMN IF NOT EXISTS recording_path TEXT;
ALTER TABLE muse_calls ADD COLUMN IF NOT EXISTS recording_url TEXT;

COMMENT ON COLUMN muse_calls.recording_egress_id IS 'LiveKit egress id while a recording is in flight';
COMMENT ON COLUMN muse_calls.recording_path IS 'Object key of the recording in the R2 bucket';
COMMENT ON COLUMN muse_calls.recording_url IS 'Playable URL for the finished recording';
