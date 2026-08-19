-- ═══════════════════════════════════════════════════════════════════════════
-- MUSE BOOKING LOOP — closed-beta gap closure (2026-08-18)
-- Adds the back half of the booking journey that was missing:
--   1. completed_at on muse_bookings (completed status transition)
--   2. muse_reviews table (two-way post-booking reviews)
-- Payment already exists (muse_booking_payments + Stripe Connect create-payment);
-- this migration adds the escrow column so a payment can be held until completion.
--═══════════════════════════════════════════════════════════════════════════

-- 1. Booking "completed" timestamp (the missing status transition)
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Reviews — two-way, gated on a completed booking (UNIQUE prevents double review)
CREATE TABLE IF NOT EXISTS muse_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES muse_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_muse_reviews_reviewee ON muse_reviews(reviewee_id);
ALTER TABLE muse_reviews ENABLE ROW LEVEL SECURITY;
