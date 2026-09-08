-- 011_add_forum_post_moderation.sql
-- Add locked column to muse_forum_posts for admin/mod post locking.
-- pinned column already exists. Idempotent: safe to re-run.

ALTER TABLE muse_forum_posts ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;
COMMENT ON COLUMN muse_forum_posts.locked IS 'When true, no new replies can be added to this post (admin/mod action).';
