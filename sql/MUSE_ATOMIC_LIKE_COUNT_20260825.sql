-- Atomic like increment/decrement function to prevent race conditions.
-- Used by the like-feed-post and like-moment API actions via sb.rpc().
-- Falls back to read-modify-write if this function doesn't exist yet.

CREATE OR REPLACE FUNCTION atomic_like_count(
  table_name TEXT,
  row_id UUID,
  delta INT
) RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  IF table_name = 'muse_feed_posts' THEN
    UPDATE muse_feed_posts SET likes = GREATEST(0, likes + delta) WHERE id = row_id RETURNING likes INTO new_count;
  ELSIF table_name = 'muse_moments' THEN
    UPDATE muse_moments SET likes = GREATEST(0, likes + delta) WHERE id = row_id RETURNING likes INTO new_count;
  ELSE
    RAISE EXCEPTION 'Unsupported table: %', table_name;
  END IF;
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
