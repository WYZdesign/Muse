-- Add unique constraint for checkin-cron upsert (prevents duplicate check-ins)
-- The cron upserts with onConflict "user_id,booking_id", which requires this
-- unique index to exist — otherwise the upsert errors. Run in Supabase SQL Editor.
ALTER TABLE muse_safety_checkins
  ADD CONSTRAINT IF NOT EXISTS muse_safety_checkins_user_booking_key
  UNIQUE (user_id, booking_id);
