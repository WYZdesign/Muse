-- Muse Trust & Safety Infrastructure — Complete Migration
-- Run in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- Created: 2026-08-03
-- Covers: Disclosures, Strikes, Pre-shoot Check-ins, Safety, Prompt Bank, Admin Audit

-- ============================================================
-- 0. VECTOR EXTENSION — needed for embedding similarity search
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. DISCLOSURES — structured booking agreement before shoot
-- ============================================================
-- Triggered when an offer includes payment + nudity/NSFW/non-studio location.
-- Both parties must view and confirm the SAME document.
-- Hard-blocks NSFW+payment combos (inserted with status='blocked').

CREATE TABLE IF NOT EXISTS muse_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  proposer_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,

  -- Compensation
  compensation_amount TEXT NOT NULL DEFAULT '',
  compensation_timing TEXT NOT NULL DEFAULT '',        -- 'before' | 'after' | 'half_upfront'
  compensation_method TEXT NOT NULL DEFAULT '',        -- 'stripe' | 'cash' | 'other'

  -- Content scope (structured checkboxes)
  content_type_nudity BOOLEAN NOT NULL DEFAULT false,
  content_type_artistic_nude BOOLEAN NOT NULL DEFAULT false,
  content_type_boudoir BOOLEAN NOT NULL DEFAULT false,
  content_type_portrait BOOLEAN NOT NULL DEFAULT false,
  content_type_fashion BOOLEAN NOT NULL DEFAULT false,
  content_type_editorial BOOLEAN NOT NULL DEFAULT false,
  content_type_commercial BOOLEAN NOT NULL DEFAULT false,
  content_type_conceptual BOOLEAN NOT NULL DEFAULT false,
  content_type_other BOOLEAN NOT NULL DEFAULT false,
  content_type_other_desc TEXT NOT NULL DEFAULT '',

  -- Explicit boundary checklist (priming/awareness device)
  -- These are shown even when not applicable, to prime vigilance
  boundary_full_nudity BOOLEAN NOT NULL DEFAULT false,
  boundary_implied_nudity BOOLEAN NOT NULL DEFAULT false,
  boundary_partials BOOLEAN NOT NULL DEFAULT false,
  boundary_no_partials BOOLEAN NOT NULL DEFAULT false,
  boundary_explicit_acts BOOLEAN NOT NULL DEFAULT false,
  boundary_penetration BOOLEAN NOT NULL DEFAULT false,
  boundary_no_penetration BOOLEAN NOT NULL DEFAULT false,
  boundary_touching_self BOOLEAN NOT NULL DEFAULT false,
  boundary_touching_other BOOLEAN NOT NULL DEFAULT false,
  boundary_no_touching BOOLEAN NOT NULL DEFAULT false,

  -- Location
  location_type TEXT NOT NULL DEFAULT '',              -- 'certified_studio' | 'private_studio' | 'private_residence' | 'outdoor' | 'other'
  location_address TEXT NOT NULL DEFAULT '',
  location_public BOOLEAN DEFAULT true,

  -- People present
  others_present BOOLEAN NOT NULL DEFAULT false,
  others_count INT NOT NULL DEFAULT 0,
  others_desc TEXT NOT NULL DEFAULT '',                -- e.g. 'makeup artist, assistant'

  -- Terms & acknowledgments
  usage_rights TEXT NOT NULL DEFAULT '',               -- 'portfolio' | 'client' | 'editorial' | 'unlimited' | 'custom'
  usage_custom_desc TEXT NOT NULL DEFAULT '',
  edit_approval_required BOOLEAN NOT NULL DEFAULT false,
  nda_required BOOLEAN NOT NULL DEFAULT false,
  model_release_required BOOLEAN NOT NULL DEFAULT false,

  -- AI-assisted mismatch flag
  ai_flagged BOOLEAN NOT NULL DEFAULT false,
  ai_flag_reason TEXT NOT NULL DEFAULT '',

  -- Status: 'pending_proposer' | 'pending_responder' | 'confirmed' | 'blocked' | 'expired'
  status TEXT NOT NULL DEFAULT 'pending_proposer',
  blocked_reason TEXT NOT NULL DEFAULT '',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  proposer_confirmed_at TIMESTAMPTZ,
  responder_confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_muse_disclosures_proposer ON muse_disclosures(proposer_id);
CREATE INDEX IF NOT EXISTS idx_muse_disclosures_responder ON muse_disclosures(responder_id);
CREATE INDEX IF NOT EXISTS idx_muse_disclosures_booking ON muse_disclosures(booking_id);
CREATE INDEX IF NOT EXISTS idx_muse_disclosures_status ON muse_disclosures(status);

ALTER TABLE muse_disclosures ENABLE ROW LEVEL SECURITY;
-- Both parties can read; service-role manages writes
DROP POLICY IF EXISTS "Disclosure parties can read" ON muse_disclosures;
CREATE POLICY "Disclosure parties can read" ON muse_disclosures FOR SELECT USING (
  proposer_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
  OR responder_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Service manages disclosures" ON muse_disclosures;
CREATE POLICY "Service manages disclosures" ON muse_disclosures FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. STRIKES — enforcement with two escalation tracks
-- ============================================================
-- Track 1 (standard): spam, rudeness, minor guideline issues → graduated
-- Track 2 (high-severity): NSFW solicitation, coercion, assault reports → immediate suspend

CREATE TABLE IF NOT EXISTS muse_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,  -- NULL = auto-system
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'standard',    -- 'standard' | 'high_severity'
  severity TEXT NOT NULL DEFAULT 'warning',     -- 'warning' | 'suspension' | 'permanent_ban'
  suspension_ends_at TIMESTAMPTZ,               -- NULL = permanent
  appeal_status TEXT DEFAULT 'none',            -- 'none' | 'pending' | 'upheld' | 'overturned'
  appeal_text TEXT NOT NULL DEFAULT '',
  appeal_resolved_at TIMESTAMPTZ,
  appeal_resolved_by UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_strikes_user ON muse_strikes(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_strikes_category ON muse_strikes(category);
CREATE INDEX IF NOT EXISTS idx_muse_strikes_severity ON muse_strikes(severity);

ALTER TABLE muse_strikes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own strikes" ON muse_strikes;
CREATE POLICY "Users can view own strikes" ON muse_strikes FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Service manages strikes" ON muse_strikes;
CREATE POLICY "Service manages strikes" ON muse_strikes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. SAFETY PROFILES — trusted contacts & emergency info
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_safety_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  emergency_contact_name TEXT NOT NULL DEFAULT '',
  emergency_contact_phone TEXT NOT NULL DEFAULT '',
  emergency_contact_relation TEXT NOT NULL DEFAULT '',
  trusted_friend_name TEXT NOT NULL DEFAULT '',
  trusted_friend_phone TEXT NOT NULL DEFAULT '',
  trusted_friend_email TEXT NOT NULL DEFAULT '',
  auto_share_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE muse_safety_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own safety profile" ON muse_safety_profiles;
CREATE POLICY "Users manage own safety profile" ON muse_safety_profiles FOR ALL USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- ============================================================
-- 4. SAFETY CHECK-INS — pre-shoot and during-shoot check-ins
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_safety_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  disclosure_id UUID REFERENCES muse_disclosures(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  checkin_type TEXT NOT NULL DEFAULT 'pre_shoot',  -- 'pre_shoot_24h' | 'day_of' | 'during_shoot' | 'post_shoot'
  status TEXT NOT NULL DEFAULT 'pending',          -- 'pending' | 'confirmed' | 'cancelled' | 'no_response'
  notes TEXT NOT NULL DEFAULT '',
  shared_with_contact BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_muse_checkins_user ON muse_safety_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_muse_checkins_booking ON muse_safety_checkins(booking_id);
CREATE INDEX IF NOT EXISTS idx_muse_checkins_status ON muse_safety_checkins(status);

ALTER TABLE muse_safety_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own check-ins" ON muse_safety_checkins;
CREATE POLICY "Users view own check-ins" ON muse_safety_checkins FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Service manages check-ins" ON muse_safety_checkins;
CREATE POLICY "Service manages check-ins" ON muse_safety_checkins FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. SAFETY SHARE LOG — when user shares shoot details with trusted contact
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_safety_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES muse_bookings(id) ON DELETE SET NULL,
  disclosure_id UUID REFERENCES muse_disclosures(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  recipient_phone TEXT NOT NULL DEFAULT '',
  recipient_email TEXT NOT NULL DEFAULT '',
  share_method TEXT NOT NULL DEFAULT 'sms',  -- 'sms' | 'email' | 'link'
  shared_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE muse_safety_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own shares" ON muse_safety_shares;
CREATE POLICY "Users view own shares" ON muse_safety_shares FOR SELECT USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);
DROP POLICY IF EXISTS "Service manages shares" ON muse_safety_shares;
CREATE POLICY "Service manages shares" ON muse_safety_shares FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. ADMIN AUDIT LOG — every admin AI query logged
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES muse_profiles(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  query_result_summary TEXT NOT NULL DEFAULT '',
  result_row_count INT DEFAULT 0,
  tables_accessed TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_admin_audit_admin ON muse_admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_muse_admin_audit_created ON muse_admin_audit_log(created_at DESC);

ALTER TABLE muse_admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Deny all client-side access; service-role only
DROP POLICY IF EXISTS "Admin audit is service-only" ON muse_admin_audit_log;
CREATE POLICY "Admin audit is service-only" ON muse_admin_audit_log
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- ============================================================
-- 7. PROMPT BANK — curated onboarding prompts per category
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_prompt_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,                    -- 'photographer' | 'model' | 'actor' | 'videographer' | 'musician' | 'writer' | 'designer' | 'influencer' | 'general'
  subcategory TEXT NOT NULL DEFAULT '',      -- e.g. 'fashion_photographer', 'portrait_model'
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'single_choice' | 'multi_choice'
  choices JSONB DEFAULT '[]',               -- for single/multi choice prompts
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_prompts_category ON muse_prompt_bank(category, display_order);

ALTER TABLE muse_prompt_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Prompts are public read" ON muse_prompt_bank;
CREATE POLICY "Prompts are public read" ON muse_prompt_bank FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service manages prompts" ON muse_prompt_bank;
CREATE POLICY "Service manages prompts" ON muse_prompt_bank FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. USER PROMPT RESPONSES — answers to prompt bank
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_prompt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES muse_prompt_bank(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL DEFAULT '',
  response_choices JSONB DEFAULT '[]',
  embedding VECTOR(768),                     -- nomic-embed-text output
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_muse_prompt_resp_user ON muse_prompt_responses(user_id);

ALTER TABLE muse_prompt_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own responses" ON muse_prompt_responses;
CREATE POLICY "Users manage own responses" ON muse_prompt_responses FOR ALL USING (
  user_id IN (SELECT id FROM muse_profiles WHERE auth_id = auth.uid())
);

-- ============================================================
-- 9. EMBEDDINGS — profile text embeddings for similarity matching
-- ============================================================

CREATE TABLE IF NOT EXISTS muse_profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  embedding_type TEXT NOT NULL DEFAULT 'profile',  -- 'profile' | 'bio' | 'prompt_answer'
  text_source TEXT NOT NULL DEFAULT '',
  embedding VECTOR(768) NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'nomic-embed-text',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, embedding_type)
);

CREATE INDEX IF NOT EXISTS idx_muse_embeddings_user ON muse_profile_embeddings(user_id);

ALTER TABLE muse_profile_embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Embeddings are service-only" ON muse_profile_embeddings;
CREATE POLICY "Embeddings are service-only" ON muse_profile_embeddings
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- ============================================================
-- 10. BOOKING UPDATES — enhanced booking status management
-- ============================================================

ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT '';
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS reschedule_date TEXT DEFAULT '';
ALTER TABLE muse_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 11. PROFILE COMPLETION — track prompt completion percentage
-- ============================================================

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS profile_completion_pct INT DEFAULT 0;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS prompt_completed_at TIMESTAMPTZ;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS emergency_contact_added BOOLEAN DEFAULT false;

-- ============================================================
-- DONE. All trust & safety tables are ready.
-- ============================================================
