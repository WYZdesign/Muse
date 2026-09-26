-- 0027_lock_down_profile_reads.sql
--
-- SECURITY (2026-09-25). Verified live against production: `muse_profiles` had
-- a SELECT policy `USING (true)` for the `public` role (plus a second one for
-- `authenticated`). The anon/publishable key ships inside the client bundle, so
-- ANY unauthenticated visitor could read EVERY profile row — including `email`
-- and `auth_id`. A raw PostgREST request with the anon key returned a real
-- user's email address.
--
-- Every profile read in the app goes through a server route that uses the
-- service-role key (`getServiceClient()`), which bypasses RLS. The one route
-- that used the shared anon client (`api/checkout`) was switched to the service
-- client in the same change. Nothing client-side reads `muse_profiles`.
--
-- Result: anon can no longer read profiles at all; authenticated users keep
-- least-privilege access to their OWN row.

DROP POLICY IF EXISTS "Profiles are public" ON muse_profiles;
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON muse_profiles;

DROP POLICY IF EXISTS "Users read own profile" ON muse_profiles;
CREATE POLICY "Users read own profile" ON muse_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_id);

-- Defence in depth: don't rely on RLS alone for the anonymous role.
REVOKE SELECT ON muse_profiles FROM anon;
