-- 014_add_refund_and_dispute_requests.sql
-- Buyer-facing refund/dispute request queue for completed bookings.
-- The booker files a request; Muse (admin/owner) resolves it against Stripe.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS muse_refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES muse_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  amount_cents INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved_refund', 'resolved_declined')),
  resolution_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES muse_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_user ON muse_refund_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_booking ON muse_refund_requests(booking_id, status);
COMMENT ON TABLE muse_refund_requests IS 'Buyer refund/dispute requests; resolved by Muse admin against Stripe.';
