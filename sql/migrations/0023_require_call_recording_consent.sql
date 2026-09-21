-- A recording is allowed only after both call participants explicitly consent.
CREATE TABLE IF NOT EXISTS muse_call_recording_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES muse_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_version TEXT NOT NULL DEFAULT '2026-09-21',
  UNIQUE (call_id, user_id)
);

ALTER TABLE muse_call_recording_consents ENABLE ROW LEVEL SECURITY;
