-- Harden internal RPC/trigger helpers exposed by Supabase's public schema.
--
-- These helpers are reached by server-side service clients or database
-- triggers. They must not be callable through the public PostgREST RPC
-- surface. The three album RLS helpers are deliberately excluded: their
-- public/authenticated execution is required by existing RLS policies and
-- their search paths are already pinned in migration 0028.

-- Pin every remaining mutable search path. `pg_temp` is explicitly last so
-- a caller cannot shadow an object resolved by these helpers.
ALTER FUNCTION public.atomic_like_count(text, uuid, integer)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.log_muse_activity()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.report_to_ncmec(uuid, text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.check_rate(text, integer)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_founding_status(text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_claim_founding_trigger()
  SET search_path = public, pg_temp;

-- Server-only RPC helpers. Source call sites use getServiceClient(); direct
-- anon/authenticated RPC execution is neither required nor safe.
REVOKE ALL ON FUNCTION public.atomic_like_count(text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_like_count(text, uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.check_rate(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate(text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.report_to_ncmec(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_to_ncmec(uuid, text) TO service_role;

-- Trigger-only helpers do not need direct RPC execution. Validate their
-- existing trigger paths on a disposable branch before this migration is
-- applied to production.
REVOKE ALL ON FUNCTION public.log_muse_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_founding_status(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_claim_founding_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
