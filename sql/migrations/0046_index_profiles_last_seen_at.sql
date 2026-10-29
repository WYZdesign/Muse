-- The "profiles" and "discover-ranked" Discover queries in
-- src/lib/muse-actions/get.ts were given `.order("last_seen_at", {
-- ascending: false, nullsFirst: false }).limit(...)` in a fix for an
-- unordered-query staleness bug (the candidate pool previously trended
-- toward the oldest-created rows). That fix is correct, but it added an
-- ORDER BY with no supporting index. At the row counts this project has
-- tested against, Postgres just sorts in memory and nobody notices; at
-- 100M rows, "ORDER BY last_seen_at DESC LIMIT N" with no index on
-- last_seen_at forces a full sequential scan + sort of the entire table on
-- every Discover request — the exact kind of regression that looks fine in
-- every test run and only shows up once the table is large enough to hurt.
--
-- A plain descending btree lets Postgres satisfy the ORDER BY directly from
-- the index and stop after `limit` rows, without touching the rest of the
-- table. NULLS LAST matches the query's own `nullsFirst: false`, so an
-- index scan can serve the exact requested order (profiles that have never
-- been seen sort behind everyone who has, same as the query asks for).
--
-- Additive and idempotent.

CREATE INDEX IF NOT EXISTS idx_muse_profiles_last_seen_at
  ON public.muse_profiles (last_seen_at DESC NULLS LAST);
