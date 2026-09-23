-- Retain account data for the published 30-day deletion window while
-- immediately removing access. The purge cron runs after this timestamp.
ALTER TABLE public.muse_profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_purge_after timestamptz;

CREATE INDEX IF NOT EXISTS muse_profiles_deletion_purge_after_idx
  ON public.muse_profiles (deletion_purge_after)
  WHERE deletion_requested_at IS NOT NULL;
