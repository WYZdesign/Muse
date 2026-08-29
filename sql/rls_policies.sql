-- ═══ MUSE APP — ROW LEVEL SECURITY POLICIES (CONSOLIDATED, IDEMPOTENT) ═══
-- Run this in Supabase Dashboard → SQL Editor. Safe to re-run.
-- NOTE: muse_messages sender_id/receiver_id store muse_profiles.id (UUID cast
-- to TEXT via muse_fix_chat.sql). Every auth.uid() check must be mapped through
-- muse_profiles.auth_id → id so the app's profile-id storage matches.

-- ── AUDIT: Check current RLS status ──
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- If ANY rows returned: these tables have NO protection.

-- ── ENABLE RLS on all public tables ──
ALTER TABLE public.muse_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_activity_log ENABLE ROW LEVEL SECURITY;

-- ── PROFILES: Anyone can view public profiles, only owner edits ──
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON muse_profiles;
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON public;
CREATE POLICY "Public profiles viewable by authenticated users"
ON public.muse_profiles FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON muse_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public;
CREATE POLICY "Users update own profile"
ON public.muse_profiles FOR UPDATE TO authenticated
USING (auth.uid() = auth_id)
WITH CHECK (auth.uid() = auth_id);

-- ── MATCHES: Only participants see their matches ──
DROP POLICY IF EXISTS "Users see own matches" ON muse_matches;
DROP POLICY IF EXISTS "Users see own matches" ON public;
CREATE POLICY "Users see own matches"
ON public.muse_matches FOR SELECT TO authenticated
USING (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = user_id));

DROP POLICY IF EXISTS "Users create own matches" ON muse_matches;
DROP POLICY IF EXISTS "Users can create matches" ON muse_matches;
DROP POLICY IF EXISTS "muse_matches_insert_self" ON muse_matches;
DROP POLICY IF EXISTS "muse_matches_insert_self" ON public;
CREATE POLICY "muse_matches_insert_self"
ON public.muse_matches FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));

-- ── MESSAGES: Only sender or receiver sees (profile-id storage) ──
DROP POLICY IF EXISTS "Users see own conversations" ON muse_messages;
DROP POLICY IF EXISTS "Users can read their messages" ON muse_messages;
DROP POLICY IF EXISTS "Users can read own messages" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_participants" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_select" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_insert" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_select" ON public;
CREATE POLICY "muse_messages_select" ON public.muse_messages FOR SELECT TO authenticated
USING (
  sender_id = (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid())
  OR receiver_id = (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "muse_messages_insert" ON public;
CREATE POLICY "muse_messages_insert" ON public.muse_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid())
);

-- ── FEED/FORUM POSTS: Anyone can read, only owner edits ──
DROP POLICY IF EXISTS "Feed posts viewable by all" ON muse_feed_posts;
DROP POLICY IF EXISTS "Feed posts viewable by all" ON public;
CREATE POLICY "Feed posts viewable by all"
ON public.muse_feed_posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users edit own feed posts" ON muse_feed_posts;
DROP POLICY IF EXISTS "Users edit own feed posts" ON public;
CREATE POLICY "Users edit own feed posts"
ON public.muse_feed_posts FOR UPDATE TO authenticated
USING (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));

DROP POLICY IF EXISTS "Users create own feed posts" ON muse_feed_posts;
DROP POLICY IF EXISTS "Users create own feed posts" ON public;
CREATE POLICY "Users create own feed posts"
ON public.muse_feed_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));

-- ── BRIEFS: Read by all, write by owner ──
DROP POLICY IF EXISTS "Briefs viewable by all" ON muse_briefs;
DROP POLICY IF EXISTS "Briefs viewable by all" ON public;
CREATE POLICY "Briefs viewable by all"
ON public.muse_briefs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users create own briefs" ON muse_briefs;
DROP POLICY IF EXISTS "Users create own briefs" ON public;
CREATE POLICY "Users create own briefs"
ON public.muse_briefs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));

-- ── NOTIFICATIONS: Only target user sees theirs ──
DROP POLICY IF EXISTS "Users see own notifications" ON muse_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON muse_notifications;
DROP POLICY IF EXISTS "Service can manage notifications" ON muse_notifications;
DROP POLICY IF EXISTS "muse_notifications_owner" ON public;
CREATE POLICY "muse_notifications_owner" ON public.muse_notifications FOR SELECT TO authenticated
USING (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- ── REPORTS: Only reporter sees own ──
DROP POLICY IF EXISTS "Users can view own reports" ON muse_reports;
DROP POLICY IF EXISTS "muse_reports_owner" ON muse_reports;
DROP POLICY IF EXISTS "muse_reports_owner" ON public;
CREATE POLICY "muse_reports_owner" ON public.muse_reports FOR SELECT TO authenticated
USING (reporter_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- ── BLOCKS: Users manage their own blocks ──
DROP POLICY IF EXISTS "Users manage own blocks" ON muse_blocks;
DROP POLICY IF EXISTS "Users can view own blocks" ON muse_blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_owner" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_delete" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_owner" ON public;
CREATE POLICY "muse_blocks_owner" ON public.muse_blocks FOR SELECT TO authenticated
USING (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "muse_blocks_insert" ON public;
CREATE POLICY "muse_blocks_insert" ON public.muse_blocks FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "muse_blocks_delete" ON public;
CREATE POLICY "muse_blocks_delete" ON public.muse_blocks FOR DELETE TO authenticated
USING (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- ── DROP DANGEROUS "Service can manage" OPEN POLICIES ──
-- service_role bypasses RLS anyway; these open the tables to anon/authenticated.
DROP POLICY IF EXISTS "Service can manage communities" ON muse_communities;
DROP POLICY IF EXISTS "Service can manage sessions" ON muse_sessions;
DROP POLICY IF EXISTS "Service can manage bookings" ON muse_bookings;
DROP POLICY IF EXISTS "Service can manage notifications" ON muse_notifications;

-- ── VERIFY POLICIES ──
SELECT schemaname, tablename, policyname, cmd, permissive FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
