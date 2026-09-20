-- MUSE — call log + voicemail (idempotent).
-- Calls previously left nothing behind but a notification: no history, no
-- missed-call record, no way to leave a message when someone doesn't pick up.

CREATE TABLE IF NOT EXISTS muse_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'video',          -- voice | video
  status TEXT NOT NULL DEFAULT 'ringing',      -- ringing | answered | missed | declined | ended | voicemail | failed
  room TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  voicemail_url TEXT,
  voicemail_duration_ms INTEGER,
  voicemail_transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_calls_caller ON muse_calls (caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_muse_calls_callee ON muse_calls (callee_id, created_at DESC);

COMMENT ON TABLE muse_calls IS 'Per-call log: ring/answer/decline/end lifecycle + optional voicemail';
COMMENT ON COLUMN muse_calls.status IS 'ringing | answered | missed | declined | ended | voicemail | failed';
