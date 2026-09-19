-- Add unique constraint for checkin-cron upsert (prevents duplicate check-ins)
-- The cron upserts with onConflict "user_id,booking_id", which requires this
-- unique index to exist — otherwise the upsert errors. Run in Supabase SQL Editor.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'muse_safety_checkins'
      AND c.conname = 'muse_safety_checkins_user_booking_key'
  ) THEN
    ALTER TABLE muse_safety_checkins
      ADD CONSTRAINT muse_safety_checkins_user_booking_key
      UNIQUE (user_id, booking_id);
  END IF;
END $$;
