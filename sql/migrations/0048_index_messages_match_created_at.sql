-- Same audit pass as 0046/0047. muse_messages has an index on match_id
-- alone (idx_muse_messages_match, 0000_baseline.sql), but the "messages"
-- query in src/lib/muse-actions/get.ts is
-- `.eq("match_id", matchId).order("created_at", { ascending: true
-- }).limit(limit)`, optionally narrowed further with `.lt("created_at",
-- before)` for pagination. With only a single-column index on match_id,
-- Postgres can narrow to one conversation's rows via the index but still
-- has to sort them in memory every time -- bounded by that one
-- conversation's message count rather than the whole table (so far less
-- urgent than 0046/0047's whole-table scans), but a long-running or very
-- active conversation can still run to many thousands of messages over
-- years, at which point every page of history pays that sort cost. A
-- composite index lets the same query be served by a single ordered index
-- scan instead.
--
-- Drops the old single-column index: a composite (match_id, created_at)
-- index already serves every query the old index served (any query
-- filtering by match_id alone can still use the composite's leading
-- column), so keeping both would just be a second index Postgres has to
-- maintain on every message insert for no further benefit.
--
-- Additive and idempotent.

CREATE INDEX IF NOT EXISTS idx_muse_messages_match_created_at
  ON public.muse_messages (match_id, created_at);

DROP INDEX IF EXISTS public.idx_muse_messages_match;
