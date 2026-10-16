-- Read receipts (Musa Pro).
--
-- muse_messages.read existed but no code path ever wrote it, so there was no
-- record of WHETHER, let alone WHEN, a message was read. read_at is the
-- timestamp the receiver opened the conversation; it stays null until then.
-- The legacy `read` boolean is kept in sync by the mark-read action for
-- anything still keying off it.
--
-- Additive and idempotent: safe to re-run.

ALTER TABLE public.muse_messages
  ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

COMMENT ON COLUMN public.muse_messages.read_at IS
  'Set when the receiver opened the conversation; NULL until then. Drives the Musa Pro "Seen" receipt on the sender side.';
