-- 0036: one permissive policy per (table, command) after the 0031/0032/0035 passes.
--
-- 2+ PERMISSIVE policies on the same (table, command, role) are OR'd together:
-- a broad legacy policy can silently widen a narrow new one, and the planner
-- evaluates every duplicate. This migration collapses each collision to the
-- single policy that carries the union of the previous predicates, so effective
-- access is provably unchanged. Predicate text is copied verbatim from
-- pg_policies (already carrying the 0035 scalar-subquery wrapping).
--
-- Verification performed before apply: rolled-back RLS probes as anon /
-- authenticated owner / authenticated non-owner / service_role, comparing the
-- exact row ids each role can SELECT and the ids each can INSERT/UPDATE/DELETE,
-- before vs after. Zero drift required. No BEGIN/COMMIT: the runner executes
-- this file as one implicit transaction, so a failure rolls all of it back.

-- muse_briefs: drop duplicate 'Users create own briefs'; 'muse_briefs_insert' already carries the same predicate
DROP POLICY IF EXISTS "Users create own briefs" ON public.muse_briefs;

-- muse_communities: drop duplicate 'Communities viewable by all'; 'Communities are public' already carries the same predicate
DROP POLICY IF EXISTS "Communities viewable by all" ON public.muse_communities;

-- muse_feed_posts: drop duplicate 'Users create own feed posts'; 'muse_feed_insert' already carries the same predicate
DROP POLICY IF EXISTS "Users create own feed posts" ON public.muse_feed_posts;

-- muse_feed_posts: drop duplicate 'Users edit own feed posts'; 'muse_feed_update' already carries the same predicate
DROP POLICY IF EXISTS "Users edit own feed posts" ON public.muse_feed_posts;

-- muse_forum_replies: drop duplicate 'Forum replies viewable by all'; 'Forum replies are public' already carries the same predicate
DROP POLICY IF EXISTS "Forum replies viewable by all" ON public.muse_forum_replies;

-- muse_matches: drop duplicate 'muse_matches_insert_self'; 'muse_matches_insert' already carries the same predicate
DROP POLICY IF EXISTS "muse_matches_insert_self" ON public.muse_matches;

-- muse_profiles: drop duplicate 'Users update own profile'; 'Users can update own profile' already carries the same predicate
DROP POLICY IF EXISTS "Users update own profile" ON public.muse_profiles;

-- muse_sessions: drop duplicate 'Sessions viewable by all'; 'Sessions are public' already carries the same predicate
DROP POLICY IF EXISTS "Sessions viewable by all" ON public.muse_sessions;

-- muse_bookings: drop duplicate 'Users can create own bookings'; 'muse_bookings_insert' already carries the same predicate
DROP POLICY IF EXISTS "Users can create own bookings" ON public.muse_bookings;

-- muse_community_members: drop duplicate 'Users can leave communities'; 'muse_community_members_delete' already carries the same predicate
DROP POLICY IF EXISTS "Users can leave communities" ON public.muse_community_members;

-- muse_connections: drop duplicate 'Users can create connections'; 'muse_connections_insert' already carries the same predicate
DROP POLICY IF EXISTS "Users can create connections" ON public.muse_connections;

-- muse_push_subscriptions: drop duplicate 'Users can delete own push subs'; 'muse_push_delete' already carries the same predicate
DROP POLICY IF EXISTS "Users can delete own push subs" ON public.muse_push_subscriptions;

-- muse_push_subscriptions: drop duplicate 'Users can save own push subs'; 'muse_push_insert' already carries the same predicate
DROP POLICY IF EXISTS "Users can save own push subs" ON public.muse_push_subscriptions;

-- muse_push_subscriptions: drop duplicate 'Users can view own push subs'; 'muse_push_select' already carries the same predicate
DROP POLICY IF EXISTS "Users can view own push subs" ON public.muse_push_subscriptions;

-- muse_connections: drop duplicate 'Users can view own connections'; 'muse_connections_select' already carries the same predicate
DROP POLICY IF EXISTS "Users can view own connections" ON public.muse_connections;

-- muse_community_members: drop duplicate 'muse_community_members_select'; 'Community members are public' already carries the same predicate
DROP POLICY IF EXISTS "muse_community_members_select" ON public.muse_community_members;

-- muse_bookings: 'muse_bookings_select' takes the union predicate from 'Users can view own bookings', which is dropped
DROP POLICY IF EXISTS "muse_bookings_select" ON public.muse_bookings;
CREATE POLICY "muse_bookings_select" ON public.muse_bookings AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = ( SELECT auth.uid() AS uid)))) OR (host_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY IF EXISTS "Users can view own bookings" ON public.muse_bookings;

-- muse_matches: 'muse_matches_select' takes the union predicate from 'Users can see their matches', which is dropped
DROP POLICY IF EXISTS "muse_matches_select" ON public.muse_matches;
CREATE POLICY "muse_matches_select" ON public.muse_matches AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) IN ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = ANY (ARRAY[muse_matches.user_id, muse_matches.target_id])))));
DROP POLICY IF EXISTS "Users can see their matches" ON public.muse_matches;

-- muse_album_access: 'muse_album_access_write' is FOR ALL; expand it so its SELECT half stops
-- overlapping the table's SELECT policy. USING/WITH CHECK are copied verbatim.
DROP POLICY IF EXISTS "muse_album_access_write" ON public.muse_album_access;
CREATE POLICY "muse_album_access_write_insert" ON public.muse_album_access AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK (muse_owns_album(album_id));
CREATE POLICY "muse_album_access_write_update" ON public.muse_album_access AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING (muse_owns_album(album_id))
  WITH CHECK (muse_owns_album(album_id));
CREATE POLICY "muse_album_access_write_delete" ON public.muse_album_access AS PERMISSIVE FOR DELETE TO "authenticated"
  USING (muse_owns_album(album_id));

-- muse_album_photos: 'muse_album_photos_write' is FOR ALL; expand it so its SELECT half stops
-- overlapping the table's SELECT policy. USING/WITH CHECK are copied verbatim.
DROP POLICY IF EXISTS "muse_album_photos_write" ON public.muse_album_photos;
CREATE POLICY "muse_album_photos_write_insert" ON public.muse_album_photos AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK (muse_owns_album(album_id));
CREATE POLICY "muse_album_photos_write_update" ON public.muse_album_photos AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING (muse_owns_album(album_id))
  WITH CHECK (muse_owns_album(album_id));
CREATE POLICY "muse_album_photos_write_delete" ON public.muse_album_photos AS PERMISSIVE FOR DELETE TO "authenticated"
  USING (muse_owns_album(album_id));

-- muse_events: 'Service can manage events' is FOR ALL; expand it so its SELECT half stops
-- overlapping the table's SELECT policy. USING/WITH CHECK are copied verbatim.
DROP POLICY IF EXISTS "Service can manage events" ON public.muse_events;
CREATE POLICY "Service can manage events_insert" ON public.muse_events AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));
CREATE POLICY "Service can manage events_update" ON public.muse_events AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ((( SELECT auth.role() AS role) = 'service_role'::text))
  WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));
CREATE POLICY "Service can manage events_delete" ON public.muse_events AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ((( SELECT auth.role() AS role) = 'service_role'::text));

-- 16 duplicates dropped, 2 predicates re-pointed, 3 ALL policies expanded
