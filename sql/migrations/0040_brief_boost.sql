-- Industry-side boost: brief placement.
--
-- The industry tiers promise "Talent-pool boost x1/week - front page" (Musa
-- Pro) and "Boosted placement on every Brief you post" (Musa Studio). There
-- was no way to boost a Brief at all: the boost model only ever wrote
-- boost_expires_at on muse_profiles, so a paying hirer had nothing to
-- front-page.
--
-- This adds the matching slot on the brief itself. A brief with a live
-- boost_expires_at sorts to the front of the briefs list, exactly like a live
-- profile boost sorts to the front of Discover.
--
-- Additive and idempotent: safe to re-run.

ALTER TABLE public.muse_briefs
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamp with time zone;

COMMENT ON COLUMN public.muse_briefs.boost_expires_at IS
  'Live window during which this brief sorts to the front of the briefs list (industry boost). NULL = unboosted.';

CREATE INDEX IF NOT EXISTS muse_briefs_boost_expires_at_idx
  ON public.muse_briefs (boost_expires_at DESC)
  WHERE boost_expires_at IS NOT NULL;
