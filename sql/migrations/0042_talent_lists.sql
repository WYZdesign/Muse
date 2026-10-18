-- "Unlimited saved-talent lists" (Musa Studio).
--
-- There was no saved-talent list feature at all: the Talent tab could only
-- keep one flat "saved" set, so the Studio benefit had nothing behind it.
-- This adds named lists the industry side can build (casting shortlists,
-- photographers, retouchers, and so on).
--
-- Additive and idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.muse_talent_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.muse_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.muse_talent_lists IS
  'Named saved-talent lists owned by a profile. Musa Studio is uncapped; other tiers have a small cap enforced in the action layer.';

CREATE INDEX IF NOT EXISTS muse_talent_lists_owner_id_idx
  ON public.muse_talent_lists (owner_id);

CREATE TABLE IF NOT EXISTS public.muse_talent_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.muse_talent_lists(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.muse_profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (list_id, profile_id)
);

COMMENT ON TABLE public.muse_talent_list_items IS
  'Membership of a saved-talent list. One row per (list, profile); re-saving is a no-op.';

CREATE INDEX IF NOT EXISTS muse_talent_list_items_list_id_idx
  ON public.muse_talent_list_items (list_id);

ALTER TABLE public.muse_talent_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_talent_list_items ENABLE ROW LEVEL SECURITY;

-- Reads and writes go through the action layer, which scopes every query to
-- the caller's own lists, so no permissive client policy is granted.
