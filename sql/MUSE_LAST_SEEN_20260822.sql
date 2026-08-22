-- ============================================================
-- MUSE — real presence heartbeat for the "online" badge (2026-08-22)
-- ============================================================
-- Paste into Supabase Dashboard -> SQL Editor -> New Query -> RUN.
-- Idempotent (safe to re-run).
--
-- Why: every "online" dot in the app was fake — hardcoded in the seed
-- PROFILES data or a coin-flip (Math.random() > 0.5) for demo matches. No
-- presence signal existed anywhere. This adds a `last_seen_at` timestamp,
-- touched on every session check (login / app resume), so real matches can
-- compute an actual online status (seen in the last few minutes) instead of
-- faking one. Stub/demo PROFILES entries are untouched — they're seed data
-- for the cold-start Discover deck, same as DEMO_MOMENTS, and aren't real
-- accounts to have presence for.
-- ============================================================

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();
