-- Add unique constraint for book-session upsert (prevents duplicate bookings)
-- Run this in Supabase SQL Editor
ALTER TABLE muse_bookings
  ADD CONSTRAINT IF NOT EXISTS muse_bookings_session_id_user_id_key
  UNIQUE (session_id, user_id);
