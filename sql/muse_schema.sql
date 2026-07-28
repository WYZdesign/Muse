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
