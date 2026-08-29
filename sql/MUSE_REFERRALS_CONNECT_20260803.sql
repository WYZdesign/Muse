-- ══════════════════════════════════════════════════════════════
-- Muse Referral System + Stripe Connect — 2026-08-03
-- ══════════════════════════════════════════════════════════════

-- Referral codes table
CREATE TABLE IF NOT EXISTS muse_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  referral_code VARCHAR(12) NOT NULL UNIQUE,
  referee_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  referred_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'subscribed', 'reward_issued')),
  reward_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick code lookup
CREATE INDEX IF NOT EXISTS idx_muse_referrals_code ON muse_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_muse_referrals_referrer ON muse_referrals(referrer_id);

-- Referral rewards log
CREATE TABLE IF NOT EXISTS muse_referral_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES muse_referrals(id) ON DELETE CASCADE,
  reward_type VARCHAR(30) NOT NULL CHECK (reward_type IN ('free_month', 'credit')),
  recipient_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER DEFAULT 0,
  stripe_subscription_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe Connect accounts
CREATE TABLE IF NOT EXISTS muse_stripe_connect (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id VARCHAR(100) NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe Connect bookings (marketplace)
CREATE TABLE IF NOT EXISTS muse_booking_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  stripe_payment_intent VARCHAR(100),
  stripe_transfer_id VARCHAR(100),
  amount_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  net_amount_cents INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add referral_code to profiles
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES muse_profiles(id) ON DELETE SET NULL;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS stripe_connect_id VARCHAR(100);

-- Index for referral lookups
CREATE INDEX IF NOT EXISTS idx_muse_profiles_referral_code ON muse_profiles(referral_code);

-- RLS policies
ALTER TABLE muse_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_stripe_connect ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_booking_payments ENABLE ROW LEVEL SECURITY;

-- Referrals: users can see their own referrals
DROP POLICY IF EXISTS "Users see own referrals" ON muse_referrals;
CREATE POLICY "Users see own referrals" ON muse_referrals
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = referrer_id));

-- Referral rewards: users see their own
DROP POLICY IF EXISTS "Users see own rewards" ON muse_referral_rewards;
CREATE POLICY "Users see own rewards" ON muse_referral_rewards
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = recipient_id));

-- Stripe Connect: users see their own
DROP POLICY IF EXISTS "Users see own connect" ON muse_stripe_connect;
CREATE POLICY "Users see own connect" ON muse_stripe_connect
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));

-- Booking payments: participants see
DROP POLICY IF EXISTS "Payers and payees see payments" ON muse_booking_payments;
CREATE POLICY "Payers and payees see payments" ON muse_booking_payments
  FOR SELECT USING (
    auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = payer_id)
    OR auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = payee_id)
  );
