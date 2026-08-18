-- ═══════════════════════════════════════════════════════════════════════════
-- MUSE RLS HARDENING — closed-beta launch (2026-08-18)
-- Fixes Supabase linter "RLS Disabled in Public" by enabling RLS on EVERY
-- muse_* table in the public schema (dynamic + idempotent) and dropping junk
-- test tables. App access is via the service-role API, so enabling RLS blocks
-- public PostgREST access without affecting the app.
--
-- RUN THIS IN BOTH PROJECTS:
--   • Production  (ejbwjmzrazfgtisqsamf)
--   • Staging     (rwgofoxqycpzsvxfnozt)
--
-- IMPORTANT: keep rls_policies.sql's per-table POLICIES in place for the core
-- client-facing tables (profiles/matches/messages) — this script only turns
-- RLS ON; it does not add or remove policies.
--═══════════════════════════════════════════════════════════════════════════

-- 1. Enable RLS on every muse_* table (idempotent, dynamic).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'muse_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- 2. Drop junk test tables left over from schema exploration.
DROP TABLE IF EXISTS public.zz_test_a;
DROP TABLE IF EXISTS public.zz_test_b;

-- 3. Diagnostic: confirm no public tables remain with RLS disabled.
--    (Should return 0 rows after running steps 1–2.)
SELECT n.nspname AS schema, c.relname AS table
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT LIKE 'pg_%'
  AND NOT c.relrowsecurity
ORDER BY c.relname;
