-- Migration 006: Nested forum threading
-- Adds parent_reply_id and depth columns to muse_forum_replies for reply-to-reply nesting.

ALTER TABLE muse_forum_replies
  ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES muse_forum_replies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS depth INT NOT NULL DEFAULT 0;

-- Index for fast thread fetching (replies sorted by created_at within a parent)
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent
  ON muse_forum_replies (parent_reply_id, created_at ASC)
  WHERE parent_reply_id IS NOT NULL;

-- Index for top-level replies on a post (depth = 0, no parent)
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_depth
  ON muse_forum_replies (post_id, depth, created_at ASC);