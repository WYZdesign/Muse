-- Muse App: Complete Schema Migration
-- Run in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- This adds all missing columns and tables for the production Muse app.

-- ============================================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================

-- Profiles: preferences JSONB for discovery/notification prefs + tier + photos
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS long DOUBLE PRECISION;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

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

-- Forum replies: public read, authenticated insert (scoped to own user_id)
CREATE POLICY "Forum replies are public" ON muse_forum_replies FOR SELECT USING (true);
CREATE POLICY "Users can post replies" ON muse_forum_replies FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- Communities: public read, service role can manage (prevents client-side tampering)
CREATE POLICY "Communities are public" ON muse_communities FOR SELECT USING (true);
CREATE POLICY "Service can manage communities" ON muse_communities FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Community members: users see memberships, can join/leave (scoped to own user_id)
CREATE POLICY "Community members are public" ON muse_community_members FOR SELECT USING (true);
CREATE POLICY "Users can join communities" ON muse_community_members FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can leave communities" ON muse_community_members FOR DELETE USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- Sessions: public read, service role manages lifecycle (hosts create via API)
CREATE POLICY "Sessions are public" ON muse_sessions FOR SELECT USING (true);
CREATE POLICY "Service can manage sessions" ON muse_sessions FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Bookings: users view own, create own; service role manages lifecycle
CREATE POLICY "Users can view own bookings" ON muse_bookings FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR host_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can create own bookings" ON muse_bookings FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Service can manage bookings" ON muse_bookings FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Connections: users see their own, can create
CREATE POLICY "Users can view own connections" ON muse_connections FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR target_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can create connections" ON muse_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own connections" ON muse_connections FOR DELETE USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- Notifications: users see their own; service role manages
CREATE POLICY "Users can view own notifications" ON muse_notifications FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Service can manage notifications" ON muse_notifications FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Push subscriptions: users manage their own (INSERT scoped to own user_id)
CREATE POLICY "Users can view own push subs" ON muse_push_subscriptions FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can save own push subs" ON muse_push_subscriptions FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
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
-- Add client_msg_id (idempotent) for client-side dedup of message inserts.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='muse_messages' AND column_name='client_msg_id') THEN
    ALTER TABLE muse_messages ADD COLUMN client_msg_id TEXT UNIQUE;
  END IF;
EXCEPTION WHEN others THEN
END $$;

-- IMPORTANT: sender_id/receiver_id store the muse_profiles.id (a UUID stored as
-- TEXT), NOT auth.uid(). The route writes profile.id on insert, so participant
-- checks must map auth.uid() -> muse_profiles.auth_id -> profile.id. The prior
-- version (USING (true) / WITH CHECK (true)) left messages world-readable and
-- world-writable. This scopes read/insert to conversation participants only.
ALTER TABLE muse_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_messages_participants" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_insert" ON muse_messages;
CREATE POLICY "muse_messages_participants" ON muse_messages FOR SELECT
  USING (
    sender_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
    OR receiver_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  );
CREATE POLICY "muse_messages_insert" ON muse_messages FOR INSERT
  WITH CHECK (
    sender_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  );

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
-- 10. AGE VERIFICATION SESSIONS (Stripe Identity)
-- ============================================================
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
ALTER TABLE muse_verification_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_verification_sessions_owner" ON muse_verification_sessions;
CREATE POLICY "muse_verification_sessions_owner" ON muse_verification_sessions
  FOR SELECT USING (user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()));
-- Service role manages insert/update via API

-- Add age_verified columns to profiles if not exists
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified boolean default false;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS age_verified_at timestamptz;

-- ============================================================
-- DONE. All tables, columns, realtime, and telemetry are ready for production.
-- ============================================================
