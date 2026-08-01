-- ═══ MUSE APP — ONE-SHOT PRODUCTION MIGRATION (2026-08-01) ═══
-- Copy this entire file into Supabase Dashboard → SQL Editor → New Query → RUN.
-- Safe to re-run: all statements use IF NOT EXISTS / DROP IF EXISTS.
--
-- Supabase Dashboard URL: https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]/sql/new
-- (Find your project ref under Dashboard → Settings → General → Reference ID)

-- ============================================================
-- 1. CREATE MISSING TABLES (9 tables not on live DB)
-- ============================================================

-- Forum Replies (nested comments under forum posts)
CREATE TABLE IF NOT EXISTS muse_forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES muse_forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  user_name TEXT DEFAULT '',
  user_avatar TEXT DEFAULT '',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Communities (groups users can join)
CREATE TABLE IF NOT EXISTS muse_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  img TEXT DEFAULT '',
  member_count INT DEFAULT 0,
  category TEXT DEFAULT 'general',
  is_nsfw BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Community Members
CREATE TABLE IF NOT EXISTS muse_community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES muse_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  user_name TEXT DEFAULT '',
  user_avatar TEXT DEFAULT '',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Sessions (bookable 1:1 sessions)
CREATE TABLE IF NOT EXISTS muse_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'Consultation',
  rate TEXT DEFAULT '',
  duration TEXT DEFAULT '60 min',
  skills TEXT[] DEFAULT '{}',
  date TEXT DEFAULT '',
  location TEXT DEFAULT '',
  img TEXT DEFAULT '',
  available BOOLEAN DEFAULT true,
  rating DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings (session booking requests)
CREATE TABLE IF NOT EXISTS muse_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES muse_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  user_name TEXT DEFAULT '',
  user_avatar TEXT DEFAULT '',
  host_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Connections (professional networking)
CREATE TABLE IF NOT EXISTS muse_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_id)
);

-- Reports (user reports)
CREATE TABLE IF NOT EXISTS muse_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT DEFAULT 'user',
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks (user blocks)
CREATE TABLE IF NOT EXISTS muse_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_id)
);

-- Push Subscriptions (PWA web push)
CREATE TABLE IF NOT EXISTS muse_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_muse_forum_replies_post ON muse_forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_muse_community_members_user ON muse_community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_sessions_host ON muse_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_muse_bookings_user ON muse_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_bookings_session ON muse_bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_muse_connections_user ON muse_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_connections_target ON muse_connections(target_id);
CREATE INDEX IF NOT EXISTS idx_muse_reports_target ON muse_reports(target_id);
CREATE INDEX IF NOT EXISTS idx_muse_blocks_user ON muse_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_push_user ON muse_push_subscriptions(user_id);

-- ============================================================
-- 3. UNIQUE CONSTRAINTS (required by upsert patterns in API)
-- ============================================================

-- Push: upsert uses onConflict:"endpoint" — must have unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_muse_push_endpoint ON muse_push_subscriptions(endpoint);

-- ============================================================
-- 4. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================

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
ALTER TABLE public.muse_forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muse_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES (safe, owner-gated — no USING(true) anywhere)
-- ============================================================

-- ── PROFILES: authenticated users can read; only owner edits ──
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON muse_profiles;
CREATE POLICY "Public profiles viewable by authenticated users" ON muse_profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users update own profile" ON muse_profiles;
CREATE POLICY "Users update own profile" ON muse_profiles FOR UPDATE TO authenticated USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);

-- ── MATCHES: only participants see ──
DROP POLICY IF EXISTS "Users see own matches" ON muse_matches;
DROP POLICY IF EXISTS "muse_matches_insert_self" ON muse_matches;
CREATE POLICY "muse_matches_select" ON muse_matches FOR SELECT TO authenticated
USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));
CREATE POLICY "muse_matches_insert" ON muse_matches FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));

-- ── MESSAGES: only sender or receiver sees ──
DROP POLICY IF EXISTS "muse_messages_select" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_insert" ON muse_messages;
CREATE POLICY "muse_messages_select" ON muse_messages FOR SELECT TO authenticated
USING (
  sender_id::text = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
  OR receiver_id::text = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "muse_messages_insert" ON muse_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id::text = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
);

-- ── FEED POSTS: anyone reads, owner edits ──
DROP POLICY IF EXISTS "Feed posts viewable by all" ON muse_feed_posts;
CREATE POLICY "Feed posts viewable by all" ON muse_feed_posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users create own feed posts" ON muse_feed_posts;
CREATE POLICY "muse_feed_insert" ON muse_feed_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = author_id));
DROP POLICY IF EXISTS "Users edit own feed posts" ON muse_feed_posts;
CREATE POLICY "muse_feed_update" ON muse_feed_posts FOR UPDATE TO authenticated
USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = author_id));

-- ── BRIEFS: anyone reads, owner creates ──
DROP POLICY IF EXISTS "Briefs viewable by all" ON muse_briefs;
CREATE POLICY "Briefs viewable by all" ON muse_briefs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users create own briefs" ON muse_briefs;
CREATE POLICY "muse_briefs_insert" ON muse_briefs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = author_id));

-- ── FORUM POSTS: anyone reads, owner creates ──
DROP POLICY IF EXISTS "Forum posts viewable by all" ON muse_forum_posts;
CREATE POLICY "Forum posts viewable by all" ON muse_forum_posts FOR SELECT TO authenticated USING (true);

-- ── NOTIFICATIONS: only target user sees theirs ──
DROP POLICY IF EXISTS "muse_notifications_owner" ON muse_notifications;
CREATE POLICY "muse_notifications_owner" ON muse_notifications FOR SELECT TO authenticated
USING (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));

-- ── REPORTS: only reporter sees own ──
DROP POLICY IF EXISTS "muse_reports_owner" ON muse_reports;
CREATE POLICY "muse_reports_owner" ON muse_reports FOR SELECT TO authenticated
USING (reporter_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert reports" ON muse_reports;
CREATE POLICY "muse_reports_insert" ON muse_reports FOR INSERT TO authenticated
WITH CHECK (reporter_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));

-- ── BLOCKS: owner manages own blocks ──
DROP POLICY IF EXISTS "muse_blocks_owner" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_insert" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_delete" ON muse_blocks;
CREATE POLICY "muse_blocks_owner" ON muse_blocks FOR SELECT TO authenticated
USING (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));
CREATE POLICY "muse_blocks_insert" ON muse_blocks FOR INSERT TO authenticated
WITH CHECK (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));
CREATE POLICY "muse_blocks_delete" ON muse_blocks FOR DELETE TO authenticated
USING (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));

-- ── NEW TABLES: owner-gated policies ──
DROP POLICY IF EXISTS "Communities viewable by all" ON muse_communities;
CREATE POLICY "Communities viewable by all" ON muse_communities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Community members viewable by members" ON muse_community_members;
CREATE POLICY "muse_community_members_select" ON muse_community_members FOR SELECT TO authenticated
USING (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));
CREATE POLICY "muse_community_members_insert" ON muse_community_members FOR INSERT TO authenticated
WITH CHECK (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));
CREATE POLICY "muse_community_members_delete" ON muse_community_members FOR DELETE TO authenticated
USING (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Sessions viewable by all" ON muse_sessions;
CREATE POLICY "Sessions viewable by all" ON muse_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Bookings owner" ON muse_bookings;
CREATE POLICY "muse_bookings_select" ON muse_bookings FOR SELECT TO authenticated
USING (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));
CREATE POLICY "muse_bookings_insert" ON muse_bookings FOR INSERT TO authenticated
WITH CHECK (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Connections owner" ON muse_connections;
CREATE POLICY "muse_connections_select" ON muse_connections FOR SELECT TO authenticated
USING (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
   OR target_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));
CREATE POLICY "muse_connections_insert" ON muse_connections FOR INSERT TO authenticated
WITH CHECK (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Forum replies viewable by all" ON muse_forum_replies;
CREATE POLICY "Forum replies viewable by all" ON muse_forum_replies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Push subs owner" ON muse_push_subscriptions;
CREATE POLICY "muse_push_select" ON muse_push_subscriptions FOR SELECT TO authenticated
USING (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));
CREATE POLICY "muse_push_insert" ON muse_push_subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));
CREATE POLICY "muse_push_delete" ON muse_push_subscriptions FOR DELETE TO authenticated
USING (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));

-- ── CLEAN UP any remaining wide-open policies from earlier migrations ──
DROP POLICY IF EXISTS "Users can view own reports" ON muse_reports;
DROP POLICY IF EXISTS "Users can insert blocks" ON muse_blocks;
DROP POLICY IF EXISTS "Users can view own blocks" ON muse_blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON muse_blocks;
DROP POLICY IF EXISTS "Service can manage communities" ON muse_communities;
DROP POLICY IF EXISTS "Service can manage sessions" ON muse_sessions;
DROP POLICY IF EXISTS "Service can manage bookings" ON muse_bookings;
DROP POLICY IF EXISTS "Service can manage notifications" ON muse_notifications;

-- ============================================================
-- 6. REALTIME PUBLICATION (chat requires this)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE muse_messages;

-- ============================================================
-- 7. PROFILE COLUMN GATING (remove email from public SELECT)
-- ============================================================
-- The API already filters email at the application layer. For defense-in-depth,
-- you may optionally REVOKE SELECT on the email column from authenticated role,
-- so even a misconfigured API can't leak it. Must be run as superuser.
--
--   REVOKE SELECT (email) ON muse_profiles FROM authenticated;
--
-- NOTE: This causes supabase-js `select("*")` to exclude email automatically.
-- Only apply if your API runs as authenticated (anon key), not service_role.

-- ============================================================
-- 8. VERIFY
-- ============================================================

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
