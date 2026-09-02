-- MUSE_STATUS_COLUMN_20260902.sql
-- Add a `status` column to muse_profiles so the Feed composer's inline
-- "status" (🎨 Working on something new) is truly persistent — stored on the
-- profile, synced across devices, and loadable on every session.
--
-- ADD COLUMN IF NOT EXISTS is idempotent and safe to re-run. This is additive
-- DDL (no data dropped, no constraint added that could reject existing rows),
-- so it is backward-compatible with the running app.
--
-- Run against the live Supabase DB (the same one the /api/muse/auth
-- update-profile action writes to).

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS status text;
