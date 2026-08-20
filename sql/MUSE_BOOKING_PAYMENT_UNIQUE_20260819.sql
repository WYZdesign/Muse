-- ─────────────────────────────────────────────────────────────
-- Muse booking payments — one payment row per booking
--
-- Problem: create-booking-checkout unconditionally INSERTed a new
-- muse_booking_payments row on every Pay click. A user who clicked
-- Pay, abandoned Stripe checkout, and came back to Pay again created
-- a second pending row — and complete-booking's .maybeSingle() query
-- then errored (multiple rows), silently breaking booking completion.
--
-- Fix: a UNIQUE constraint on booking_id so the payment upsert is
-- idempotent. Existing NULL booking_ids (legacy rows) are unaffected
-- because Postgres treats NULLs as distinct in unique constraints.
-- ─────────────────────────────────────────────────────────────

-- Remove any pre-existing duplicate pending rows (keep the latest).
DELETE FROM muse_booking_payments a
USING muse_booking_payments b
WHERE a.booking_id = b.booking_id
  AND a.booking_id IS NOT NULL
  AND a.created_at < b.created_at;

ALTER TABLE muse_booking_payments
  ADD CONSTRAINT muse_booking_payments_booking_id_key
  UNIQUE (booking_id);
