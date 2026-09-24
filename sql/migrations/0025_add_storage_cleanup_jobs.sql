-- Durable outbox for album/media storage deletes that fail after the DB row
-- is already gone. Without this, a failed muse-private remove is unrecoverable
-- (signed URLs stay valid until expiry; bytes never leave the bucket).
-- Idempotent: safe to re-run. UNIQUE (bucket, path) makes enqueue an upsert.

CREATE TABLE IF NOT EXISTS public.muse_storage_cleanup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  path text NOT NULL,
  reason text NOT NULL,
  profile_id text,
  album_id text,
  photo_id text,
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, path)
);

CREATE INDEX IF NOT EXISTS muse_storage_cleanup_jobs_status_idx
  ON public.muse_storage_cleanup_jobs (status, updated_at);

-- Deny anon/authenticated; service-role bypasses RLS for the cleanup worker.
ALTER TABLE public.muse_storage_cleanup_jobs ENABLE ROW LEVEL SECURITY;
