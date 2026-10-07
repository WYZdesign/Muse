-- 0033: add columns the app queries but the schema never had.
--
-- Demo mode hid this drift: with demo off, several core selects 400 because the
-- column does not exist, so Discover / Matches / Feed / Community render empty.
-- All additions are nullable or defaulted, so this is safe and non-destructive.
-- Verified against the live project: muse_profiles had no nsfw/verified/referrals
-- /collabs/login_streak/last_login_date/stripe_customer_id, muse_communities had
-- no is_private, etc.

ALTER TABLE public.muse_profiles
  ADD COLUMN IF NOT EXISTS nsfw boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referrals integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collabs integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS login_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date date,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE public.muse_communities
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

ALTER TABLE public.muse_briefs
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS deadline text;

ALTER TABLE public.muse_sessions
  ADD COLUMN IF NOT EXISTS time text;

ALTER TABLE public.muse_matches
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE public.muse_booking_payments
  ADD COLUMN IF NOT EXISTS amount integer;

ALTER TABLE public.muse_activity_log
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS type text;

-- Semantic-match cache the app reads/writes on muse_profiles (match + embeddings
-- routes). pgvector is already enabled (0000 baseline).
ALTER TABLE public.muse_profiles
  ADD COLUMN IF NOT EXISTS embedding public.vector(768),
  ADD COLUMN IF NOT EXISTS embedding_model text,
  ADD COLUMN IF NOT EXISTS embedded_at timestamp with time zone;
