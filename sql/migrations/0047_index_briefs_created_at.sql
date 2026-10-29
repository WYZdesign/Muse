-- Same gap as 0046, found while auditing every other `.order(...)` call in
-- src/lib/muse-actions/get.ts for the same "ORDER BY with no supporting
-- index" pattern after fixing it for muse_profiles.last_seen_at.
--
-- The "briefs" listing's fallback query is literally
-- `.order("created_at", { ascending: false }).limit(50)` over the whole
-- table with no WHERE at all -- the exact same shape as the Discover bug,
-- just on muse_briefs instead of muse_profiles. muse_briefs already has
-- indexes on author_id and boost_expires_at (0000_baseline.sql,
-- 0040_brief_boost.sql) but nothing on created_at, so this query can only
-- be served today by a full sequential scan + sort. Fine at current size;
-- not fine once this table has millions of rows.
--
-- Additive and idempotent.

CREATE INDEX IF NOT EXISTS idx_muse_briefs_created_at
  ON public.muse_briefs (created_at DESC);
