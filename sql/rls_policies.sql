-- ═══ MUSE APP — ROW LEVEL SECURITY POLICIES ═══
-- Run this in Supabase Dashboard → SQL Editor
-- BEFORE public launch. This prevents any authenticated user
-- from reading/writing other users' private data.

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
CREATE POLICY "Public profiles viewable by authenticated users"
ON public.muse_profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users update own profile"
ON public.muse_profiles FOR UPDATE TO authenticated
USING (auth.uid() = auth_id)
WITH CHECK (auth.uid() = auth_id);

-- ── MATCHES: Only participants see their matches ──
CREATE POLICY "Users see own matches"
ON public.muse_matches FOR SELECT TO authenticated
USING (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = user_id));

CREATE POLICY "Users create own matches"
ON public.muse_matches FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = user_id));

-- ── MESSAGES: Only sender or receiver sees ──
CREATE POLICY "Users see own conversations"
ON public.muse_messages FOR SELECT TO authenticated
USING (
  auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = sender_id)
  OR
  auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = receiver_id)
);

CREATE POLICY "Users send own messages"
ON public.muse_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = sender_id));

-- ── FEED/FORUM POSTS: Anyone can read, only owner edits ──
CREATE POLICY "Feed posts viewable by all"
ON public.muse_feed_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users edit own feed posts"
ON public.muse_feed_posts FOR UPDATE TO authenticated
USING (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));

CREATE POLICY "Users create own feed posts"
ON public.muse_feed_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));

-- ── BRIEFS: Read by all, write by owner ──
CREATE POLICY "Briefs viewable by all"
ON public.muse_briefs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users create own briefs"
ON public.muse_briefs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));

-- ── NOTIFICATIONS: Only target user sees theirs ──
CREATE POLICY "Users see own notifications"
ON public.muse_notifications FOR SELECT TO authenticated
USING (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = user_id));

-- ── BLOCKS: Users manage their own blocks ──
CREATE POLICY "Users manage own blocks"
ON public.muse_blocks FOR SELECT TO authenticated
USING (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = user_id));

CREATE POLICY "Users create own blocks"
ON public.muse_blocks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = user_id));

-- ── PURGE TEST ACCOUNTS ──
-- Run this to remove any test users from production:
-- DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%council%' OR email LIKE '%.wy%';
-- DELETE FROM public.muse_profiles WHERE auth_id NOT IN (SELECT id FROM auth.users);

-- ═══ CLAUDE'S PRIORITY 2 FIXES — DROP UNSAFE POLICIES ═══
-- These policies OR together with above — one USING(true) opens the table.

-- Messages: drop and recreate with proper participant restrictions
DROP POLICY IF EXISTS "muse_messages_participants" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_insert" ON muse_messages;
DROP POLICY IF EXISTS "Users can read their messages" ON muse_messages;
CREATE POLICY "muse_messages_select" ON muse_messages
  FOR SELECT USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text);
CREATE POLICY "muse_messages_insert" ON muse_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid()::text);

-- Reports/blocks: restrict to owning row
DROP POLICY IF EXISTS "Users can view own reports" ON muse_reports;
DROP POLICY IF EXISTS "Users can view own blocks" ON muse_blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON muse_blocks;
CREATE POLICY "muse_reports_owner" ON muse_reports
  FOR SELECT USING (reporter_id = auth.uid()::text);
CREATE POLICY "muse_blocks_owner" ON muse_blocks
  FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "muse_blocks_delete" ON muse_blocks
  FOR DELETE USING (user_id = auth.uid()::text);

-- Drop dangerous "Service can manage" policies (service_role already
-- bypasses RLS — these open tables to anon/authenticated too)
DROP POLICY IF EXISTS "Service can manage communities" ON muse_communities;
DROP POLICY IF EXISTS "Service can manage sessions" ON muse_sessions;
DROP POLICY IF EXISTS "Service can manage bookings" ON muse_bookings;
DROP POLICY IF EXISTS "Service can manage notifications" ON muse_notifications;

-- Matches: must be the user_id side inserting
DROP POLICY IF EXISTS "Users can create matches" ON muse_matches;
CREATE POLICY "muse_matches_insert_self" ON muse_matches
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));

-- NOTE: client_msg_id column needed for message dedup:
-- ALTER TABLE muse_messages ADD COLUMN IF NOT EXISTS client_msg_id TEXT UNIQUE;

-- ── VERIFY POLICIES ──
SELECT schemaname, tablename, policyname, cmd, permissive FROM pg_policies WHERE schemaname = 'public';
