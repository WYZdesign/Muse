-- Adds a safe lease/retry state machine for the storage cleanup outbox created
-- by 0025. Existing rows become immediately eligible for the first worker run.
-- This migration is intentionally separate: 0025 may already exist in an
-- environment, while its applied state is independently verified by Wyzmind.

ALTER TABLE public.muse_storage_cleanup_jobs
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.muse_storage_cleanup_jobs
  DROP CONSTRAINT IF EXISTS muse_storage_cleanup_jobs_status_check;

ALTER TABLE public.muse_storage_cleanup_jobs
  ADD CONSTRAINT muse_storage_cleanup_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'done', 'failed'));

CREATE INDEX IF NOT EXISTS muse_storage_cleanup_jobs_due_idx
  ON public.muse_storage_cleanup_jobs (status, next_attempt_at, updated_at);
