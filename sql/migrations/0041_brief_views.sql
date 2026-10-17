-- "See who's interested before they apply" (Musa Pro).
--
-- A brief author had no way to see interest before an application landed:
-- muse_brief_applications only records people who actually applied. This
-- records who OPENED a brief, which is the interest signal the Pro tier sells.
--
-- One row per (brief, viewer): re-opening must not inflate the count, so the
-- unique constraint is the dedupe. viewer_id references muse_profiles, and the
-- author is never recorded as viewing their own brief.
--
-- Additive and idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.muse_brief_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.muse_briefs(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.muse_profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (brief_id, viewer_id)
);

COMMENT ON TABLE public.muse_brief_views IS
  'One row per (brief, viewer) the first time a viewer opens a brief. Powers the Musa Pro "see who is interested before they apply" list for the brief author.';

CREATE INDEX IF NOT EXISTS muse_brief_views_brief_id_idx
  ON public.muse_brief_views (brief_id);

ALTER TABLE public.muse_brief_views ENABLE ROW LEVEL SECURITY;

-- Service role (the app) does the writes; no direct client access is needed,
-- so no permissive policy is granted. Reads and writes go through the action
-- layer which already checks that the caller is the brief's author.
