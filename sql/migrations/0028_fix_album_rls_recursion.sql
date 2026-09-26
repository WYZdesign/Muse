-- 0028_fix_album_rls_recursion.sql
--
-- BUG (verified live 2026-09-25): any non-service role querying muse_albums or
-- muse_album_photos got HTTP 500 `42P17 infinite recursion detected in policy
-- for relation "muse_albums"`. The cycle is:
--     muse_albums_select  -> muse_album_access
--     muse_album_access_select/write -> muse_albums
-- Policy subqueries run with the INVOKER's rights, so RLS is re-entered on the
-- other table and the two policies reference each other forever.
--
-- Fix: move the cross-table checks into SECURITY DEFINER helpers. Those run as
-- the function owner (which bypasses RLS), so the cycle is broken while the
-- `auth.uid()` inside still reflects the caller. Also adds the missing
-- WITH CHECK on muse_albums_insert (it had no predicate at all).

CREATE OR REPLACE FUNCTION public.muse_current_profile_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM muse_profiles WHERE auth_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.muse_owns_album(p_album_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM muse_albums a
    WHERE a.id = p_album_id
      AND a.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid() LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION public.muse_can_view_album(p_album_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM muse_albums a
    WHERE a.id = p_album_id
      AND (a.access_level = 'public'
           OR a.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid() LIMIT 1))
  ) OR EXISTS (
    SELECT 1 FROM muse_album_access ac
    WHERE ac.album_id = p_album_id
      AND ac.viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid() LIMIT 1)
  )
$$;

GRANT EXECUTE ON FUNCTION public.muse_current_profile_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.muse_owns_album(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.muse_can_view_album(uuid) TO anon, authenticated;

-- ── muse_albums ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS muse_albums_select ON muse_albums;
CREATE POLICY muse_albums_select ON muse_albums FOR SELECT TO public
  USING (access_level = 'public' OR muse_owns_album(id));

DROP POLICY IF EXISTS muse_albums_insert ON muse_albums;
CREATE POLICY muse_albums_insert ON muse_albums FOR INSERT TO authenticated
  WITH CHECK (profile_id = muse_current_profile_id());

DROP POLICY IF EXISTS muse_albums_update ON muse_albums;
DROP POLICY IF EXISTS muse_albums_delete ON muse_albums;
CREATE POLICY muse_albums_update ON muse_albums FOR UPDATE TO authenticated
  USING (profile_id = muse_current_profile_id())
  WITH CHECK (profile_id = muse_current_profile_id());
CREATE POLICY muse_albums_delete ON muse_albums FOR DELETE TO authenticated
  USING (profile_id = muse_current_profile_id());

-- ── muse_album_photos ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS muse_album_photos_select ON muse_album_photos;
CREATE POLICY muse_album_photos_select ON muse_album_photos FOR SELECT TO public
  USING (muse_can_view_album(album_id));

DROP POLICY IF EXISTS muse_album_photos_write ON muse_album_photos;
CREATE POLICY muse_album_photos_write ON muse_album_photos FOR ALL TO authenticated
  USING (muse_owns_album(album_id))
  WITH CHECK (muse_owns_album(album_id));

-- ── muse_album_access ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS muse_album_access_select ON muse_album_access;
DROP POLICY IF EXISTS muse_album_access_write ON muse_album_access;
CREATE POLICY muse_album_access_select ON muse_album_access FOR SELECT TO public
  USING (viewer_profile_id = muse_current_profile_id() OR muse_owns_album(album_id));
CREATE POLICY muse_album_access_write ON muse_album_access FOR ALL TO authenticated
  USING (muse_owns_album(album_id))
  WITH CHECK (muse_owns_album(album_id));
