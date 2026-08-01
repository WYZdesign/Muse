-- Muse Chat Fix v2: drop old policies first, then convert types, then recreate.
-- Run in Supabase Dashboard → SQL Editor → Run.
-- Idempotent — safe to re-run.

-- 0. Drop ALL existing muse_messages policies (they block ALTER TYPE and
--    compare against the old uuid columns)
DROP POLICY IF EXISTS "Users can read own messages" ON muse_messages;
DROP POLICY IF EXISTS "Users can read their messages" ON muse_messages;
DROP POLICY IF EXISTS "Users can send messages" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_participants" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_insert" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_select" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_update" ON muse_messages;
DROP POLICY IF EXISTS "muse_messages_delete" ON muse_messages;

-- 1. muse_messages key columns → TEXT (app writes "userA__userB" string keys)
DO $$
BEGIN
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

-- 2. Realtime: stream INSERTs so chat is live
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'muse_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE muse_messages;
  END IF;
END $$;

-- 3. RLS: messages readable only by conversation participants.
-- sender_id/receiver_id store muse_profiles.id (UUID cast to TEXT), so map
-- auth.uid() through muse_profiles.auth_id to the profile id, cast to text.
ALTER TABLE muse_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "muse_messages_participants" ON muse_messages FOR SELECT
  USING (
    sender_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
    OR receiver_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
  );
CREATE POLICY "muse_messages_insert" ON muse_messages FOR INSERT
  WITH CHECK (
    sender_id = (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid())
  );

-- 4. Notifications: app reference + basic policies (service-role writes, owner reads)
CREATE TABLE IF NOT EXISTS muse_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_id UUID,
  type TEXT DEFAULT '',
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE muse_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muse_notifications_owner" ON muse_notifications;
CREATE POLICY "muse_notifications_owner" ON muse_notifications
  FOR SELECT USING (user_id = auth.uid());

-- 5. Verify
SELECT table_name, column_name, data_type FROM information_schema.columns
  WHERE table_name = 'muse_messages' ORDER BY ordinal_position;
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('muse_messages','muse_profiles');
SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='muse_messages';
