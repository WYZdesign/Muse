-- ============================================================
-- MUSE -- persist engagement stats server-side (2026-08-22)
-- ============================================================
-- Paste into Supabase Dashboard -> SQL Editor -> New Query -> RUN.
-- Idempotent (safe to re-run).
--
-- Why: currentUser.stats (likes given, superlikes used, passes,
-- bookings completed, matches received, messages sent) was only ever
-- written to the client's localStorage. A user on a new device, or
-- after clearing storage, saw their stats reset to zero even though
-- their real activity (matches, messages, etc.) was intact server-side.
-- This adds a `stats` column so /api/muse (action "sync") has
-- somewhere to persist it, and /api/muse/auth (action "session")
-- returns it on every login so it can be merged back into local state.
-- ============================================================

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{
  "likes": 0,
  "superLikes": 0,
  "passes": 0,
  "bookingsCompleted": 0,
  "matchesReceived": 0,
  "messagesSent": 0
}'::jsonb;
