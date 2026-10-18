-- "Priority support" (Musa Studio).
--
-- There was no support system at all: /api/muse/support is an AI doc chat and
-- the Settings "Contact support" button set state that nothing ever rendered.
-- So a Studio subscriber had no way to reach a human, let alone be prioritized.
--
-- A ticket is created with priority 'high' for Musa Studio and 'normal' for
-- everyone else; the admin queue sorts high first, oldest first within a band.
--
-- Additive and idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.muse_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.muse_profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

COMMENT ON TABLE public.muse_support_tickets IS
  'Human support requests. priority is high for Musa Studio at creation time; the admin queue orders high before normal.';

COMMENT ON COLUMN public.muse_support_tickets.priority IS
  'high | normal. Set from the submitter tier, never from client input.';

CREATE INDEX IF NOT EXISTS muse_support_tickets_queue_idx
  ON public.muse_support_tickets (status, priority, created_at);

ALTER TABLE public.muse_support_tickets ENABLE ROW LEVEL SECURITY;

-- Service-role only: submission and reading both go through the action layer,
-- which scopes a user to their own tickets and gates the queue on admin email.
