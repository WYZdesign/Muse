-- Removes superseded permissive policies verified on the production project.
-- Replacement ownership-scoped or authenticated policies already govern client writes.
-- This migration intentionally leaves public form_submissions intake unchanged.

DROP POLICY IF EXISTS "Users can insert blocks" ON public.muse_blocks;
DROP POLICY IF EXISTS "Users can create bookings" ON public.muse_bookings;
DROP POLICY IF EXISTS "Users can save push subs" ON public.muse_push_subscriptions;
DROP POLICY IF EXISTS "Users can insert reports" ON public.muse_reports;
DROP POLICY IF EXISTS "Service manages prompts" ON public.muse_prompt_bank;
DROP POLICY IF EXISTS "Service manages check-ins" ON public.muse_safety_checkins;
DROP POLICY IF EXISTS "Service manages strikes" ON public.muse_strikes;
