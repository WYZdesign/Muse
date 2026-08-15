-- ============================================================
-- MUSE APP — CONSOLIDATED FULL SCHEMA (2026-08-13)
-- ============================================================
-- THE single migration file. Paste this entire file into:
--   Supabase Dashboard -> SQL Editor -> New Query -> RUN
--
-- Creates EVERY table, index, and RLS policy the Muse app
-- references. Safe to re-run: every statement is idempotent
-- (IF NOT EXISTS / DROP IF EXISTS).
--
-- Built from these source migrations (applied in dependency order):
--   1. MUSE_APPLY_ALL.sql               (base: profiles, messages, matches, etc.)
--   2. MUSE_ALBUMS_MIGRATION_20260802   (albums, photos, access grants)
--   3. MUSE_REFERRALS_CONNECT_20260803  (referrals, stripe connect, payments)
--   4. MUSE_C_SAM_PIPELINE_20260804     (content scans, safety incidents)
--   5. MUSE_TRUST_SAFETY_20260803       (strikes, disclosures, prompts, checkins)
--   6. MUSE_LANDING_20260804            (waitlist, landing analytics, qr events)
--   7. MUSE_NCMEC_20260813              (CSAM CyberTipline report queue)
--   8. MUSE_VERIFICATION_SESSIONS_20260804 (Stripe Identity sessions)
-- ============================================================



-- ============================================================
-- SECTION 1 of 8 — source: MUSE_APPLY_ALL.sql
-- ============================================================



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

-- (Removed: legacy "Users can read their messages" policy compared TEXT match_id to UUID muse_matches.id,
--  which fails with "operator does not exist: text = uuid". Superseded by muse_messages_participants below.)

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
  reporter_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can view own reports" ON muse_reports FOR SELECT USING (
  reporter_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can insert blocks" ON muse_blocks FOR INSERT WITH CHECK (
  user_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can view own blocks" ON muse_blocks FOR SELECT USING (
  user_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
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

-- Seed sessions (removed: host_id pointed at nil UUID 00000000-... which violates the muse_sessions_host_id_fkey
-- FK on a fresh database. Demo content lives in the frontend; no DB seed sessions are required.)

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



-- ============================================================
-- SECTION 2 of 8 — source: MUSE_ALBUMS_MIGRATION_20260802.sql
-- ============================================================

-- ═══ MUSE APP — ALBUMS & PORTFOLIO PRIVACY MIGRATION (2026-08-02) ═══
-- Copy this entire file into Supabase Dashboard → SQL Editor → New Query → RUN.
-- Safe to re-run: all statements use IF NOT EXISTS / DROP IF EXISTS.
--
-- Replaces the flat muse_profiles.portfolio JSONB array with a real album
-- system: multiple named albums per profile, each with its own photos and
-- its own privacy level (public / private / invite-only), matching the
-- Model Mayhem-style portfolio browsing the app's UI implements.
--
-- Existing muse_profiles.portfolio JSONB column is left untouched (not
-- dropped) so nothing breaks if this migration is only partially applied.

-- ============================================================
-- 1. ALBUMS TABLE
-- ============================================================

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

-- ============================================================
-- 2. ALBUM PHOTOS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES muse_albums(id) ON DELETE CASCADE,
  img_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_album_photos_album ON muse_album_photos(album_id);

-- ============================================================
-- 3. ALBUM ACCESS GRANTS (for invite-only albums — per-viewer allowlist)
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_album_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES muse_albums(id) ON DELETE CASCADE,
  viewer_profile_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(album_id, viewer_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_muse_album_access_album ON muse_album_access(album_id);
CREATE INDEX IF NOT EXISTS idx_muse_album_access_viewer ON muse_album_access(viewer_profile_id);

-- ============================================================
-- 4. VIEW/LIKE COUNTERS (denormalized, updated by the app on read/like)
-- ============================================================

ALTER TABLE muse_albums ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE muse_albums ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE muse_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_album_access ENABLE ROW LEVEL SECURITY;

-- Albums: visible if public, owned by the viewer, or invite-granted to the viewer
DROP POLICY IF EXISTS "muse_albums_select" ON muse_albums;
CREATE POLICY "muse_albums_select" ON muse_albums FOR SELECT USING (
  access_level = 'public'
  OR profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR (
    access_level = 'invite'
    AND EXISTS (
      SELECT 1 FROM muse_album_access
      WHERE muse_album_access.album_id = muse_albums.id
        AND muse_album_access.viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "muse_albums_insert" ON muse_albums;
CREATE POLICY "muse_albums_insert" ON muse_albums FOR INSERT WITH CHECK (
  profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

DROP POLICY IF EXISTS "muse_albums_update" ON muse_albums;
CREATE POLICY "muse_albums_update" ON muse_albums FOR UPDATE USING (
  profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

DROP POLICY IF EXISTS "muse_albums_delete" ON muse_albums;
CREATE POLICY "muse_albums_delete" ON muse_albums FOR DELETE USING (
  profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- Album photos: same visibility as their parent album
DROP POLICY IF EXISTS "muse_album_photos_select" ON muse_album_photos;
CREATE POLICY "muse_album_photos_select" ON muse_album_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM muse_albums
    WHERE muse_albums.id = muse_album_photos.album_id
      AND (
        muse_albums.access_level = 'public'
        OR muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
        OR (
          muse_albums.access_level = 'invite'
          AND EXISTS (
            SELECT 1 FROM muse_album_access
            WHERE muse_album_access.album_id = muse_albums.id
              AND muse_album_access.viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "muse_album_photos_write" ON muse_album_photos;
CREATE POLICY "muse_album_photos_write" ON muse_album_photos FOR ALL USING (
  EXISTS (
    SELECT 1 FROM muse_albums
    WHERE muse_albums.id = muse_album_photos.album_id
      AND muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  )
);

-- Album access grants: only the album owner can see/manage the invite list;
-- a viewer can see their own grant row (so the client can show "you have access")
DROP POLICY IF EXISTS "muse_album_access_select" ON muse_album_access;
CREATE POLICY "muse_album_access_select" ON muse_album_access FOR SELECT USING (
  viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM muse_albums
    WHERE muse_albums.id = muse_album_access.album_id
      AND muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "muse_album_access_write" ON muse_album_access;
CREATE POLICY "muse_album_access_write" ON muse_album_access FOR ALL USING (
  EXISTS (
    SELECT 1 FROM muse_albums
    WHERE muse_albums.id = muse_album_access.album_id
      AND muse_albums.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  )
);

-- ============================================================
-- 6. VERIFY
-- ============================================================

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('muse_albums','muse_album_photos','muse_album_access')
ORDER BY tablename;

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('muse_albums','muse_album_photos','muse_album_access')
ORDER BY tablename, policyname;



-- ============================================================
-- SECTION 3 of 8 — source: MUSE_REFERRALS_CONNECT_20260803.sql
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- Muse Referral System + Stripe Connect — 2026-08-03
-- ══════════════════════════════════════════════════════════════

-- Referral codes table
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

-- Index for quick code lookup
CREATE INDEX IF NOT EXISTS idx_muse_referrals_code ON muse_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_muse_referrals_referrer ON muse_referrals(referrer_id);

-- Referral rewards log
CREATE TABLE IF NOT EXISTS muse_referral_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES muse_referrals(id) ON DELETE CASCADE,
  reward_type VARCHAR(30) NOT NULL CHECK (reward_type IN ('free_month', 'credit')),
  recipient_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER DEFAULT 0,
  stripe_subscription_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe Connect accounts
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

-- Stripe Connect bookings (marketplace)
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

-- Add referral_code to profiles
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES muse_profiles(id) ON DELETE SET NULL;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS stripe_connect_id VARCHAR(100);

-- Index for referral lookups
CREATE INDEX IF NOT EXISTS idx_muse_profiles_referral_code ON muse_profiles(referral_code);

-- RLS policies
ALTER TABLE muse_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_stripe_connect ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_booking_payments ENABLE ROW LEVEL SECURITY;

-- Referrals: users can see their own referrals
CREATE POLICY "Users see own referrals" ON muse_referrals
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = referrer_id));

-- Referral rewards: users see their own
CREATE POLICY "Users see own rewards" ON muse_referral_rewards
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = recipient_id));

-- Stripe Connect: users see their own
CREATE POLICY "Users see own connect" ON muse_stripe_connect
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));

-- Booking payments: participants see
CREATE POLICY "Payers and payees see payments" ON muse_booking_payments
  FOR SELECT USING (
    auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = payer_id)
    OR auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = payee_id)
  );



-- ============================================================
-- SECTION 4 of 8 — source: MUSE_C_SAM_PIPELINE_20260804.sql
-- ============================================================

-- ============================================================
-- MUSE CONTENT SCANS & SAFETY INCIDENTS MIGRATION
-- Run this in Supabase SQL Editor for CSAM/content moderation pipeline
-- ============================================================

-- 1. Content scans log (every upload goes through moderation)
CREATE TABLE IF NOT EXISTS muse_content_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  booking_id uuid references muse_bookings(id) on delete set null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  context text not null, -- "upload", "chat", "profile", "booking"
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

-- 2. Safety incidents (escalated violations requiring review)
CREATE TABLE IF NOT EXISTS muse_safety_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  type text not null, -- "content_policy_violation", "csam_detected", "explicit_nudity_payment", "harassment", "minor_suspected"
  severity text not null default 'medium', -- "low", "medium", "high", "critical"
  details jsonb default '{}',
  status text not null default 'pending_review', -- "pending_review", "under_investigation", "resolved_action_taken", "resolved_no_action", "escalated_to_authorities"
  reviewer_id uuid references muse_profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text,
  ncmec_report_id text, -- If reported to NCMEC
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_user ON muse_safety_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_status ON muse_safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_type ON muse_safety_incidents(type);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_severity ON muse_safety_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_created ON muse_safety_incidents(created_at DESC);

-- 3. RLS policies
ALTER TABLE muse_content_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_content_scans_owner" ON muse_content_scans;
CREATE POLICY "muse_content_scans_owner" ON muse_content_scans
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));
-- Service role manages insert

ALTER TABLE muse_safety_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_safety_incidents_owner" ON muse_safety_incidents;
CREATE POLICY "muse_safety_incidents_owner" ON muse_safety_incidents
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));
-- Admins can view all via service role

-- 4. Add to realtime if needed
-- ALTER PUBLICATION supabase_realtime ADD TABLE muse_safety_incidents;

-- 5. NCMEC reporting helper function (for admin use)
CREATE OR REPLACE FUNCTION report_to_ncmec(p_incident_id uuid, p_report_id text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE muse_safety_incidents 
  SET ncmec_report_id = p_report_id, 
      status = 'escalated_to_authorities',
      updated_at = now()
  WHERE id = p_incident_id;
END;
$$;



-- ============================================================
-- SECTION 5 of 8 — source: MUSE_TRUST_SAFETY_20260803.sql
-- ============================================================

-- Muse Trust & Safety Infrastructure — Complete Migration
-- Run in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- Created: 2026-08-03
-- Covers: Disclosures, Strikes, Pre-shoot Check-ins, Safety, Prompt Bank, Admin Audit

-- ============================================================
-- 0. VECTOR EXTENSION — needed for embedding similarity search
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. DISCLOSURES — structured booking agreement before shoot
-- ============================================================
-- Triggered when an offer includes payment + nudity/NSFW/non-studio location.
-- Both parties must view and confirm the SAME document.
-- Hard-blocks NSFW+payment combos (inserted with status='blocked').

CREATE TABLE IF NOT EXISTS muse_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  proposer_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,

  -- Compensation
  compensation_amount TEXT NOT NULL DEFAULT '',
  compensation_timing TEXT NOT NULL DEFAULT '',        -- 'before' | 'after' | 'half_upfront'
  compensation_method TEXT NOT NULL DEFAULT '',        -- 'stripe' | 'cash' | 'other'

  -- Content scope (structured checkboxes)
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

  -- Explicit boundary checklist (priming/awareness device)
  -- These are shown even when not applicable, to prime vigilance
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

  -- Location
  location_type TEXT NOT NULL DEFAULT '',              -- 'certified_studio' | 'private_studio' | 'private_residence' | 'outdoor' | 'other'
  location_address TEXT NOT NULL DEFAULT '',
  location_public BOOLEAN DEFAULT true,

  -- People present
  others_present BOOLEAN NOT NULL DEFAULT false,
  others_count INT NOT NULL DEFAULT 0,
  others_desc TEXT NOT NULL DEFAULT '',                -- e.g. 'makeup artist, assistant'

  -- Terms & acknowledgments
  usage_rights TEXT NOT NULL DEFAULT '',               -- 'portfolio' | 'client' | 'editorial' | 'unlimited' | 'custom'
  usage_custom_desc TEXT NOT NULL DEFAULT '',
  edit_approval_required BOOLEAN NOT NULL DEFAULT false,
  nda_required BOOLEAN NOT NULL DEFAULT false,
  model_release_required BOOLEAN NOT NULL DEFAULT false,

  -- AI-assisted mismatch flag
  ai_flagged BOOLEAN NOT NULL DEFAULT false,
  ai_flag_reason TEXT NOT NULL DEFAULT '',

  -- Status: 'pending_proposer' | 'pending_responder' | 'confirmed' | 'blocked' | 'expired'
  status TEXT NOT NULL DEFAULT 'pending_proposer',
  blocked_reason TEXT NOT NULL DEFAULT '',

  -- Timestamps
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
-- Both parties can read; service-role manages writes
CREATE POLICY "Disclosure parties can read" ON muse_disclosures FOR SELECT USING (
  proposer_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR responder_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Service manages disclosures" ON muse_disclosures FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. STRIKES — enforcement with two escalation tracks
-- ============================================================
-- Track 1 (standard): spam, rudeness, minor guideline issues → graduated
-- Track 2 (high-severity): NSFW solicitation, coercion, assault reports → immediate suspend

CREATE TABLE IF NOT EXISTS muse_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,  -- NULL = auto-system
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'standard',    -- 'standard' | 'high_severity'
  severity TEXT NOT NULL DEFAULT 'warning',     -- 'warning' | 'suspension' | 'permanent_ban'
  suspension_ends_at TIMESTAMPTZ,               -- NULL = permanent
  appeal_status TEXT DEFAULT 'none',            -- 'none' | 'pending' | 'upheld' | 'overturned'
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
CREATE POLICY "Users can view own strikes" ON muse_strikes FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Service manages strikes" ON muse_strikes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. SAFETY PROFILES — trusted contacts & emergency info
-- ============================================================

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
CREATE POLICY "Users manage own safety profile" ON muse_safety_profiles FOR ALL USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- ============================================================
-- 4. SAFETY CHECK-INS — pre-shoot and during-shoot check-ins
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_safety_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  disclosure_id UUID REFERENCES muse_disclosures(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  checkin_type TEXT NOT NULL DEFAULT 'pre_shoot',  -- 'pre_shoot_24h' | 'day_of' | 'during_shoot' | 'post_shoot'
  status TEXT NOT NULL DEFAULT 'pending',          -- 'pending' | 'confirmed' | 'cancelled' | 'no_response'
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
CREATE POLICY "Users view own check-ins" ON muse_safety_checkins FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Service manages check-ins" ON muse_safety_checkins FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. SAFETY SHARE LOG — when user shares shoot details with trusted contact
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_safety_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  disclosure_id UUID REFERENCES muse_disclosures(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  recipient_phone TEXT NOT NULL DEFAULT '',
  recipient_email TEXT NOT NULL DEFAULT '',
  share_method TEXT NOT NULL DEFAULT 'sms',  -- 'sms' | 'email' | 'link'
  shared_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE muse_safety_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own shares" ON muse_safety_shares FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Service manages shares" ON muse_safety_shares FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. ADMIN AUDIT LOG — every admin AI query logged
-- ============================================================

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
-- Deny all client-side access; service-role only
CREATE POLICY "Admin audit is service-only" ON muse_admin_audit_log
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- ============================================================
-- 7. PROMPT BANK — curated onboarding prompts per category
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_prompt_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,                    -- 'photographer' | 'model' | 'actor' | 'videographer' | 'musician' | 'writer' | 'designer' | 'influencer' | 'general'
  subcategory TEXT NOT NULL DEFAULT '',      -- e.g. 'fashion_photographer', 'portrait_model'
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'single_choice' | 'multi_choice'
  choices JSONB DEFAULT '[]',               -- for single/multi choice prompts
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_prompts_category ON muse_prompt_bank(category, display_order);

ALTER TABLE muse_prompt_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prompts are public read" ON muse_prompt_bank FOR SELECT USING (true);
CREATE POLICY "Service manages prompts" ON muse_prompt_bank FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. USER PROMPT RESPONSES — answers to prompt bank
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_prompt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES muse_prompt_bank(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL DEFAULT '',
  response_choices JSONB DEFAULT '[]',
  embedding VECTOR(768),                     -- nomic-embed-text output
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_muse_prompt_resp_user ON muse_prompt_responses(user_id);

ALTER TABLE muse_prompt_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own responses" ON muse_prompt_responses FOR ALL USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- ============================================================
-- 9. EMBEDDINGS — profile text embeddings for similarity matching
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  embedding_type TEXT NOT NULL DEFAULT 'profile',  -- 'profile' | 'bio' | 'prompt_answer'
  text_source TEXT NOT NULL DEFAULT '',
  embedding VECTOR(768) NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'nomic-embed-text',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, embedding_type)
);

CREATE INDEX IF NOT EXISTS idx_muse_embeddings_user ON muse_profile_embeddings(user_id);

ALTER TABLE muse_profile_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Embeddings are service-only" ON muse_profile_embeddings
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- ============================================================
-- 10. BOOKING UPDATES — enhanced booking status management
-- ============================================================

ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT '';
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS reschedule_date TEXT DEFAULT '';
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 11. PROFILE COMPLETION — track prompt completion percentage
-- ============================================================

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS profile_completion_pct INT DEFAULT 0;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS prompt_completed_at TIMESTAMPTZ;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS emergency_contact_added BOOLEAN DEFAULT false;

-- ============================================================
-- DONE. All trust & safety tables are ready.
-- ============================================================



-- ============================================================
-- SECTION 6 of 8 — source: MUSE_LANDING_20260804.sql
-- ============================================================

-- ============================================================
-- MUSE LANDING PAGE TABLES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Waitlist table
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

-- 2. Landing analytics (daily counters)
CREATE TABLE IF NOT EXISTS muse_landing_analytics (
  date date primary key,
  signups int default 0,
  qr_scans int default 0,
  qr_shares int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. QR code tracking (each scan/share)
CREATE TABLE IF NOT EXISTS muse_qr_events (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- "mixer_la", "instagram_bio", etc.
  event_type text not null, -- "scan", "share", "signup"
  referrer text, -- HTTP referrer
  user_agent text,
  ip_hash text, -- hashed for privacy
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_source ON muse_qr_events(source);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_type ON muse_qr_events(event_type);
CREATE INDEX IF NOT EXISTS idx_muse_qr_events_created ON muse_qr_events(created_at DESC);

-- 4. RLS policies (owner-only for waitlist, service-role for analytics)
ALTER TABLE muse_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_waitlist_owner" ON muse_waitlist;
CREATE POLICY "muse_waitlist_owner" ON muse_waitlist
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
-- Service role inserts via API

ALTER TABLE muse_landing_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_landing_analytics_service" ON muse_landing_analytics;
CREATE POLICY "muse_landing_analytics_service" ON muse_landing_analytics
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
-- Service role only

ALTER TABLE muse_qr_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_qr_events_service" ON muse_qr_events;
CREATE POLICY "muse_qr_events_service" ON muse_qr_events
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
-- Service role only



-- ============================================================
-- SECTION 7 of 8 — source: MUSE_NCMEC_20260813.sql
-- ============================================================

-- ════════════════════════════════════════════════════════════════
-- Muse — NCMEC CyberTipline escalation + account suspension
-- Run in Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Account suspension fields on muse_profiles (fails-closed CSAM response)
ALTER TABLE muse_profiles
  ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- 2. NCMEC CyberTipline report queue (CSAM only — human/automated submitter)
CREATE TABLE IF NOT EXISTS muse_ncmec_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  file_name TEXT,
  context TEXT,
  flagged_categories JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC DEFAULT 0,
  report_type TEXT DEFAULT 'child_sexual_abuse_material',
  incident_details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending_submission',  -- pending_submission | submitted | rejected
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add is_csam + scanned columns to content scan log
ALTER TABLE muse_content_scans
  ADD COLUMN IF NOT EXISTS is_csam BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scanned BOOLEAN DEFAULT TRUE;

-- 4. RLS: NCMEC reports are admin/service-role only (never readable by users)
ALTER TABLE muse_ncmec_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ncmec_service_only" ON muse_ncmec_reports;
CREATE POLICY "ncmec_service_only" ON muse_ncmec_reports
  FOR ALL USING (false);



-- ============================================================
-- SECTION 8 of 8 — source: MUSE_VERIFICATION_SESSIONS_20260804.sql
-- ============================================================

-- ============================================================
-- MUSE VERIFICATION SESSIONS MIGRATION
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- Adds Stripe Identity age verification sessions table + profile columns
-- ============================================================

-- 1. Create verification sessions table
CREATE TABLE IF NOT EXISTS muse_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references muse_profiles(id) on delete cascade,
  stripe_session_id text not null,
  status text not null default 'pending', -- pending, verified, requires_input, canceled, expired
  purpose text default 'general', -- general, age_gate_booking
  verified_outputs jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);
CREATE INDEX IF NOT EXISTS idx_muse_verification_sessions_user ON muse_verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_verification_sessions_stripe ON muse_verification_sessions(stripe_session_id);

-- 2. Enable RLS + owner-only policy
ALTER TABLE muse_verification_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_verification_sessions_owner" ON muse_verification_sessions;
CREATE POLICY "muse_verification_sessions_owner" ON muse_verification_sessions
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));
-- Service role manages insert/update via API (bypasses RLS)

-- 3. Add age_verified columns to profiles
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified boolean default false;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified_at timestamptz;

-- 4. Optional: Add to realtime for live updates (if you want real-time verification status)
-- ALTER PUBLICATION supabase_realtime ADD TABLE muse_verification_sessions;
