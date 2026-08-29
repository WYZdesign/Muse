-- ═══════════════════════════════════════════════════════════════════════════
-- MUSE — CLEAN SLATE MIGRATION (drop all + recreate correctly)
-- ═══════════════════════════════════════════════════════════════════════════
-- Paste this entire file into Supabase SQL Editor → Run.
-- Drops ALL muse_* tables and recreates from canonical schema + incremental.
-- ═══════════════════════════════════════════════════════════════════════════

-- STEP 0: DROP EVERYTHING (clean slate)
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'muse_%'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', t.tablename);
  END LOOP;
END $$;

DO $$ BEGIN
  IF to_regclass('public.muse_profiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_auto_claim_founding ON public.muse_profiles;
  END IF;
END $$;
DROP FUNCTION IF EXISTS auto_claim_founding_trigger() CASCADE;
DROP FUNCTION IF EXISTS claim_founding_status(TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_rate(TEXT, INT) CASCADE;
DROP FUNCTION IF EXISTS log_muse_activity() CASCADE;
DROP FUNCTION IF EXISTS report_to_ncmec(uuid, text) CASCADE;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  STEP 1: CANONICAL SCHEMA (MUSE_SCHEMA_FULL_20260813 — all 1449 lines) ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ==============================
-- SECTION 1 of 8 — source: MUSE_APPLY_ALL.sql
-- ==============================

-- Muse App Database Schema for Supabase (PostgreSQL)
CREATE TABLE IF NOT EXISTS muse_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'Creative',
  avatar TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  loc TEXT DEFAULT '',
  styles TEXT[] DEFAULT '{}',
  looking TEXT[] DEFAULT '{}',
  zodiac TEXT DEFAULT '',
  chinese TEXT DEFAULT '',
  mbti TEXT DEFAULT '',
  life_path INT DEFAULT 0,
  socials JSONB DEFAULT '{}',
  favorite_songs JSONB DEFAULT '[]',
  portfolio JSONB DEFAULT '[]',
  show_nsfw BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muse_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_id)
);

CREATE TABLE IF NOT EXISTS muse_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  img TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  client_msg_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muse_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  text TEXT DEFAULT '',
  img TEXT DEFAULT '',
  type TEXT DEFAULT 'text',
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  liked_by UUID[] DEFAULT '{}',
  reactions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muse_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES muse_feed_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muse_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  category TEXT DEFAULT 'vision',
  tags TEXT[] DEFAULT '{}',
  urgent BOOLEAN DEFAULT false,
  nsfw BOOLEAN DEFAULT false,
  paid BOOLEAN DEFAULT false,
  rate TEXT DEFAULT '',
  applicants INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muse_brief_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES muse_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brief_id, user_id)
);

CREATE TABLE IF NOT EXISTS muse_forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  votes INT DEFAULT 0,
  category TEXT DEFAULT 'General',
  pinned BOOLEAN DEFAULT false,
  voters UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muse_forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES muse_forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT DEFAULT '',
  location TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  img TEXT DEFAULT '',
  attendees INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muse_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES muse_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS muse_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_matches_user ON muse_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_messages_match ON muse_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_muse_feed_posts_author ON muse_feed_posts(author_id);
CREATE INDEX IF NOT EXISTS muse_feed_posts_created_at ON muse_feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_muse_briefs_author ON muse_briefs(author_id);
CREATE INDEX IF NOT EXISTS idx_muse_forum_posts_created ON muse_forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_muse_activity_user ON muse_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_activity_action ON muse_activity_log(created_at DESC);

ALTER TABLE muse_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_brief_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are public" ON muse_profiles;
CREATE POLICY "Profiles are public" ON muse_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON muse_profiles;
CREATE POLICY "Users can update own profile" ON muse_profiles FOR UPDATE USING (auth.uid() = auth_id);
DROP POLICY IF EXISTS "Users can see their matches" ON muse_matches;
CREATE POLICY "Users can see their matches" ON muse_matches FOR SELECT USING (auth.uid() IN (SELECT auth_id FROM muse_profiles WHERE id IN (user_id, target_id)));
DROP POLICY IF EXISTS "Users can create matches" ON muse_matches;
CREATE POLICY "Users can create matches" ON muse_matches FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION log_muse_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO muse_activity_log (user_id, action, details)
  VALUES (
    (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()),
    TG_TABLE_NAME || '_' || TG_OP,
    row_to_json(NEW)::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('muse-uploads', 'muse-uploads', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage;
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'muse-uploads');
DROP POLICY IF EXISTS "Public read access" ON storage;
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'muse-uploads');
DROP POLICY IF EXISTS "Users can update own uploads" ON storage;
CREATE POLICY "Users can update own uploads" ON storage.objects
  FOR UPDATE USING (bucket_id = 'muse-uploads');
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage;
CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'muse-uploads');

-- Reports & Blocks
CREATE TABLE IF NOT EXISTS muse_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT DEFAULT 'user',
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  ai_classification TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS muse_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_muse_reports_target ON muse_reports(target_id);
CREATE INDEX IF NOT EXISTS idx_muse_blocks_user ON muse_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_blocks_target ON muse_blocks(target_id);

ALTER TABLE muse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert reports" ON muse_reports;
CREATE POLICY "Users can insert reports" ON muse_reports FOR INSERT WITH CHECK (
  reporter_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can view own reports" ON muse_reports;
CREATE POLICY "Users can view own reports" ON muse_reports FOR SELECT USING (
  reporter_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert blocks" ON muse_blocks;
CREATE POLICY "Users can insert blocks" ON muse_blocks FOR INSERT WITH CHECK (
  user_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can view own blocks" ON muse_blocks;
CREATE POLICY "Users can view own blocks" ON muse_blocks FOR SELECT USING (
  user_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can delete own blocks" ON muse_blocks;
CREATE POLICY "Users can delete own blocks" ON muse_blocks FOR DELETE USING (true);

-- Profiles: extra columns
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS long DOUBLE PRECISION;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';

-- Forum Replies
CREATE TABLE IF NOT EXISTS muse_forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES muse_forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  user_name TEXT DEFAULT '',
  user_avatar TEXT DEFAULT '',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Communities
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

-- Sessions
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

-- Bookings
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

-- Connections
CREATE TABLE IF NOT EXISTS muse_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS muse_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  from_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'system',
  body TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS muse_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
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
CREATE INDEX IF NOT EXISTS idx_muse_notifications_user ON muse_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_muse_profiles_location ON muse_profiles(lat, long);
CREATE INDEX IF NOT EXISTS idx_muse_push_user ON muse_push_subscriptions(user_id);

-- RLS
ALTER TABLE muse_forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Forum replies are public" ON muse_forum_replies;
CREATE POLICY "Forum replies are public" ON muse_forum_replies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can post replies" ON muse_forum_replies;
CREATE POLICY "Users can post replies" ON muse_forum_replies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Communities are public" ON muse_communities;
CREATE POLICY "Communities are public" ON muse_communities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service can manage communities" ON muse_communities;
CREATE POLICY "Service can manage communities" ON muse_communities FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Community members are public" ON muse_community_members;
CREATE POLICY "Community members are public" ON muse_community_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can join communities" ON muse_community_members;
CREATE POLICY "Users can join communities" ON muse_community_members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can leave communities" ON muse_community_members;
CREATE POLICY "Users can leave communities" ON muse_community_members FOR DELETE USING (true);
DROP POLICY IF EXISTS "Sessions are public" ON muse_sessions;
CREATE POLICY "Sessions are public" ON muse_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service can manage sessions" ON muse_sessions;
CREATE POLICY "Service can manage sessions" ON muse_sessions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view own bookings" ON muse_bookings;
CREATE POLICY "Users can view own bookings" ON muse_bookings FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR host_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can create bookings" ON muse_bookings;
CREATE POLICY "Users can create bookings" ON muse_bookings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service can manage bookings" ON muse_bookings;
CREATE POLICY "Service can manage bookings" ON muse_bookings FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view own connections" ON muse_connections;
CREATE POLICY "Users can view own connections" ON muse_connections FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR target_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can create connections" ON muse_connections;
CREATE POLICY "Users can create connections" ON muse_connections FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can delete own connections" ON muse_connections;
CREATE POLICY "Users can delete own connections" ON muse_connections FOR DELETE USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can view own notifications" ON muse_notifications;
CREATE POLICY "Users can view own notifications" ON muse_notifications FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Service can manage notifications" ON muse_notifications;
CREATE POLICY "Service can manage notifications" ON muse_notifications FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view own push subs" ON muse_push_subscriptions;
CREATE POLICY "Users can view own push subs" ON muse_push_subscriptions FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can save push subs" ON muse_push_subscriptions;
CREATE POLICY "Users can save push subs" ON muse_push_subscriptions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can delete own push subs" ON muse_push_subscriptions;
CREATE POLICY "Users can delete own push subs" ON muse_push_subscriptions FOR DELETE USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- Seed communities
INSERT INTO muse_communities (name, description, img, category, is_nsfw, member_count) VALUES
  ('Golden Hour Shooters', 'Photographers who live for that magic light', '', 'photography', false, 1240),
  ('Writers & Poets', 'Wordsmiths crafting the next great story', '', 'writing', false, 890),
  ('Music Makers', 'Producers, singers, and instrumentalists', '', 'music', false, 2100),
  ('Filmmakers United', 'Directors, DP''s, and editors collaborating', '', 'film', false, 1560),
  ('Design Thinkers', 'Graphic, UX, and product designers', '', 'design', false, 1340),
  ('The Canvas', 'Painters, illustrators, and visual artists', '', 'art', false, 770),
  ('Adults Only (18+)', 'Mature creative content and collaborations', '', 'nsfw', true, 320)
ON CONFLICT DO NOTHING;

-- Error Logs
CREATE TABLE IF NOT EXISTS muse_error_logs (
  id uuid primary key default gen_random_uuid(),
  message text,
  context text,
  created_at timestamptz default now()
);

ALTER TABLE muse_error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_error_logs_service_only" ON muse_error_logs;
DROP POLICY IF EXISTS "muse_error_logs_service_only" ON muse_error_logs;
CREATE POLICY "muse_error_logs_service_only" ON muse_error_logs
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- Migrate messages to TEXT columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='muse_messages' AND column_name='match_id' AND data_type='uuid') THEN
    ALTER TABLE muse_messages ALTER COLUMN match_id TYPE TEXT USING match_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='muse_messages' AND column_name='sender_id' AND data_type='uuid') THEN
    ALTER TABLE muse_messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='muse_messages' AND column_name='receiver_id') THEN
    ALTER TABLE muse_messages ADD COLUMN receiver_id TEXT NOT NULL DEFAULT '';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'muse_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE muse_messages;
  END IF;
END $$;

ALTER TABLE muse_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_messages_participants" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_participants" ON muse_messages;
CREATE POLICY "muse_messages_participants" ON muse_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "muse_messages_insert" ON muse_messages;
CREATE POLICY "muse_messages_insert" ON muse_messages FOR INSERT WITH CHECK (true);

-- Events Log
CREATE TABLE IF NOT EXISTS muse_events_log (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  props jsonb default '{}'::jsonb,
  ua text default '',
  ip text default '',
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_events_log_name ON muse_events_log(name);
CREATE INDEX IF NOT EXISTS idx_muse_events_log_created ON muse_events_log(created_at DESC);
ALTER TABLE muse_events_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_events_log_service_only" ON muse_events_log;
DROP POLICY IF EXISTS "muse_events_log_service_only" ON muse_events_log;
CREATE POLICY "muse_events_log_service_only" ON muse_events_log
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- ==============================
-- SECTION 2 of 8 — ALBUMS
-- ==============================

CREATE TABLE IF NOT EXISTS muse_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Album',
  description TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public','private','invite')),
  tags TEXT[] DEFAULT '{}',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_albums_profile ON muse_albums(profile_id);
CREATE INDEX IF NOT EXISTS idx_muse_albums_access ON muse_albums(access_level);

CREATE TABLE IF NOT EXISTS muse_album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES muse_albums(id) ON DELETE CASCADE,
  img_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_album_photos_album ON muse_album_photos(album_id);

CREATE TABLE IF NOT EXISTS muse_album_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES muse_albums(id) ON DELETE CASCADE,
  viewer_profile_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(album_id, viewer_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_muse_album_access_album ON muse_album_access(album_id);
CREATE INDEX IF NOT EXISTS idx_muse_album_access_viewer ON muse_album_access(viewer_profile_id);

ALTER TABLE muse_albums ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE muse_albums ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;

ALTER TABLE muse_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_album_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muse_albums_select" ON muse_albums;
DROP POLICY IF EXISTS "muse_albums_select" ON muse_albums;
CREATE POLICY "muse_albums_select" ON muse_albums FOR SELECT USING (
  access_level = 'public'
  OR profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR (access_level = 'invite' AND EXISTS (
    SELECT 1 FROM muse_album_access WHERE muse_album_access.album_id = muse_albums.id
      AND muse_album_access.viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  ))
);
DROP POLICY IF EXISTS "muse_albums_insert" ON muse_albums;
DROP POLICY IF EXISTS "muse_albums_insert" ON muse_albums;
CREATE POLICY "muse_albums_insert" ON muse_albums FOR INSERT WITH CHECK (
  profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "muse_albums_update" ON muse_albums;
DROP POLICY IF EXISTS "muse_albums_update" ON muse_albums;
CREATE POLICY "muse_albums_update" ON muse_albums FOR UPDATE USING (
  profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "muse_albums_delete" ON muse_albums;
DROP POLICY IF EXISTS "muse_albums_delete" ON muse_albums;
CREATE POLICY "muse_albums_delete" ON muse_albums FOR DELETE USING (
  profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

DROP POLICY IF EXISTS "muse_album_photos_select" ON muse_album_photos;
DROP POLICY IF EXISTS "muse_album_photos_select" ON muse_album_photos;
CREATE POLICY "muse_album_photos_select" ON muse_album_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM muse_albums WHERE muse_albums.id = muse_album_photos.album_id
    AND (muse_albums.access_level = 'public'
      OR muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
      OR (muse_albums.access_level = 'invite' AND EXISTS (
        SELECT 1 FROM muse_album_access WHERE muse_album_access.album_id = muse_albums.id
          AND muse_album_access.viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
      ))
    ))
);
DROP POLICY IF EXISTS "muse_album_photos_write" ON muse_album_photos;
DROP POLICY IF EXISTS "muse_album_photos_write" ON muse_album_photos;
CREATE POLICY "muse_album_photos_write" ON muse_album_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM muse_albums WHERE muse_albums.id = muse_album_photos.album_id
    AND muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()))
);

DROP POLICY IF EXISTS "muse_album_access_select" ON muse_album_access;
DROP POLICY IF EXISTS "muse_album_access_select" ON muse_album_access;
CREATE POLICY "muse_album_access_select" ON muse_album_access FOR SELECT USING (
  viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR EXISTS (SELECT 1 FROM muse_albums WHERE muse_albums.id = muse_album_access.album_id
    AND muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()))
);
DROP POLICY IF EXISTS "muse_album_access_write" ON muse_album_access;
DROP POLICY IF EXISTS "muse_album_access_write" ON muse_album_access;
CREATE POLICY "muse_album_access_write" ON muse_album_access FOR ALL USING (
  EXISTS (SELECT 1 FROM muse_albums WHERE muse_albums.id = muse_album_access.album_id
    AND muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()))
);

-- ==============================
-- SECTION 3 of 8 — REFERRALS + STRIPE CONNECT
-- ==============================

CREATE TABLE IF NOT EXISTS muse_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  referral_code VARCHAR(12) NOT NULL UNIQUE,
  referee_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  referred_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'subscribed', 'reward_issued')),
  reward_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muse_referrals_code ON muse_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_muse_referrals_referrer ON muse_referrals(referrer_id);

CREATE TABLE IF NOT EXISTS muse_referral_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES muse_referrals(id) ON DELETE CASCADE,
  reward_type VARCHAR(30) NOT NULL CHECK (reward_type IN ('free_month', 'credit')),
  recipient_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER DEFAULT 0,
  stripe_subscription_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS muse_stripe_connect (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id VARCHAR(100) NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS muse_booking_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  stripe_payment_intent VARCHAR(100),
  stripe_transfer_id VARCHAR(100),
  amount_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  net_amount_cents INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES muse_profiles(id) ON DELETE SET NULL;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS stripe_connect_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_muse_profiles_referral_code ON muse_profiles(referral_code);

ALTER TABLE muse_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_stripe_connect ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_booking_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own referrals" ON muse_referrals;
CREATE POLICY "Users see own referrals" ON muse_referrals
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = referrer_id));
DROP POLICY IF EXISTS "Users see own rewards" ON muse_referral_rewards;
CREATE POLICY "Users see own rewards" ON muse_referral_rewards
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = recipient_id));
DROP POLICY IF EXISTS "Users see own connect" ON muse_stripe_connect;
CREATE POLICY "Users see own connect" ON muse_stripe_connect
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));
DROP POLICY IF EXISTS "Payers and payees see payments" ON muse_booking_payments;
CREATE POLICY "Payers and payees see payments" ON muse_booking_payments
  FOR SELECT USING (
    auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = payer_id)
    OR auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = payee_id)
  );

-- ==============================
-- SECTION 4 of 8 — CONTENT SCANS + SAFETY INCIDENTS
-- ==============================

CREATE TABLE IF NOT EXISTS muse_content_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  booking_id uuid references muse_bookings(id) on delete set null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  context text not null,
  safe boolean not null,
  flagged_categories text[] default '{}',
  confidence numeric(5,2) default 0,
  should_block boolean default false,
  should_report boolean default false,
  details jsonb default '[]',
  scanned_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_muse_content_scans_user ON muse_content_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_content_scans_booking ON muse_content_scans(booking_id);
CREATE INDEX IF NOT EXISTS idx_muse_content_scans_safe ON muse_content_scans(safe);
CREATE INDEX IF NOT EXISTS idx_muse_content_scans_scanned ON muse_content_scans(scanned_at DESC);

CREATE TABLE IF NOT EXISTS muse_safety_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  type text not null,
  severity text not null default 'medium',
  details jsonb default '{}',
  status text not null default 'pending_review',
  reviewer_id uuid references muse_profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text,
  ncmec_report_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_user ON muse_safety_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_status ON muse_safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_type ON muse_safety_incidents(type);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_severity ON muse_safety_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_created ON muse_safety_incidents(created_at DESC);

ALTER TABLE muse_content_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_content_scans_owner" ON muse_content_scans;
DROP POLICY IF EXISTS "muse_content_scans_owner" ON muse_content_scans;
CREATE POLICY "muse_content_scans_owner" ON muse_content_scans
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));

ALTER TABLE muse_safety_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_safety_incidents_owner" ON muse_safety_incidents;
DROP POLICY IF EXISTS "muse_safety_incidents_owner" ON muse_safety_incidents;
CREATE POLICY "muse_safety_incidents_owner" ON muse_safety_incidents
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));

CREATE OR REPLACE FUNCTION report_to_ncmec(p_incident_id uuid, p_report_id text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE muse_safety_incidents
  SET ncmec_report_id = p_report_id, status = 'escalated_to_authorities', updated_at = now()
  WHERE id = p_incident_id;
END;
$$;

-- ==============================
-- SECTION 5 of 8 — TRUST & SAFETY
-- ==============================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS muse_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  proposer_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  compensation_amount TEXT NOT NULL DEFAULT '',
  compensation_timing TEXT NOT NULL DEFAULT '',
  compensation_method TEXT NOT NULL DEFAULT '',
  content_type_nudity BOOLEAN NOT NULL DEFAULT false,
  content_type_artistic_nude BOOLEAN NOT NULL DEFAULT false,
  content_type_boudoir BOOLEAN NOT NULL DEFAULT false,
  content_type_portrait BOOLEAN NOT NULL DEFAULT false,
  content_type_fashion BOOLEAN NOT NULL DEFAULT false,
  content_type_editorial BOOLEAN NOT NULL DEFAULT false,
  content_type_commercial BOOLEAN NOT NULL DEFAULT false,
  content_type_conceptual BOOLEAN NOT NULL DEFAULT false,
  content_type_other BOOLEAN NOT NULL DEFAULT false,
  content_type_other_desc TEXT NOT NULL DEFAULT '',
  boundary_full_nudity BOOLEAN NOT NULL DEFAULT false,
  boundary_implied_nudity BOOLEAN NOT NULL DEFAULT false,
  boundary_partials BOOLEAN NOT NULL DEFAULT false,
  boundary_no_partials BOOLEAN NOT NULL DEFAULT false,
  boundary_explicit_acts BOOLEAN NOT NULL DEFAULT false,
  boundary_penetration BOOLEAN NOT NULL DEFAULT false,
  boundary_no_penetration BOOLEAN NOT NULL DEFAULT false,
  boundary_touching_self BOOLEAN NOT NULL DEFAULT false,
  boundary_touching_other BOOLEAN NOT NULL DEFAULT false,
  boundary_no_touching BOOLEAN NOT NULL DEFAULT false,
  location_type TEXT NOT NULL DEFAULT '',
  location_address TEXT NOT NULL DEFAULT '',
  location_public BOOLEAN DEFAULT true,
  others_present BOOLEAN NOT NULL DEFAULT false,
  others_count INT NOT NULL DEFAULT 0,
  others_desc TEXT NOT NULL DEFAULT '',
  usage_rights TEXT NOT NULL DEFAULT '',
  usage_custom_desc TEXT NOT NULL DEFAULT '',
  edit_approval_required BOOLEAN NOT NULL DEFAULT false,
  nda_required BOOLEAN NOT NULL DEFAULT false,
  model_release_required BOOLEAN NOT NULL DEFAULT false,
  ai_flagged BOOLEAN NOT NULL DEFAULT false,
  ai_flag_reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending_proposer',
  blocked_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  proposer_confirmed_at TIMESTAMPTZ,
  responder_confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_muse_disclosures_proposer ON muse_disclosures(proposer_id);
CREATE INDEX IF NOT EXISTS idx_muse_disclosures_responder ON muse_disclosures(responder_id);
CREATE INDEX IF NOT EXISTS idx_muse_disclosures_booking ON muse_disclosures(booking_id);
CREATE INDEX IF NOT EXISTS idx_muse_disclosures_status ON muse_disclosures(status);

ALTER TABLE muse_disclosures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Disclosure parties can read" ON muse_disclosures;
CREATE POLICY "Disclosure parties can read" ON muse_disclosures FOR SELECT USING (
  proposer_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR responder_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Service manages disclosures" ON muse_disclosures;
CREATE POLICY "Service manages disclosures" ON muse_disclosures FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS muse_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'standard',
  severity TEXT NOT NULL DEFAULT 'warning',
  suspension_ends_at TIMESTAMPTZ,
  appeal_status TEXT DEFAULT 'none',
  appeal_text TEXT NOT NULL DEFAULT '',
  appeal_resolved_at TIMESTAMPTZ,
  appeal_resolved_by UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_strikes_user ON muse_strikes(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_strikes_category ON muse_strikes(category);
CREATE INDEX IF NOT EXISTS idx_muse_strikes_severity ON muse_strikes(severity);

ALTER TABLE muse_strikes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own strikes" ON muse_strikes;
CREATE POLICY "Users can view own strikes" ON muse_strikes FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Service manages strikes" ON muse_strikes;
CREATE POLICY "Service manages strikes" ON muse_strikes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS muse_safety_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  emergency_contact_name TEXT NOT NULL DEFAULT '',
  emergency_contact_phone TEXT NOT NULL DEFAULT '',
  emergency_contact_relation TEXT NOT NULL DEFAULT '',
  trusted_friend_name TEXT NOT NULL DEFAULT '',
  trusted_friend_phone TEXT NOT NULL DEFAULT '',
  trusted_friend_email TEXT NOT NULL DEFAULT '',
  auto_share_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE muse_safety_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own safety profile" ON muse_safety_profiles;
CREATE POLICY "Users manage own safety profile" ON muse_safety_profiles FOR ALL USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS muse_safety_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  disclosure_id UUID REFERENCES muse_disclosures(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  checkin_type TEXT NOT NULL DEFAULT 'pre_shoot',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT NOT NULL DEFAULT '',
  shared_with_contact BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_muse_checkins_user ON muse_safety_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_checkins_booking ON muse_safety_checkins(booking_id);
CREATE INDEX IF NOT EXISTS idx_muse_checkins_status ON muse_safety_checkins(status);

ALTER TABLE muse_safety_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own check-ins" ON muse_safety_checkins;
CREATE POLICY "Users view own check-ins" ON muse_safety_checkins FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Service manages check-ins" ON muse_safety_checkins;
CREATE POLICY "Service manages check-ins" ON muse_safety_checkins FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS muse_safety_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  disclosure_id UUID REFERENCES muse_disclosures(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  recipient_phone TEXT NOT NULL DEFAULT '',
  recipient_email TEXT NOT NULL DEFAULT '',
  share_method TEXT NOT NULL DEFAULT 'sms',
  shared_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE muse_safety_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own shares" ON muse_safety_shares;
CREATE POLICY "Users view own shares" ON muse_safety_shares FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Service manages shares" ON muse_safety_shares;
CREATE POLICY "Service manages shares" ON muse_safety_shares FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS muse_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  query_result_summary TEXT NOT NULL DEFAULT '',
  result_row_count INT DEFAULT 0,
  tables_accessed TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_admin_audit_admin ON muse_admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_muse_admin_audit_created ON muse_admin_audit_log(created_at DESC);

ALTER TABLE muse_admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin audit is service-only" ON muse_admin_audit_log;
CREATE POLICY "Admin audit is service-only" ON muse_admin_audit_log
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS muse_prompt_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL DEFAULT '',
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'text',
  choices JSONB DEFAULT '[]',
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_prompts_category ON muse_prompt_bank(category, display_order);

ALTER TABLE muse_prompt_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Prompts are public read" ON muse_prompt_bank;
CREATE POLICY "Prompts are public read" ON muse_prompt_bank FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service manages prompts" ON muse_prompt_bank;
CREATE POLICY "Service manages prompts" ON muse_prompt_bank FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS muse_prompt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES muse_prompt_bank(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL DEFAULT '',
  response_choices JSONB DEFAULT '[]',
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_muse_prompt_resp_user ON muse_prompt_responses(user_id);

ALTER TABLE muse_prompt_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own responses" ON muse_prompt_responses;
CREATE POLICY "Users manage own responses" ON muse_prompt_responses FOR ALL USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS muse_profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  embedding_type TEXT NOT NULL DEFAULT 'profile',
  text_source TEXT NOT NULL DEFAULT '',
  embedding VECTOR(768) NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'nomic-embed-text',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, embedding_type)
);

CREATE INDEX IF NOT EXISTS idx_muse_embeddings_user ON muse_profile_embeddings(user_id);

ALTER TABLE muse_profile_embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Embeddings are service-only" ON muse_profile_embeddings;
CREATE POLICY "Embeddings are service-only" ON muse_profile_embeddings
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- Booking enhancements
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT '';
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS reschedule_date TEXT DEFAULT '';
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Profile completion
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS profile_completion_pct INT DEFAULT 0;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS prompt_completed_at TIMESTAMPTZ;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS emergency_contact_added BOOLEAN DEFAULT false;

-- ==============================
-- SECTION 6 of 8 — LANDING PAGE
-- ==============================

CREATE TABLE IF NOT EXISTS muse_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text,
  source text default 'default',
  referred_by uuid references muse_profiles(id) on delete set null,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_waitlist_email ON muse_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_muse_waitlist_source ON muse_waitlist(source);
CREATE INDEX IF NOT EXISTS idx_muse_waitlist_created ON muse_waitlist(created_at DESC);

CREATE TABLE IF NOT EXISTS muse_landing_analytics (
  date date primary key,
  signups int default 0,
  qr_scans int default 0,
  qr_shares int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS muse_qr_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_type text not null,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_source ON muse_qr_events(source);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_type ON muse_qr_events(event_type);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_created ON muse_qr_events(created_at DESC);

ALTER TABLE muse_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_waitlist_owner" ON muse_waitlist;
DROP POLICY IF EXISTS "muse_waitlist_owner" ON muse_waitlist;
CREATE POLICY "muse_waitlist_owner" ON muse_waitlist
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

ALTER TABLE muse_landing_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_landing_analytics_service" ON muse_landing_analytics;
DROP POLICY IF EXISTS "muse_landing_analytics_service" ON muse_landing_analytics;
CREATE POLICY "muse_landing_analytics_service" ON muse_landing_analytics
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

ALTER TABLE muse_qr_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_qr_events_service" ON muse_qr_events;
DROP POLICY IF EXISTS "muse_qr_events_service" ON muse_qr_events;
CREATE POLICY "muse_qr_events_service" ON muse_qr_events
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- ==============================
-- SECTION 7 of 8 — NCMEC
-- ==============================

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS muse_ncmec_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  file_name TEXT,
  context TEXT,
  flagged_categories JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC DEFAULT 0,
  report_type TEXT DEFAULT 'child_sexual_abuse_material',
  incident_details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending_submission',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE muse_content_scans ADD COLUMN IF NOT EXISTS is_csam BOOLEAN DEFAULT FALSE;
ALTER TABLE muse_content_scans ADD COLUMN IF NOT EXISTS scanned BOOLEAN DEFAULT TRUE;

ALTER TABLE muse_ncmec_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ncmec_service_only" ON muse_ncmec_reports;
DROP POLICY IF EXISTS "ncmec_service_only" ON muse_ncmec_reports;
CREATE POLICY "ncmec_service_only" ON muse_ncmec_reports FOR ALL USING (false);

-- ==============================
-- SECTION 8 of 8 — VERIFICATION SESSIONS
-- ==============================

CREATE TABLE IF NOT EXISTS muse_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  stripe_session_id text not null,
  status text not null default 'pending',
  purpose text default 'general',
  verified_outputs jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);
CREATE INDEX IF NOT EXISTS idx_muse_verification_sessions_user ON muse_verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_verification_sessions_stripe ON muse_verification_sessions(stripe_session_id);

ALTER TABLE muse_verification_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_verification_sessions_owner" ON muse_verification_sessions;
DROP POLICY IF EXISTS "muse_verification_sessions_owner" ON muse_verification_sessions;
CREATE POLICY "muse_verification_sessions_owner" ON muse_verification_sessions
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified boolean default false;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified_at timestamptz;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  STEP 2: INCREMENTAL MIGRATIONS (Aug 16-24, not in canonical schema)  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Profile views (MUSE_PROFILE_VIEWS_20260823)
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

-- Audience field (MUSE_AUDIENCE_20260823)
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'creative';

-- Stats persistence (MUSE_STATS_PERSIST_20260822)
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"likes":0,"superLikes":0,"passes":0,"bookingsCompleted":0,"matchesReceived":0,"messagesSent":0}'::jsonb;

-- Real presence heartbeat (MUSE_LAST_SEEN_20260822)
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

-- Founding tier (MUSE_FOUNDING_MEMBERS_20260805)
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS founding_tier TEXT DEFAULT NULL;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Moments / BTS stories (MUSE_MOMENTS_20260818)
CREATE TABLE IF NOT EXISTS muse_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  text TEXT DEFAULT '',
  img TEXT DEFAULT '',
  type TEXT DEFAULT 'photo',
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_muse_moments_created ON muse_moments(created_at DESC);
ALTER TABLE muse_moments ENABLE ROW LEVEL SECURITY;

-- RSVPs (MUSE_RSVP_20260819) — app uses muse_rsvps, not muse_event_rsvps
CREATE TABLE IF NOT EXISTS muse_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES muse_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE muse_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own RSVPs" ON muse_rsvps;
CREATE POLICY "Users read own RSVPs" ON muse_rsvps FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own RSVPs" ON muse_rsvps;
CREATE POLICY "Users insert own RSVPs" ON muse_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own RSVPs" ON muse_rsvps;
CREATE POLICY "Users delete own RSVPs" ON muse_rsvps FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_muse_rsvps_event ON muse_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_muse_rsvps_user ON muse_rsvps(user_id);

-- Reviews (MUSE_BOOKING_LOOP_20260818)
CREATE TABLE IF NOT EXISTS muse_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES muse_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_muse_reviews_reviewee ON muse_reviews(reviewee_id);
ALTER TABLE muse_reviews ENABLE ROW LEVEL SECURITY;

-- Booking completed timestamp
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Album Likes (MUSE_ALBUM_LIKES_20260816)
CREATE TABLE IF NOT EXISTS muse_album_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES muse_albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (album_id, user_id)
);

-- Professionals (MUSE_PROFESSIONALS_20260824)
CREATE TABLE IF NOT EXISTS muse_professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  img TEXT,
  loc TEXT,
  exp TEXT,
  openings INTEGER DEFAULT 0,
  rate TEXT,
  skills TEXT[] DEFAULT '{}',
  looking TEXT[] DEFAULT '{}',
  nsfw BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE muse_professionals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "professionals_select" ON muse_professionals;
CREATE POLICY "professionals_select" ON muse_professionals FOR SELECT USING (true);
DROP POLICY IF EXISTS "professionals_upsert" ON muse_professionals;
CREATE POLICY "professionals_upsert" ON muse_professionals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "professionals_update" ON muse_professionals;
CREATE POLICY "professionals_update" ON muse_professionals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "professionals_delete" ON muse_professionals;
CREATE POLICY "professionals_delete" ON muse_professionals FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_muse_professionals_type ON muse_professionals(type);

-- Rate Limits (MUSE_RATE_LIMIT_20260819)
CREATE TABLE IF NOT EXISTS muse_rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_muse_rate_limits_window ON muse_rate_limits(window_start);

CREATE OR REPLACE FUNCTION check_rate(p_key TEXT, p_limit INT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO muse_rate_limits (key, count, window_start) VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN muse_rate_limits.window_start < now() - interval '1 minute' THEN 1 ELSE muse_rate_limits.count + 1 END,
    window_start = CASE WHEN muse_rate_limits.window_start < now() - interval '1 minute' THEN now() ELSE muse_rate_limits.window_start END
  RETURNING count INTO v_count;
  RETURN v_count <= p_limit;
END; $$;
GRANT EXECUTE ON FUNCTION check_rate(TEXT, INT) TO service_role;
REVOKE EXECUTE ON FUNCTION check_rate(TEXT, INT) FROM anon, authenticated;

-- Founding members trigger
CREATE OR REPLACE FUNCTION claim_founding_status(target_email TEXT)
RETURNS TABLE(founding_tier TEXT, pro_expires_at TIMESTAMPTZ) AS $$
DECLARE wl_position INT;
BEGIN
  SELECT wl.pos INTO wl_position FROM (
    SELECT email, row_number() OVER (ORDER BY created_at ASC) AS pos FROM muse_waitlist
  ) wl WHERE lower(wl.email) = lower(target_email) LIMIT 1;
  IF wl_position IS NULL OR wl_position > 1000 THEN RETURN; END IF;
  IF wl_position <= 150 THEN RETURN QUERY SELECT 'founding'::TEXT, NULL::TIMESTAMPTZ;
  ELSE RETURN QUERY SELECT 'early'::TEXT, (now() + interval '6 months')::TIMESTAMPTZ; END IF;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION claim_founding_status(TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION auto_claim_founding_trigger()
RETURNS TRIGGER AS $$ DECLARE claimed RECORD;
BEGIN
  IF NEW.founding_tier IS NULL THEN
    SELECT ft.founding_tier, ft.pro_expires_at INTO claimed FROM claim_founding_status(NEW.email) ft;
    IF claimed.founding_tier IS NOT NULL THEN
      NEW.founding_tier := claimed.founding_tier; NEW.pro_expires_at := claimed.pro_expires_at; NEW.tier := 'muse_pro';
    END IF;
  END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_claim_founding ON muse_profiles;
CREATE TRIGGER trg_auto_claim_founding BEFORE INSERT ON muse_profiles
  FOR EACH ROW EXECUTE FUNCTION auto_claim_founding_trigger();

-- Booking payment unique constraint (idempotent via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'muse_booking_payments_booking_id_key') THEN
    ALTER TABLE muse_booking_payments ADD CONSTRAINT muse_booking_payments_booking_id_key UNIQUE (booking_id);
  END IF;
END $$;

-- AI docs / RAG knowledge base (MUSE_OPENROUTER_AI_20260813)
CREATE TABLE IF NOT EXISTS muse_ai_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(title)
);
CREATE INDEX IF NOT EXISTS idx_muse_ai_docs_section ON muse_ai_docs(section);
ALTER TABLE muse_ai_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "AI docs are service-only" ON muse_ai_docs;
DROP POLICY IF EXISTS "AI docs are service-only" ON muse_ai_docs;
CREATE POLICY "AI docs are service-only" ON muse_ai_docs
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- Safety checkins unique constraint (idempotent via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'muse_safety_checkins_user_booking_key') THEN
    ALTER TABLE muse_safety_checkins ADD CONSTRAINT muse_safety_checkins_user_booking_key UNIQUE (user_id, booking_id);
  END IF;
END $$;

-- RLS hardening (enable on ALL muse_* tables)
DO $$ DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'muse_%' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.zz_test_a;
DROP TABLE IF EXISTS public.zz_test_b;

-- Final RLS policies (override canonical with hardened versions)
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON muse_profiles;
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON public;
CREATE POLICY "Public profiles viewable by authenticated users" ON public.muse_profiles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users update own profile" ON muse_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public;
CREATE POLICY "Users update own profile" ON public.muse_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Users see own matches" ON muse_matches;
DROP POLICY IF EXISTS "Users see own matches" ON public;
CREATE POLICY "Users see own matches" ON public.muse_matches FOR SELECT TO authenticated
  USING (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = user_id));
DROP POLICY IF EXISTS "muse_matches_insert_self" ON muse_matches;
DROP POLICY IF EXISTS "Users can create matches" ON muse_matches;
DROP POLICY IF EXISTS "muse_matches_insert_self" ON public;
CREATE POLICY "muse_matches_insert_self" ON public.muse_matches FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "muse_messages_select" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_insert" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_select" ON public;
CREATE POLICY "muse_messages_select" ON public.muse_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "muse_messages_insert" ON public;
CREATE POLICY "muse_messages_insert" ON public.muse_messages FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Feed posts viewable by all" ON muse_feed_posts;
DROP POLICY IF EXISTS "Feed posts viewable by all" ON public;
CREATE POLICY "Feed posts viewable by all" ON public.muse_feed_posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users edit own feed posts" ON muse_feed_posts;
DROP POLICY IF EXISTS "Users edit own feed posts" ON public;
CREATE POLICY "Users edit own feed posts" ON public.muse_feed_posts FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));
DROP POLICY IF EXISTS "Users create own feed posts" ON muse_feed_posts;
DROP POLICY IF EXISTS "Users create own feed posts" ON public;
CREATE POLICY "Users create own feed posts" ON public.muse_feed_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));

DROP POLICY IF EXISTS "Briefs viewable by all" ON muse_briefs;
DROP POLICY IF EXISTS "Briefs viewable by all" ON public;
CREATE POLICY "Briefs viewable by all" ON public.muse_briefs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users create own briefs" ON muse_briefs;
DROP POLICY IF EXISTS "Users create own briefs" ON public;
CREATE POLICY "Users create own briefs" ON public.muse_briefs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.muse_profiles WHERE id = author_id));

DROP POLICY IF EXISTS "muse_notifications_owner" ON muse_notifications;
DROP POLICY IF EXISTS "muse_notifications_owner" ON public;
CREATE POLICY "muse_notifications_owner" ON public.muse_notifications FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.muse_profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "muse_reports_owner" ON muse_reports;
DROP POLICY IF EXISTS "muse_reports_owner" ON public;
CREATE POLICY "muse_reports_owner" ON public.muse_reports FOR SELECT TO authenticated
  USING (reporter_id = (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "muse_blocks_owner" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_insert" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_delete" ON muse_blocks;
DROP POLICY IF EXISTS "muse_blocks_owner" ON public;
CREATE POLICY "muse_blocks_owner" ON public.muse_blocks FOR SELECT TO authenticated
  USING (user_id = (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "muse_blocks_insert" ON public;
CREATE POLICY "muse_blocks_insert" ON public.muse_blocks FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id::text FROM public.muse_profiles WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "muse_blocks_delete" ON public;
CREATE POLICY "muse_blocks_delete" ON public.muse_blocks FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Service can manage communities" ON muse_communities;
DROP POLICY IF EXISTS "Service can manage sessions" ON muse_sessions;
DROP POLICY IF EXISTS "Service can manage bookings" ON muse_bookings;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  DONE — verify with:                                                    ║
-- ║  SELECT tablename FROM pg_tables WHERE schemaname='public'              ║
-- ║    AND tablename LIKE 'muse_%' ORDER BY tablename;                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
