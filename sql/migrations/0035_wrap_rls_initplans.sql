-- 0035: wrap per-row auth/settings calls in RLS predicates.
-- Generated from live pg_policies; targets = the 64 auth_rls_initplan
-- lints from the Supabase performance advisor. Wrapping auth.uid()/
-- auth.jwt()/current_setting() in a scalar subquery makes Postgres evaluate
-- them once per statement instead of once per row.
-- Qualifiers are otherwise byte-identical (verified: unwrap(qual) == original).
-- No BEGIN/COMMIT: the runner runs each file as one implicit transaction,
-- so any failure rolls the whole file back.

-- form_submissions.Service role reads [SELECT]
DROP POLICY IF EXISTS "Service role reads" ON public.form_submissions;
CREATE POLICY "Service role reads" ON public.form_submissions AS PERMISSIVE FOR SELECT TO PUBLIC

  USING (((select auth.role()) = 'service_role'::text));

-- muse_blocks.muse_blocks_delete [DELETE]
DROP POLICY IF EXISTS "muse_blocks_delete" ON public.muse_blocks;
CREATE POLICY "muse_blocks_delete" ON public.muse_blocks AS PERMISSIVE FOR DELETE TO "authenticated"

  USING ((user_id IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_blocks.muse_blocks_insert [INSERT]
DROP POLICY IF EXISTS "muse_blocks_insert" ON public.muse_blocks;
CREATE POLICY "muse_blocks_insert" ON public.muse_blocks AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK ((user_id IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_blocks.muse_blocks_owner [SELECT]
DROP POLICY IF EXISTS "muse_blocks_owner" ON public.muse_blocks;
CREATE POLICY "muse_blocks_owner" ON public.muse_blocks AS PERMISSIVE FOR SELECT TO "authenticated"

  USING ((user_id IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_booking_payments.Payers and payees see payments [SELECT]
DROP POLICY IF EXISTS "Payers and payees see payments" ON public.muse_booking_payments;
CREATE POLICY "Payers and payees see payments" ON public.muse_booking_payments AS PERMISSIVE FOR SELECT TO PUBLIC

  USING ((((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_booking_payments.payer_id))) OR ((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_booking_payments.payee_id)))));

-- muse_bookings.Users can create own bookings [INSERT]
DROP POLICY IF EXISTS "Users can create own bookings" ON public.muse_bookings;
CREATE POLICY "Users can create own bookings" ON public.muse_bookings AS PERMISSIVE FOR INSERT TO PUBLIC

  WITH CHECK ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_bookings.Users can view own bookings [SELECT]
DROP POLICY IF EXISTS "Users can view own bookings" ON public.muse_bookings;
CREATE POLICY "Users can view own bookings" ON public.muse_bookings AS PERMISSIVE FOR SELECT TO PUBLIC

  USING (((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))) OR (host_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid()))))));

-- muse_bookings.muse_bookings_insert [INSERT]
DROP POLICY IF EXISTS "muse_bookings_insert" ON public.muse_bookings;
CREATE POLICY "muse_bookings_insert" ON public.muse_bookings AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_bookings.muse_bookings_select [SELECT]
DROP POLICY IF EXISTS "muse_bookings_select" ON public.muse_bookings;
CREATE POLICY "muse_bookings_select" ON public.muse_bookings AS PERMISSIVE FOR SELECT TO "authenticated"

  USING (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_briefs.Users create own briefs [INSERT]
DROP POLICY IF EXISTS "Users create own briefs" ON public.muse_briefs;
CREATE POLICY "Users create own briefs" ON public.muse_briefs AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_briefs.author_id))));

-- muse_briefs.muse_briefs_insert [INSERT]
DROP POLICY IF EXISTS "muse_briefs_insert" ON public.muse_briefs;
CREATE POLICY "muse_briefs_insert" ON public.muse_briefs AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_briefs.author_id))));

-- muse_community_members.Users can leave communities [DELETE]
DROP POLICY IF EXISTS "Users can leave communities" ON public.muse_community_members;
CREATE POLICY "Users can leave communities" ON public.muse_community_members AS PERMISSIVE FOR DELETE TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_community_members.muse_community_members_delete [DELETE]
DROP POLICY IF EXISTS "muse_community_members_delete" ON public.muse_community_members;
CREATE POLICY "muse_community_members_delete" ON public.muse_community_members AS PERMISSIVE FOR DELETE TO "authenticated"

  USING (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_community_members.muse_community_members_insert [INSERT]
DROP POLICY IF EXISTS "muse_community_members_insert" ON public.muse_community_members;
CREATE POLICY "muse_community_members_insert" ON public.muse_community_members AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_community_members.muse_community_members_select [SELECT]
DROP POLICY IF EXISTS "muse_community_members_select" ON public.muse_community_members;
CREATE POLICY "muse_community_members_select" ON public.muse_community_members AS PERMISSIVE FOR SELECT TO "authenticated"

  USING (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_connections.Users can create connections [INSERT]
DROP POLICY IF EXISTS "Users can create connections" ON public.muse_connections;
CREATE POLICY "Users can create connections" ON public.muse_connections AS PERMISSIVE FOR INSERT TO PUBLIC

  WITH CHECK ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_connections.Users can delete own connections [DELETE]
DROP POLICY IF EXISTS "Users can delete own connections" ON public.muse_connections;
CREATE POLICY "Users can delete own connections" ON public.muse_connections AS PERMISSIVE FOR DELETE TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_connections.Users can view own connections [SELECT]
DROP POLICY IF EXISTS "Users can view own connections" ON public.muse_connections;
CREATE POLICY "Users can view own connections" ON public.muse_connections AS PERMISSIVE FOR SELECT TO PUBLIC

  USING (((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))) OR (target_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid()))))));

-- muse_connections.muse_connections_insert [INSERT]
DROP POLICY IF EXISTS "muse_connections_insert" ON public.muse_connections;
CREATE POLICY "muse_connections_insert" ON public.muse_connections AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_connections.muse_connections_select [SELECT]
DROP POLICY IF EXISTS "muse_connections_select" ON public.muse_connections;
CREATE POLICY "muse_connections_select" ON public.muse_connections AS PERMISSIVE FOR SELECT TO "authenticated"

  USING ((((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))) OR ((target_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid()))))));

-- muse_content_scans.muse_content_scans_owner [SELECT]
DROP POLICY IF EXISTS "muse_content_scans_owner" ON public.muse_content_scans;
CREATE POLICY "muse_content_scans_owner" ON public.muse_content_scans AS PERMISSIVE FOR SELECT TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_disclosures.Disclosure parties can read [SELECT]
DROP POLICY IF EXISTS "Disclosure parties can read" ON public.muse_disclosures;
CREATE POLICY "Disclosure parties can read" ON public.muse_disclosures AS PERMISSIVE FOR SELECT TO PUBLIC

  USING (((proposer_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))) OR (responder_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid()))))));

-- muse_events.Service can manage events [ALL]
DROP POLICY IF EXISTS "Service can manage events" ON public.muse_events;
CREATE POLICY "Service can manage events" ON public.muse_events AS PERMISSIVE FOR ALL TO PUBLIC

  USING (((select auth.role()) = 'service_role'::text))
  WITH CHECK (((select auth.role()) = 'service_role'::text));

-- muse_feed_posts.Users create own feed posts [INSERT]
DROP POLICY IF EXISTS "Users create own feed posts" ON public.muse_feed_posts;
CREATE POLICY "Users create own feed posts" ON public.muse_feed_posts AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_feed_posts.author_id))));

-- muse_feed_posts.Users edit own feed posts [UPDATE]
DROP POLICY IF EXISTS "Users edit own feed posts" ON public.muse_feed_posts;
CREATE POLICY "Users edit own feed posts" ON public.muse_feed_posts AS PERMISSIVE FOR UPDATE TO "authenticated"

  USING (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_feed_posts.author_id))));

-- muse_feed_posts.muse_feed_insert [INSERT]
DROP POLICY IF EXISTS "muse_feed_insert" ON public.muse_feed_posts;
CREATE POLICY "muse_feed_insert" ON public.muse_feed_posts AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_feed_posts.author_id))));

-- muse_feed_posts.muse_feed_update [UPDATE]
DROP POLICY IF EXISTS "muse_feed_update" ON public.muse_feed_posts;
CREATE POLICY "muse_feed_update" ON public.muse_feed_posts AS PERMISSIVE FOR UPDATE TO "authenticated"

  USING (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_feed_posts.author_id))));

-- muse_forum_replies.muse_forum_replies_insert [INSERT]
DROP POLICY IF EXISTS "muse_forum_replies_insert" ON public.muse_forum_replies;
CREATE POLICY "muse_forum_replies_insert" ON public.muse_forum_replies AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_matches.Users can see their matches [SELECT]
DROP POLICY IF EXISTS "Users can see their matches" ON public.muse_matches;
CREATE POLICY "Users can see their matches" ON public.muse_matches AS PERMISSIVE FOR SELECT TO PUBLIC

  USING (((select auth.uid()) IN ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = ANY (ARRAY[muse_matches.user_id, muse_matches.target_id])))));

-- muse_matches.Users see own matches [SELECT]
DROP POLICY IF EXISTS "Users see own matches" ON public.muse_matches;
CREATE POLICY "Users see own matches" ON public.muse_matches AS PERMISSIVE FOR SELECT TO "authenticated"

  USING (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_matches.user_id))));

-- muse_matches.muse_matches_insert [INSERT]
DROP POLICY IF EXISTS "muse_matches_insert" ON public.muse_matches;
CREATE POLICY "muse_matches_insert" ON public.muse_matches AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_matches.muse_matches_insert_self [INSERT]
DROP POLICY IF EXISTS "muse_matches_insert_self" ON public.muse_matches;
CREATE POLICY "muse_matches_insert_self" ON public.muse_matches AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_matches.muse_matches_select [SELECT]
DROP POLICY IF EXISTS "muse_matches_select" ON public.muse_matches;
CREATE POLICY "muse_matches_select" ON public.muse_matches AS PERMISSIVE FOR SELECT TO "authenticated"

  USING (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_matches.user_id))));

-- muse_messages.muse_messages_insert [INSERT]
DROP POLICY IF EXISTS "muse_messages_insert" ON public.muse_messages;
CREATE POLICY "muse_messages_insert" ON public.muse_messages AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK ((sender_id = ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_messages.muse_messages_select [SELECT]
DROP POLICY IF EXISTS "muse_messages_select" ON public.muse_messages;
CREATE POLICY "muse_messages_select" ON public.muse_messages AS PERMISSIVE FOR SELECT TO "authenticated"

  USING (((sender_id = ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))) OR (receiver_id = ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid()))))));

-- muse_notifications.muse_notifications_owner [SELECT]
DROP POLICY IF EXISTS "muse_notifications_owner" ON public.muse_notifications;
CREATE POLICY "muse_notifications_owner" ON public.muse_notifications AS PERMISSIVE FOR SELECT TO "authenticated"

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_professionals.professionals_delete [DELETE]
DROP POLICY IF EXISTS "professionals_delete" ON public.muse_professionals;
CREATE POLICY "professionals_delete" ON public.muse_professionals AS PERMISSIVE FOR DELETE TO PUBLIC

  USING (((select auth.uid()) = user_id));

-- muse_professionals.professionals_update [UPDATE]
DROP POLICY IF EXISTS "professionals_update" ON public.muse_professionals;
CREATE POLICY "professionals_update" ON public.muse_professionals AS PERMISSIVE FOR UPDATE TO PUBLIC

  USING (((select auth.uid()) = user_id));

-- muse_professionals.professionals_upsert [INSERT]
DROP POLICY IF EXISTS "professionals_upsert" ON public.muse_professionals;
CREATE POLICY "professionals_upsert" ON public.muse_professionals AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((select auth.uid()) = user_id));

-- muse_profiles.Users can update own profile [UPDATE]
DROP POLICY IF EXISTS "Users can update own profile" ON public.muse_profiles;
CREATE POLICY "Users can update own profile" ON public.muse_profiles AS PERMISSIVE FOR UPDATE TO PUBLIC

  USING (((select auth.uid()) = auth_id));

-- muse_profiles.Users read own profile [SELECT]
DROP POLICY IF EXISTS "Users read own profile" ON public.muse_profiles;
CREATE POLICY "Users read own profile" ON public.muse_profiles AS PERMISSIVE FOR SELECT TO "authenticated"

  USING (((select auth.uid()) = auth_id));

-- muse_profiles.Users update own profile [UPDATE]
DROP POLICY IF EXISTS "Users update own profile" ON public.muse_profiles;
CREATE POLICY "Users update own profile" ON public.muse_profiles AS PERMISSIVE FOR UPDATE TO "authenticated"

  USING (((select auth.uid()) = auth_id))
  WITH CHECK (((select auth.uid()) = auth_id));

-- muse_prompt_responses.Users manage own responses [ALL]
DROP POLICY IF EXISTS "Users manage own responses" ON public.muse_prompt_responses;
CREATE POLICY "Users manage own responses" ON public.muse_prompt_responses AS PERMISSIVE FOR ALL TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_push_subscriptions.Users can delete own push subs [DELETE]
DROP POLICY IF EXISTS "Users can delete own push subs" ON public.muse_push_subscriptions;
CREATE POLICY "Users can delete own push subs" ON public.muse_push_subscriptions AS PERMISSIVE FOR DELETE TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_push_subscriptions.Users can save own push subs [INSERT]
DROP POLICY IF EXISTS "Users can save own push subs" ON public.muse_push_subscriptions;
CREATE POLICY "Users can save own push subs" ON public.muse_push_subscriptions AS PERMISSIVE FOR INSERT TO PUBLIC

  WITH CHECK ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_push_subscriptions.Users can view own push subs [SELECT]
DROP POLICY IF EXISTS "Users can view own push subs" ON public.muse_push_subscriptions;
CREATE POLICY "Users can view own push subs" ON public.muse_push_subscriptions AS PERMISSIVE FOR SELECT TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_push_subscriptions.muse_push_delete [DELETE]
DROP POLICY IF EXISTS "muse_push_delete" ON public.muse_push_subscriptions;
CREATE POLICY "muse_push_delete" ON public.muse_push_subscriptions AS PERMISSIVE FOR DELETE TO "authenticated"

  USING (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_push_subscriptions.muse_push_insert [INSERT]
DROP POLICY IF EXISTS "muse_push_insert" ON public.muse_push_subscriptions;
CREATE POLICY "muse_push_insert" ON public.muse_push_subscriptions AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_push_subscriptions.muse_push_select [SELECT]
DROP POLICY IF EXISTS "muse_push_select" ON public.muse_push_subscriptions;
CREATE POLICY "muse_push_select" ON public.muse_push_subscriptions AS PERMISSIVE FOR SELECT TO "authenticated"

  USING (((user_id)::text IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_referral_rewards.Users see own rewards [SELECT]
DROP POLICY IF EXISTS "Users see own rewards" ON public.muse_referral_rewards;
CREATE POLICY "Users see own rewards" ON public.muse_referral_rewards AS PERMISSIVE FOR SELECT TO PUBLIC

  USING (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_referral_rewards.recipient_id))));

-- muse_referrals.Users see own referrals [SELECT]
DROP POLICY IF EXISTS "Users see own referrals" ON public.muse_referrals;
CREATE POLICY "Users see own referrals" ON public.muse_referrals AS PERMISSIVE FOR SELECT TO PUBLIC

  USING (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_referrals.referrer_id))));

-- muse_reports.muse_reports_insert [INSERT]
DROP POLICY IF EXISTS "muse_reports_insert" ON public.muse_reports;
CREATE POLICY "muse_reports_insert" ON public.muse_reports AS PERMISSIVE FOR INSERT TO "authenticated"

  WITH CHECK ((reporter_id IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_reports.muse_reports_owner [SELECT]
DROP POLICY IF EXISTS "muse_reports_owner" ON public.muse_reports;
CREATE POLICY "muse_reports_owner" ON public.muse_reports AS PERMISSIVE FOR SELECT TO "authenticated"

  USING ((reporter_id IN ( SELECT (muse_profiles.id)::text AS id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_rsvps.Users delete own RSVPs [DELETE]
DROP POLICY IF EXISTS "Users delete own RSVPs" ON public.muse_rsvps;
CREATE POLICY "Users delete own RSVPs" ON public.muse_rsvps AS PERMISSIVE FOR DELETE TO PUBLIC

  USING (((select auth.uid()) = user_id));

-- muse_rsvps.Users insert own RSVPs [INSERT]
DROP POLICY IF EXISTS "Users insert own RSVPs" ON public.muse_rsvps;
CREATE POLICY "Users insert own RSVPs" ON public.muse_rsvps AS PERMISSIVE FOR INSERT TO PUBLIC

  WITH CHECK (((select auth.uid()) = user_id));

-- muse_rsvps.Users read own RSVPs [SELECT]
DROP POLICY IF EXISTS "Users read own RSVPs" ON public.muse_rsvps;
CREATE POLICY "Users read own RSVPs" ON public.muse_rsvps AS PERMISSIVE FOR SELECT TO PUBLIC

  USING (((select auth.uid()) = user_id));

-- muse_safety_checkins.Users view own check-ins [SELECT]
DROP POLICY IF EXISTS "Users view own check-ins" ON public.muse_safety_checkins;
CREATE POLICY "Users view own check-ins" ON public.muse_safety_checkins AS PERMISSIVE FOR SELECT TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_safety_incidents.muse_safety_incidents_owner [SELECT]
DROP POLICY IF EXISTS "muse_safety_incidents_owner" ON public.muse_safety_incidents;
CREATE POLICY "muse_safety_incidents_owner" ON public.muse_safety_incidents AS PERMISSIVE FOR SELECT TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_safety_profiles.Users manage own safety profile [ALL]
DROP POLICY IF EXISTS "Users manage own safety profile" ON public.muse_safety_profiles;
CREATE POLICY "Users manage own safety profile" ON public.muse_safety_profiles AS PERMISSIVE FOR ALL TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_safety_shares.Users view own shares [SELECT]
DROP POLICY IF EXISTS "Users view own shares" ON public.muse_safety_shares;
CREATE POLICY "Users view own shares" ON public.muse_safety_shares AS PERMISSIVE FOR SELECT TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_strikes.Users can view own strikes [SELECT]
DROP POLICY IF EXISTS "Users can view own strikes" ON public.muse_strikes;
CREATE POLICY "Users can view own strikes" ON public.muse_strikes AS PERMISSIVE FOR SELECT TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_stripe_connect.Users see own connect [SELECT]
DROP POLICY IF EXISTS "Users see own connect" ON public.muse_stripe_connect;
CREATE POLICY "Users see own connect" ON public.muse_stripe_connect AS PERMISSIVE FOR SELECT TO PUBLIC

  USING (((select auth.uid()) = ( SELECT muse_profiles.auth_id
   FROM muse_profiles
  WHERE (muse_profiles.id = muse_stripe_connect.user_id))));

-- muse_verification_sessions.muse_verification_sessions_owner [SELECT]
DROP POLICY IF EXISTS "muse_verification_sessions_owner" ON public.muse_verification_sessions;
CREATE POLICY "muse_verification_sessions_owner" ON public.muse_verification_sessions AS PERMISSIVE FOR SELECT TO PUBLIC

  USING ((user_id IN ( SELECT muse_profiles.id
   FROM muse_profiles
  WHERE (muse_profiles.auth_id = (select auth.uid())))));

-- muse_waitlist.muse_waitlist_owner [SELECT]
DROP POLICY IF EXISTS "muse_waitlist_owner" ON public.muse_waitlist;
CREATE POLICY "muse_waitlist_owner" ON public.muse_waitlist AS PERMISSIVE FOR SELECT TO PUBLIC

  USING ((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = (select auth.uid()))))::text));

-- policies rewritten: 64 / 94 total in public
