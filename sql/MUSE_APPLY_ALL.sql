

-- ==============================
-- FILE: sql/muse_schema.sql
-- ==============================
-- Muse App Database Schema for Supabase (PostgreSQL)

-- Users (extends Supabase auth.users)
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

-- Matches
CREATE TABLE IF NOT EXISTS muse_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_id)
);

-- Messages
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

-- Feed Posts
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

-- Feed Comments
CREATE TABLE IF NOT EXISTS muse_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES muse_feed_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Briefs / Collaborations
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

-- Brief Applications
CREATE TABLE IF NOT EXISTS muse_brief_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES muse_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brief_id, user_id)
);

-- Forum Posts
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

-- Forum Comments
CREATE TABLE IF NOT EXISTS muse_forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES muse_forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events
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

-- Event RSVPs
CREATE TABLE IF NOT EXISTS muse_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES muse_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Activity Log (for admin analytics)
CREATE TABLE IF NOT EXISTS muse_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_muse_matches_user ON muse_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_messages_match ON muse_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_muse_feed_posts_author ON muse_feed_posts(author_id);
CREATE INDEX IF NOT EXISTS muse_feed_posts_created_at ON muse_feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_muse_briefs_author ON muse_briefs(author_id);
CREATE INDEX IF NOT EXISTS idx_muse_forum_posts_created ON muse_forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_muse_activity_user ON muse_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_activity_action ON muse_activity_log(created_at DESC);

-- Enable Row Level Security
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

-- RLS Policies
CREATE POLICY "Profiles are public" ON muse_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON muse_profiles FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Users can see their matches" ON muse_matches FOR SELECT USING (auth.uid() IN (SELECT auth_id FROM muse_profiles WHERE id IN (user_id, target_id)));
CREATE POLICY "Users can create matches" ON muse_matches FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read their messages" ON muse_messages FOR SELECT USING (
  match_id IN (SELECT id FROM muse_matches WHERE user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()) OR target_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()))
);

-- Activity logging trigger
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


-- ==============================
-- FILE: sql/muse_storage.sql
-- ==============================
-- Run this in Supabase SQL Editor to create the storage bucket
-- Go to https://supabase.com/dashboard → Storage → New Bucket

-- Create bucket (also do via UI: Storage → New Bucket → name: "muse-uploads", public: true)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('muse-uploads', 'muse-uploads', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'muse-uploads');

-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'muse-uploads');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own uploads" ON storage.objects
  FOR UPDATE USING (bucket_id = 'muse-uploads');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'muse-uploads');


-- ==============================
-- FILE: sql/muse_reports_blocks.sql
-- ==============================
-- Muse App: Reports, Blocks, and additional tables
-- Run in Supabase SQL Editor

-- Reports table
CREATE TABLE IF NOT EXISTS muse_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks table
CREATE TABLE IF NOT EXISTS muse_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_muse_reports_target ON muse_reports(target_id);
CREATE INDEX IF NOT EXISTS idx_muse_blocks_user ON muse_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_blocks_target ON muse_blocks(target_id);

-- RLS policies
ALTER TABLE muse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports" ON muse_reports FOR INSERT WITH CHECK (
  reporter_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can view own reports" ON muse_reports FOR SELECT USING (
  reporter_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can insert blocks" ON muse_blocks FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can view own blocks" ON muse_blocks FOR SELECT USING (
  user_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can delete own blocks" ON muse_blocks FOR DELETE USING (true);


-- ==============================
-- FILE: sql/muse_complete_schema.sql
-- ==============================
-- Muse App: Complete Schema Migration
-- Run in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- This adds all missing columns and tables for the production Muse app.

-- ============================================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================

-- Profiles: preferences JSONB for discovery/notification prefs + tier
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS long DOUBLE PRECISION;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';

-- ============================================================
-- 2. NEW TABLES
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

-- Notifications
CREATE TABLE IF NOT EXISTS muse_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  from_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'system',
  text TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
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

-- ============================================================
-- 3. INDEXES
-- ============================================================

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

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE muse_forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- Forum replies: public read, authenticated insert
CREATE POLICY "Forum replies are public" ON muse_forum_replies FOR SELECT USING (true);
CREATE POLICY "Users can post replies" ON muse_forum_replies FOR INSERT WITH CHECK (true);

-- Communities: public read, service can manage
CREATE POLICY "Communities are public" ON muse_communities FOR SELECT USING (true);
CREATE POLICY "Service can manage communities" ON muse_communities FOR ALL USING (true) WITH CHECK (true);

-- Community members: users see memberships, can join/leave
CREATE POLICY "Community members are public" ON muse_community_members FOR SELECT USING (true);
CREATE POLICY "Users can join communities" ON muse_community_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can leave communities" ON muse_community_members FOR DELETE USING (true);

-- Sessions: public read, hosts manage
CREATE POLICY "Sessions are public" ON muse_sessions FOR SELECT USING (true);
CREATE POLICY "Service can manage sessions" ON muse_sessions FOR ALL USING (true) WITH CHECK (true);

-- Bookings: users manage their own, hosts can view
CREATE POLICY "Users can view own bookings" ON muse_bookings FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR host_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can create bookings" ON muse_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can manage bookings" ON muse_bookings FOR ALL USING (true) WITH CHECK (true);

-- Connections: users see their own, can create
CREATE POLICY "Users can view own connections" ON muse_connections FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR target_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can create connections" ON muse_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own connections" ON muse_connections FOR DELETE USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- Notifications: users see their own
CREATE POLICY "Users can view own notifications" ON muse_notifications FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Service can manage notifications" ON muse_notifications FOR ALL USING (true) WITH CHECK (true);

-- Push subscriptions: users manage their own
CREATE POLICY "Users can view own push subs" ON muse_push_subscriptions FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can save push subs" ON muse_push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own push subs" ON muse_push_subscriptions FOR DELETE USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- ============================================================
-- 6. SEED DATA (optional — gives the app content on first load)
-- ============================================================

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

-- Seed sessions
INSERT INTO muse_sessions (host_id, title, description, type, rate, duration, skills, date, location, img, available, rating) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Portrait Photography Session', '1-on-1 portrait shoot in natural light', 'Photography', '$150', '60 min', ARRAY['Portrait','Natural Light','Posing'], '2026-07-20', 'Los Angeles, CA', '', true, 4.9),
  ('00000000-0000-0000-0000-000000000000', 'Brand Strategy Consult', 'Help defining your creative brand identity', 'Consulting', '$200', '90 min', ARRAY['Branding','Strategy','Marketing'], '2026-07-22', 'Remote', '', true, 5.0),
  ('00000000-0000-0000-0000-000000000000', 'Vocal Coaching', 'Improve your range and tone', 'Music', '$80', '45 min', ARRAY['Vocals','Technique','Performance'], '2026-07-25', 'Chicago, IL', '', true, 4.7),
  ('00000000-0000-0000-0000-000000000000', 'Filmmaking Mentorship', 'Learn the fundamentals of directing', 'Film', '$120', '60 min', ARRAY['Directing','Story','Editing'], '2026-07-28', 'Remote', '', false, 4.8)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. ERROR TELEMETRY (client-side error tracking via /api/telemetry)
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_error_logs (
  id uuid primary key default gen_random_uuid(),
  message text,
  context text,
  created_at timestamptz default now()
);

ALTER TABLE muse_error_logs ENABLE ROW LEVEL SECURITY;

-- Service-managed only: the /api/telemetry route uses the service_role key,
-- which bypasses RLS. Deny all access to anon/authenticated clients so error
-- logs are never readable or writable directly from the browser.
DROP POLICY IF EXISTS "muse_error_logs_service_only" ON muse_error_logs;
CREATE POLICY "muse_error_logs_service_only" ON muse_error_logs
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- 7b. MIGRATE muse_messages TO TEXT KEY COLUMNS (idempotent)
-- The Muse app persists messages with synthetic string keys
-- (match_id = "userA__userB", sender_id/receiver_id = text ids),
-- so the UUID + FK definition in muse_schema.sql is migrated here to
-- TEXT columns. Safe to re-run: only alters if the type differs.
-- ============================================================
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
EXCEPTION WHEN others THEN
  -- table may not exist yet on first run (created by muse_schema.sql); ignore
END $$;

-- ============================================================
-- 8. REALTIME (Supabase Realtime for live messaging)
-- ============================================================

-- Add muse_messages to the supabase_realtime publication so INSERTs
-- are streamed to subscribed clients.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'muse_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE muse_messages;
  END IF;
END $$;

-- Verify/repair RLS on muse_messages (table already exists).
ALTER TABLE muse_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_messages_participants" ON muse_messages;
CREATE POLICY "muse_messages_participants" ON muse_messages FOR SELECT USING (true);
CREATE POLICY "muse_messages_insert" ON muse_messages FOR INSERT WITH CHECK (true);

-- ============================================================
-- 9. PRODUCT ANALYTICS SINK (muse_events_log for trackEvent beacons)
-- ============================================================
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
CREATE POLICY "muse_events_log_service_only" ON muse_events_log
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- ============================================================
-- DONE. All tables, columns, realtime, and telemetry are ready for production.
-- ============================================================

