-- Quest progress was never persisted: `muse_user_quests` did not exist in
-- production, so every track call read null, treated the quest as brand new,
-- reported "newlyCompleted", and then silently failed its insert. That is why
-- the same "Quest complete" toast fired over and over.
--
-- One row per (user, quest, period). The unique constraint is what makes
-- "already completed this period" reliable, and lets a duplicate/concurrent
-- track call collapse instead of double-completing.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.muse_user_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.muse_profiles(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES public.muse_quests(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 1,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id, period_key)
);

COMMENT ON TABLE public.muse_user_quests IS
  'Per-user quest progress, one row per (user, quest, period_key). period_key comes from questPeriodKey(): daily:YYYY-MM-DD, weekly:<monday>, monthly:YYYY-MM, lifetime:all.';

CREATE INDEX IF NOT EXISTS muse_user_quests_user_period_idx
  ON public.muse_user_quests (user_id, period_key);

ALTER TABLE public.muse_user_quests ENABLE ROW LEVEL SECURITY;

-- Supabase stops auto-granting Data API access on 2026-10-30; the action layer
-- uses service_role, and the client roles stay ungranted (RLS on, no policies).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.muse_user_quests TO service_role;
