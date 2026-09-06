-- MUSE_MEDIA_KIT: adds a Media Kit link field to profiles (Profile screen).
-- A URL to a PDF or portfolio one-pager, shown as a labeled link with an
-- icon on the profile when present, editable from Edit Profile.
--
-- Run in Supabase SQL Editor.

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS media_kit_url TEXT DEFAULT '';
