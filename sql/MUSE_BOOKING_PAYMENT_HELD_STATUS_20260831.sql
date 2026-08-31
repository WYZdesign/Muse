-- ═══════════════════════════════════════════════════════════════════════
-- muse_booking_payments.status is missing 'held' from its CHECK constraint
-- ═══════════════════════════════════════════════════════════════════════
--
-- Every migration that (re)defines muse_booking_payments in this repo
-- (MUSE_SCHEMA_FULL_20260813.sql, MUSE_REFERRALS_CONNECT_20260803.sql,
-- MUSE_PASTE_ALL.sql) constrains status to:
--
--   CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded'))
--
-- But src/app/api/webhooks/stripe/route.ts's checkout.session.completed
-- handler writes status: "held" onto this table once a booking-checkout
-- Stripe session completes (see the code for why: it also records
-- stripe_payment_intent in that same UPDATE, which is otherwise only set
-- for the direct create-payment flow). connect/route.ts's own
-- create-booking-checkout/create-payment double-payment guard also checks
-- for status === "held" explicitly.
--
-- If the live table's constraint really does match what's in every SQL
-- file in this repo (unverified from here — I don't have DB access, only
-- static analysis of these files), then every one of those webhook UPDATEs
-- has been failing its CHECK constraint silently: Supabase's JS client
-- doesn't throw on a non-2xx result unless the caller checks `error`, and
-- that call site doesn't. The whole UPDATE is atomic, so on failure
-- stripe_payment_intent ALSO never gets recorded for the checkout-redirect
-- booking flow — meaning complete-booking's later capture attempt has
-- nothing to capture, and the booking can never complete.
--
-- BEFORE RUNNING THIS: confirm in the Supabase dashboard (Table Editor ->
-- muse_booking_payments -> the status column's check constraint, or
-- `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE
-- conrelid = 'muse_booking_payments'::regclass;`) whether 'held' is
-- already allowed. If it is, this is a no-op finding and this file doesn't
-- need running. If it isn't, this widens the constraint additively (no
-- data loss, no existing row can violate a widened set).
--
-- Constraint name assumed to be the Postgres default for an unnamed inline
-- CHECK in a CREATE TABLE (<table>_<column>_check) — verify with the query
-- above if this DROP doesn't find it, and adjust the name accordingly.

ALTER TABLE muse_booking_payments
  DROP CONSTRAINT IF EXISTS muse_booking_payments_status_check;

ALTER TABLE muse_booking_payments
  ADD CONSTRAINT muse_booking_payments_status_check
  CHECK (status IN ('pending', 'held', 'succeeded', 'failed', 'refunded'));
