-- ═══════════════════════════════════════════════════════════════════════════
-- MUSE — SUPABASE DASHBOARD FIX (2026-08-06)
-- Paste into Supabase Dashboard → SQL Editor → Run. Safe to re-run (idempotent).
--
-- Covers the audit checklist:
--   1. Create the 9 missing tables (table defs ONLY — no wide-open policies)
--   2. muse_notifications.text column (live table has body/title, no text)
--   3. muse_push_subscriptions UNIQUE(endpoint) so upsert onConflict works
--   4. muse_reports.target_type column (API inserts it; no schema had it)
--   5. muse_messages text-key migration + realtime publication (muse_fix_chat v2)
--   6. RLS enabled everywhere + safe authenticated-only policies (rls_policies.sql)
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- A. CREATE THE 9 MISSING TABLES (idempotent, table defs only — NO policies)
-- ────────────────────────────────────────────────────────────────────────────

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

-- Community Members (join table)
CREATE TABLE IF NOT EXISTS muse_community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES muse_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  user_name TEXT DEFAULT '',
  user_avatar TEXT DEFAULT '',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Sessions (bookable one-on-one sessions)
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

-- Connections (professional networking requests)
CREATE TABLE IF NOT EXISTS muse_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_id)
);

-- Web Push Subscriptions (PWA lock-screen notifications)
CREATE TABLE IF NOT EXISTS muse_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports (user-submitted reports)
CREATE TABLE IF NOT EXISTS muse_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks (user-blocked profiles)
CREATE TABLE IF NOT EXISTS muse_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_muse_forum_replies_post ON muse_forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_muse_communities_member ON muse_communities(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_muse_community_members_user ON muse_community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_sessions_host ON muse_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_muse_sessions_date ON muse_sessions(date);
CREATE INDEX IF NOT EXISTS idx_muse_bookings_user ON muse_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_bookings_session ON muse_bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_muse_connections_user ON muse_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_connections_target ON muse_connections(target_id);
CREATE INDEX IF NOT EXISTS idx_muse_push_user ON muse_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_reports_target ON muse_reports(target_id);
CREATE INDEX IF NOT EXISTS idx_muse_blocks_user ON muse_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_blocks_target ON muse_blocks(target_id);

-- ────────────────────────────────────────────────────────────────────────────
-- B. COLUMN FIXES ON EXISTING TABLES (idempotent)
-- ────────────────────────────────────────────────────────────────────────────

-- muse_notifications: live table has body/title but no text; app inserts text:
ALTER TABLE muse_notifications ADD COLUMN IF NOT EXISTS text TEXT DEFAULT '';

-- muse_push_subscriptions: upsert onConflict:"endpoint" needs a UNIQUE constraint
-- (Postgres has no ADD CONSTRAINT IF NOT EXISTS — guard via pg_constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'muse_push_subscriptions'
      AND c.conname = 'muse_push_subscriptions_endpoint_key'
  ) THEN
    ALTER TABLE muse_push_subscriptions
      ADD CONSTRAINT muse_push_subscriptions_endpoint_key UNIQUE (endpoint);
  END IF;
END $$;

-- muse_reports: API inserts target_type; no schema file had the column
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT '';

-- ────────────────────────────────────────────────────────────────────────────
-- C. MUSE_MESSAGES FIX (muse_fix_chat v2) — drop old policies, text keys, realtime
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can read own messages" ON muse_messages;
DROP POLICY IF EXISTS "Users can read their messages" ON muse_messages;
DROP POLICY IF EXISTS "Users can send messages" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_participants" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_insert" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_select" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_update" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_delete" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_select_participant" ON muse_messages;

-- Drop ANY other policy on muse_messages we don't know the exact name of —
-- an unknown named policy referencing sender_id would still block the ALTER.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'muse_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.muse_messages', p.policyname);
  END LOOP;
END $$;

-- muse_messages key columns → TEXT (app writes "userA__userB" string keys)
DO $$
DECLARE fk RECORD;
BEGIN
  -- Drop FK constraints on the key columns first — the app's match_id is a
  -- derived "userA__userB" string, not a real muse_matches(id) UUID, so the
  -- old FK (e.g. muse_messages_match_id_fkey) would block the type change.
  FOR fk IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.muse_messages'::regclass
      AND c.conkey && (
        SELECT ARRAY(SELECT a.attnum FROM pg_attribute a
                     WHERE a.attrelid = 'public.muse_messages'::regclass
                       AND a.attname IN ('match_id','sender_id','receiver_id'))
      )
  LOOP
    EXECUTE format('ALTER TABLE public.muse_messages DROP CONSTRAINT %I', fk.conname);
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='muse_messages' AND column_name='match_id' AND data_type='uuid') THEN
    ALTER TABLE muse_messages ALTER COLUMN match_id TYPE TEXT USING match_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='muse_messages' AND column_name='sender_id' AND data_type='uuid') THEN
    ALTER TABLE muse_messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='muse_messages' AND column_name='receiver_id') THEN
    ALTER TABLE muse_messages ADD COLUMN receiver_id TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='muse_messages' AND column_name='client_msg_id') THEN
    ALTER TABLE muse_messages ADD COLUMN client_msg_id TEXT UNIQUE;
  END IF;
END $$;

-- Realtime: stream INSERTs so chat is live
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'muse_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE muse_messages;
  END IF;
END $$;

-- muse_notifications: ensure table + owner-read policy (service-role writes)
CREATE TABLE IF NOT EXISTS muse_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  from_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'system',
  text TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE muse_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_notifications_owner" ON muse_notifications;
DROP POLICY IF EXISTS "muse_notifications_owner" ON muse_notifications;
CREATE POLICY "muse_notifications_owner" ON muse_notifications
  FOR SELECT USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- D. RLS — ENABLE EVERYWHERE + SAFE AUTHENTICATED-ONLY POLICIES
--    (from rls_policies.sql — wide-open USING(true)/WITH CHECK(true) policies
--     are intentionally NOT recreated here)
-- ────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all public tables (guard: only tables that exist on live)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'muse_profiles','muse_matches','muse_messages','muse_feed_posts','muse_briefs',
    'muse_forum_posts','muse_connections','muse_community_members','muse_bookings',
    'muse_notifications','muse_reports','muse_blocks','muse_activity_log',
    'muse_forum_replies','muse_communities','muse_sessions','muse_push_subscriptions',
    'muse_feed_comments','muse_brief_applications','muse_event_rsvps'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname = 'public' AND c.relname = tbl AND c.relkind = 'r') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;

-- PROFILES: only authenticated users view public profiles; owner edits.
-- Email is NOT exposed to anon (the public anon key lives in the browser bundle).
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON muse_profiles;
DROP POLICY IF EXISTS "Profiles are public" ON muse_profiles;
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

-- MATCHES: only participants see their matches; only self-insert
DROP POLICY IF EXISTS "Users see own matches" ON muse_matches;
DROP POLICY IF EXISTS "Users can see their matches" ON muse_matches;
DROP POLICY IF EXISTS "Users can create matches" ON muse_matches;
DROP POLICY IF EXISTS "muse_matches_insert_self" ON muse_matches;
DROP POLICY IF EXISTS "Users see own matches" ON public;
CREATE POLICY "Users see own matches"
ON public.muse_matches FOR SELECT TO authenticated
USING (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = user_id));
DROP POLICY IF EXISTS "muse_matches_insert_self" ON public;
CREATE POLICY "muse_matches_insert_self"
ON public.muse_matches FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));

-- MESSAGES: only sender or receiver sees (profile-id TEXT storage)
DROP POLICY IF EXISTS "Users see own conversations" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_select" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_insert" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_select_participant" ON muse_messages;
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

-- FEED POSTS: read by all authenticated, only owner edits/creates
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

-- BRIEFS: read by all authenticated, owner creates
DROP POLICY IF EXISTS "Briefs viewable by all" ON muse_briefs;
DROP POLICY IF EXISTS "Briefs viewable by all" ON public;
CREATE POLICY "Briefs viewable by all"
ON public.muse_briefs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users create own briefs" ON muse_briefs;
DROP POLICY IF EXISTS "Users create own briefs" ON public;
CREATE POLICY "Users create own briefs"
ON public.muse_briefs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));

-- NOTIFICATIONS: only target user sees theirs
DROP POLICY IF EXISTS "Users see own notifications" ON muse_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON muse_notifications;
DROP POLICY IF EXISTS "Service can manage notifications" ON muse_notifications;
DROP POLICY IF EXISTS "muse_notifications_owner" ON muse_notifications;
DROP POLICY IF EXISTS "muse_notifications_owner" ON public;
CREATE POLICY "muse_notifications_owner" ON public.muse_notifications FOR SELECT TO authenticated
USING (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- REPORTS: only reporter sees own
DROP POLICY IF EXISTS "Users can view own reports" ON muse_reports;
DROP POLICY IF EXISTS "muse_reports_owner" ON muse_reports;
DROP POLICY IF EXISTS "Users can insert reports" ON muse_reports;
DROP POLICY IF EXISTS "muse_reports_owner" ON public;
CREATE POLICY "muse_reports_owner" ON public.muse_reports FOR SELECT TO authenticated
USING (reporter_id IN (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert reports" ON public;
CREATE POLICY "Users can insert reports" ON public.muse_reports FOR INSERT TO authenticated
WITH CHECK (reporter_id IN (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- BLOCKS: users manage their own blocks
DROP POLICY IF EXISTS "Users manage own blocks" ON muse_blocks;
DROP POLICY IF EXISTS "Users can view own blocks" ON muse_blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON muse_blocks;
DROP POLICY IF EXISTS "Users can insert blocks" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_owner" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_delete" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_insert" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_owner" ON public;
CREATE POLICY "muse_blocks_owner" ON public.muse_blocks FOR SELECT TO authenticated
USING (user_id IN (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "muse_blocks_insert" ON public;
CREATE POLICY "muse_blocks_insert" ON public.muse_blocks FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "muse_blocks_delete" ON public;
CREATE POLICY "muse_blocks_delete" ON public.muse_blocks FOR DELETE TO authenticated
USING (user_id IN (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- FORUM REPLIES: read by all authenticated, only self-insert
DROP POLICY IF EXISTS "Forum replies are public" ON muse_forum_replies;
DROP POLICY IF EXISTS "Users can post replies" ON muse_forum_replies;
DROP POLICY IF EXISTS "Forum replies are public" ON public;
CREATE POLICY "Forum replies are public" ON public.muse_forum_replies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can post replies" ON public;
CREATE POLICY "Users can post replies" ON public.muse_forum_replies FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- COMMUNITIES: public read
DROP POLICY IF EXISTS "Communities are public" ON muse_communities;
DROP POLICY IF EXISTS "Service can manage communities" ON muse_communities;
DROP POLICY IF EXISTS "Communities are public" ON public;
CREATE POLICY "Communities are public" ON public.muse_communities FOR SELECT TO authenticated USING (true);

-- COMMUNITY MEMBERS: users see memberships, can join/leave
DROP POLICY IF EXISTS "Community members are public" ON muse_community_members;
DROP POLICY IF EXISTS "Users can join communities" ON muse_community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON muse_community_members;
DROP POLICY IF EXISTS "Community members are public" ON public;
CREATE POLICY "Community members are public" ON public.muse_community_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can join communities" ON public;
CREATE POLICY "Users can join communities" ON public.muse_community_members FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can leave communities" ON public;
CREATE POLICY "Users can leave communities" ON public.muse_community_members FOR DELETE TO authenticated
USING (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- SESSIONS: public read
DROP POLICY IF EXISTS "Sessions are public" ON muse_sessions;
DROP POLICY IF EXISTS "Service can manage sessions" ON muse_sessions;
DROP POLICY IF EXISTS "Sessions are public" ON public;
CREATE POLICY "Sessions are public" ON public.muse_sessions FOR SELECT TO authenticated USING (true);

-- BOOKINGS: users manage their own, hosts can view
DROP POLICY IF EXISTS "Users can view own bookings" ON muse_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON muse_bookings;
DROP POLICY IF EXISTS "Service can manage bookings" ON muse_bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public;
CREATE POLICY "Users can view own bookings" ON public.muse_bookings FOR SELECT TO authenticated
USING (
  user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid())
  OR host_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can create bookings" ON public;
CREATE POLICY "Users can create bookings" ON public.muse_bookings FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- CONNECTIONS: users see their own, can create
DROP POLICY IF EXISTS "Users can view own connections" ON muse_connections;
DROP POLICY IF EXISTS "Users can create connections" ON muse_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON muse_connections;
DROP POLICY IF EXISTS "Users can view own connections" ON public;
CREATE POLICY "Users can view own connections" ON public.muse_connections FOR SELECT TO authenticated
USING (
  user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid())
  OR target_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can create connections" ON public;
CREATE POLICY "Users can create connections" ON public.muse_connections FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete own connections" ON public;
CREATE POLICY "Users can delete own connections" ON public.muse_connections FOR DELETE TO authenticated
USING (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- PUSH SUBSCRIPTIONS: users manage their own
DROP POLICY IF EXISTS "Users can view own push subs" ON muse_push_subscriptions;
DROP POLICY IF EXISTS "Users can save push subs" ON muse_push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subs" ON muse_push_subscriptions;
DROP POLICY IF EXISTS "Users can view own push subs" ON public;
CREATE POLICY "Users can view own push subs" ON public.muse_push_subscriptions FOR SELECT TO authenticated
USING (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can save push subs" ON public;
CREATE POLICY "Users can save push subs" ON public.muse_push_subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete own push subs" ON public;
CREATE POLICY "Users can delete own push subs" ON public.muse_push_subscriptions FOR DELETE TO authenticated
USING (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

-- DROP DANGEROUS "Service can manage" OPEN POLICIES left by earlier files
-- (service_role bypasses RLS anyway; these opened tables to anon/authenticated)
DROP POLICY IF EXISTS "Service can manage communities" ON muse_communities;
DROP POLICY IF EXISTS "Service can manage sessions" ON muse_sessions;
DROP POLICY IF EXISTS "Service can manage bookings" ON muse_bookings;
DROP POLICY IF EXISTS "Service can manage notifications" ON muse_notifications;

-- DROP the trust/safety "Service manages X" policies — these were written with
-- NO `TO` clause, so they default to PUBLIC (incl. the anon key in the browser
-- bundle) and open ALL of these tables' data. service_role ignores RLS anyway,
-- so the policies are redundant as well as dangerous.
DROP POLICY IF EXISTS "Service manages disclosures" ON muse_disclosures;
DROP POLICY IF EXISTS "Service manages strikes" ON muse_strikes;
DROP POLICY IF EXISTS "Service manages check-ins" ON muse_safety_checkins;
DROP POLICY IF EXISTS "Service manages shares" ON muse_safety_shares;
DROP POLICY IF EXISTS "Service manages prompts" ON muse_prompt_bank;
-- "Prompts are public read" is SELECT-only over the curated onboarding bank —
-- safe to keep, but narrow it to authenticated (anon key shouldn't need it).
DROP POLICY IF EXISTS "Prompts are public read" ON muse_prompt_bank;
DROP POLICY IF EXISTS "Prompts are public read" ON public;
CREATE POLICY "Prompts are public read" ON public.muse_prompt_bank
  FOR SELECT TO authenticated USING (true);

-- Replace the legacy PRODUCTION_MIGRATION policies on the 9 new tables with the
-- dashboard script's identical-but-`TO authenticated` versions. Keeping both is
-- harmless (they OR together), but removing the duplicate-scoped copies is cleaner.
DROP POLICY IF EXISTS "muse_blocks_owner_delete" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_owner_select" ON muse_blocks;
DROP POLICY IF EXISTS "muse_community_members_select" ON muse_community_members;
DROP POLICY IF EXISTS "muse_community_members_insert" ON muse_community_members;
DROP POLICY IF EXISTS "muse_community_members_delete" ON muse_community_members;
DROP POLICY IF EXISTS "muse_bookings_select" ON muse_bookings;
DROP POLICY IF EXISTS "muse_bookings_insert" ON muse_bookings;
DROP POLICY IF EXISTS "muse_connections_select" ON muse_connections;
DROP POLICY IF EXISTS "muse_connections_insert" ON muse_connections;
DROP POLICY IF EXISTS "muse_reports_insert" ON muse_reports;
DROP POLICY IF EXISTS "muse_reports_reporter_only" ON muse_reports;
DROP POLICY IF EXISTS "muse_push_select" ON muse_push_subscriptions;
DROP POLICY IF EXISTS "muse_push_insert" ON muse_push_subscriptions;
DROP POLICY IF EXISTS "muse_push_delete" ON muse_push_subscriptions;
DROP POLICY IF EXISTS "muse_matches_select" ON muse_matches;
DROP POLICY IF EXISTS "muse_matches_insert" ON muse_matches;
DROP POLICY IF EXISTS "muse_feed_insert" ON muse_feed_posts;
DROP POLICY IF EXISTS "muse_feed_update" ON muse_feed_posts;
DROP POLICY IF EXISTS "muse_briefs_insert" ON muse_briefs;
-- NOTE: muse_blocks_owner / _insert / _delete, muse_notifications_owner and
-- muse_matches_insert_self are NOT dropped here — the dashboard script recreates
-- those exact names earlier in section D with `TO authenticated`.

-- ────────────────────────────────────────────────────────────────────────────
-- E. VERIFY
-- ────────────────────────────────────────────────────────────────────────────

-- Tables that should exist now (9 previously missing + core):
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND tablename IN ('muse_sessions','muse_blocks','muse_connections','muse_reports',
    'muse_bookings','muse_push_subscriptions','muse_communities','muse_community_members',
    'muse_forum_replies') ORDER BY tablename;

-- RLS status (should return no rows → all protected):
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- muse_messages columns (expect match_id/sender_id/receiver_id TEXT, client_msg_id present):
SELECT table_name, column_name, data_type FROM information_schema.columns
  WHERE table_name = 'muse_messages' ORDER BY ordinal_position;

-- Realtime publication:
SELECT tablename FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND tablename IN ('muse_messages','muse_profiles');

-- Policies created:
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════════════════════
