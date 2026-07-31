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

-- ── VERIFY POLICIES ──
SELECT schemaname, tablename, policyname, cmd, permissive FROM pg_policies WHERE schemaname = 'public';
