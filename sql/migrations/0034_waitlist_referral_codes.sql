-- 0034: waitlist referral loop.
--
-- Every waitlist signup gets a short shareable `referral_code`; a `?ref=` link
-- attributes the new signup through the pre-existing `referred_by` column so
-- queue position can move up for the sharer. No new link column is needed:
-- `referred_by` is a self-reference to another muse_waitlist.id.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.muse_waitlist ADD COLUMN IF NOT EXISTS referral_code text;

-- Backfill any pre-existing rows (id is unique, so md5(id) is unique per row).
UPDATE public.muse_waitlist
   SET referral_code = upper(substr(md5(id::text), 1, 8))
 WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS muse_waitlist_referral_code_key
    ON public.muse_waitlist (referral_code)
 WHERE referral_code IS NOT NULL;

-- Position/attribution lookups: who did this row get referred by, and how many
-- people did this row refer.
CREATE INDEX IF NOT EXISTS idx_muse_waitlist_referred_by
    ON public.muse_waitlist (referred_by)
 WHERE referred_by IS NOT NULL;
