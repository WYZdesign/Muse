-- Found in the same pass as 0048, going one step further: two queries
-- against muse_messages never touched the match_id index at all, because
-- they filter by sender_id/receiver_id instead --
--   src/app/api/muse/auth/route.ts  (auth bootstrap: "my last 5000 messages",
--     `.or("sender_id.eq.X,receiver_id.eq.X").order("created_at",
--     {ascending:false}).limit(5000)`)
--   src/lib/muse-actions/misc.ts    (message search: same sender/receiver OR,
--     plus a text/transcript ILIKE, same ordering)
-- Neither sender_id nor receiver_id had ANY index before this migration, so
-- both queries are full sequential scans of the entire messages table today
-- -- on every login, for every user, regardless of how many messages they
-- personally have. This is the same class of bug as 0046/0047 (an
-- unsupported ORDER BY/filter that only hurts once the table is large), just
-- harder to spot because the index gap is on the filter rather than the
-- sort. The ILIKE search in misc.ts still can't use an index for the text
-- match itself (that would need pg_trgm/a GIN index, a separate and bigger
-- change); these indexes only fix the OR-filter + ORDER BY part both queries
-- share.
--
-- Two separate single-column indexes rather than one OR-friendly composite:
-- Postgres can combine two single-column btree indexes via a BitmapOr for
-- an `a.eq.X OR b.eq.X` predicate, which a composite index can't help with
-- (its second column only helps once the first is pinned to one value, and
-- here it's an OR across two different columns, not an AND).
--
-- Additive and idempotent.

CREATE INDEX IF NOT EXISTS idx_muse_messages_sender_created_at
  ON public.muse_messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_muse_messages_receiver_created_at
  ON public.muse_messages (receiver_id, created_at DESC);
