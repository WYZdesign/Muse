-- Add unique constraint for book-session upsert (prevents duplicate bookings)
-- Run this in Supabase SQL Editor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'muse_bookings'
      AND c.conname = 'muse_bookings_session_id_user_id_key'
  ) THEN
    ALTER TABLE muse_bookings
      ADD CONSTRAINT muse_bookings_session_id_user_id_key
      UNIQUE (session_id, user_id);
  END IF;
END $$;
