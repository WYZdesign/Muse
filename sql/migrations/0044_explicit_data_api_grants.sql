-- Supabase stops auto-granting Data API access to new public tables on
-- 2026-10-30. From then on a table created in public without an explicit
-- GRANT returns "permission denied" to supabase-js / PostgREST / GraphQL,
-- including on a fresh project, a preview branch, or `supabase db reset`.
--
-- This app talks to Postgres through the service role (the action layer in
-- src/lib/muse-actions), so service_role is the role that must be granted.
-- anon and authenticated are deliberately NOT granted here: RLS is enabled on
-- these tables with no policies, so they are meant to be unreachable from the
-- browser. Granting them would turn a fail-closed posture into a fail-open one.
--
-- Idempotent and safe to re-run.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.muse_talent_lists TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.muse_talent_list_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.muse_support_tickets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.muse_brief_views TO service_role;

-- Belt and braces: cover every existing public table and sequence, so a
-- preview branch or a reset database cannot leave some older table ungranted.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', r.tablename);
  END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
