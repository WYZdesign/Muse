-- ═══════════════════════════════════════════════════════════════════════
-- MUSE ENGAGEMENT QUESTS SYSTEM
-- Weekly + Monthly + Lifetime progression with tiered rewards
-- ═══════════════════════════════════════════════════════════════════════

-- Quest definitions
CREATE TABLE IF NOT EXISTS muse_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,           -- 'discovery','content','community','social','commerce','profile','streaks'
  quest_tier TEXT NOT NULL,         -- 'starter','daily','weekly','monthly','season','legendary'
  frequency TEXT NOT NULL,          -- 'once','daily','weekly','monthly','lifetime'
  action_key TEXT NOT NULL,         -- machine key: 'login','swipe_5','post_feed', etc.
                                    -- NOT unique alone: tiers share keys (post_feed daily+weekly+monthly).
                                    -- Idempotent reseeding via composite unique below.
  target_count INT NOT NULL DEFAULT 1,
  reward_type TEXT NOT NULL,        -- 'like','super_like','boost','pro_day','superpower'
  reward_amount INT NOT NULL DEFAULT 1,
  reward_label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '⭐',
  color TEXT NOT NULL DEFAULT '#FFD700',
  xp_reward INT NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User quest progress
CREATE TABLE IF NOT EXISTS muse_user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES muse_profiles(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES muse_quests(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,         -- 'daily:2026-08-25', 'weekly:2026-W35', 'monthly:2026-08', 'lifetime:all'
  progress INT NOT NULL DEFAULT 0,
  target INT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id, period_key)
);

-- XP / level system
CREATE TABLE IF NOT EXISTS muse_user_xp (
  user_id UUID PRIMARY KEY REFERENCES muse_profiles(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quests_action_key ON muse_quests(action_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quests_key_freq_target ON muse_quests(action_key, frequency, target_count);
CREATE INDEX IF NOT EXISTS idx_user_quests_user_period ON muse_user_quests(user_id, period_key);
CREATE INDEX IF NOT EXISTS idx_user_quests_claimable ON muse_user_quests(completed, claimed) WHERE completed = true AND claimed = false;

-- RLS
ALTER TABLE muse_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE muse_user_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quests public read" ON muse_quests;
CREATE POLICY "Quests public read" ON muse_quests FOR SELECT USING (true);
DROP POLICY IF EXISTS "User quests own read" ON muse_user_quests;
CREATE POLICY "User quests own read" ON muse_user_quests FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));
DROP POLICY IF EXISTS "User quests own update" ON muse_user_quests;
CREATE POLICY "User quests own update" ON muse_user_quests FOR UPDATE USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));
DROP POLICY IF EXISTS "User quests own insert" ON muse_user_quests;
CREATE POLICY "User quests own insert" ON muse_user_quests FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));
DROP POLICY IF EXISTS "User xp own read" ON muse_user_xp;
CREATE POLICY "User xp own read" ON muse_user_xp FOR SELECT USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));
DROP POLICY IF EXISTS "User xp own upsert" ON muse_user_xp;
CREATE POLICY "User xp own upsert" ON muse_user_xp FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));
DROP POLICY IF EXISTS "User xp own update" ON muse_user_xp;
CREATE POLICY "User xp own update" ON muse_user_xp FOR UPDATE USING (auth.uid() = (SELECT auth_id FROM muse_profiles WHERE id = user_id));


-- ═══════════════════════════════════════════════════════════════════════
-- QUEST SEED DATA — Full spectrum from Starter to Legendary
-- ═══════════════════════════════════════════════════════════════════════

-- ─── STARTER (first-time, instant gratification) ───────────────────
INSERT INTO muse_quests (title, description, category, quest_tier, frequency, action_key, target_count, reward_type, reward_amount, reward_label, icon, color, xp_reward, sort_order) VALUES
('Welcome to Muse', 'Complete your profile setup', 'profile', 'starter', 'once', 'complete_profile', 1, 'like', 3, '3 Free Likes', '🎉', '#FFD700', 50, 1),
('First Steps', 'Swipe your first profile on Discover', 'discovery', 'starter', 'once', 'first_swipe', 1, 'like', 1, 'Free Like', '👆', '#87CEEB', 10, 2),
('Ice Breaker', 'Send your first message', 'social', 'starter', 'once', 'first_message', 1, 'like', 1, 'Free Like', '💬', '#98FB98', 10, 3),
('First Match', 'Get your first match', 'discovery', 'starter', 'once', 'first_match', 1, 'super_like', 1, 'Super Like', '💘', '#FF69B4', 25, 4),
('Portfolio Starter', 'Upload your first photo', 'profile', 'starter', 'once', 'upload_photo', 1, 'like', 2, '2 Free Likes', '📷', '#FFD700', 20, 5),
('Bio Complete', 'Write your bio (50+ characters)', 'profile', 'starter', 'once', 'write_bio', 1, 'like', 1, 'Free Like', '✍️', '#D4A5FF', 15, 6),
('Style Picker', 'Set your creative styles', 'profile', 'starter', 'once', 'set_styles', 1, 'like', 1, 'Free Like', '🎨', '#FF8A80', 10, 7);

-- ─── DAILY (easy daily habits) ─────────────────────────────────────
INSERT INTO muse_quests (title, description, category, quest_tier, frequency, action_key, target_count, reward_type, reward_amount, reward_label, icon, color, xp_reward, sort_order) VALUES
('Daily Login', 'Open Muse today', 'streaks', 'daily', 'daily', 'login', 1, 'like', 1, 'Free Like', '🔥', '#FF6B35', 5, 10),
('Quick Browse', 'Swipe 5 profiles', 'discovery', 'daily', 'daily', 'swipe_5', 5, 'like', 1, 'Free Like', '👆', '#87CEEB', 10, 11),
('Say Hello', 'Send 1 message', 'social', 'daily', 'daily', 'send_message', 1, 'like', 1, 'Free Like', '💬', '#98FB98', 10, 12),
('Share Something', 'Post to the Feed', 'content', 'daily', 'daily', 'post_feed', 1, 'like', 1, 'Free Like', '📸', '#FFD700', 15, 13),
('Capture the Moment', 'Post a Moment', 'content', 'daily', 'daily', 'create_moment', 1, 'like', 1, 'Free Like', '✨', '#FF8A80', 15, 14),
('Profile Check', 'Update your profile (name, bio, or avatar)', 'profile', 'daily', 'daily', 'update_profile', 1, 'like', 1, 'Free Like', '✅', '#98FB98', 10, 15),
('Event Scout', 'View an event detail', 'community', 'daily', 'daily', 'view_event', 1, 'like', 1, 'Free Like', '🗓️', '#D4A5FF', 5, 16),
('Group Watch', 'View a community group', 'community', 'daily', 'daily', 'view_community', 1, 'like', 1, 'Free Like', '👀', '#87CEEB', 5, 17);

-- ─── WEEKLY (moderate weekly goals) ────────────────────────────────
INSERT INTO muse_quests (title, description, category, quest_tier, frequency, action_key, target_count, reward_type, reward_amount, reward_label, icon, color, xp_reward, sort_order) VALUES
('3-Day Streak', 'Log in 3 days this week', 'streaks', 'weekly', 'weekly', 'login_streak', 3, 'super_like', 1, 'Super Like', '⚡', '#FFD700', 30, 20),
('7-Day Warrior', 'Log in every day this week', 'streaks', 'weekly', 'weekly', 'login_streak', 7, 'boost', 1, 'Free Boost', '🚀', '#FF69B4', 75, 21),
('Swipe Storm', 'Swipe 50 profiles this week', 'discovery', 'weekly', 'weekly', 'swipe_50', 50, 'super_like', 1, 'Super Like', '🌪️', '#87CEEB', 30, 22),
('Match Maker', 'Get 3 matches this week', 'discovery', 'weekly', 'weekly', 'get_matches', 3, 'like', 3, '3 Free Likes', '💘', '#FF69B4', 40, 23),
('Social Butterfly', 'Message 5 different people', 'social', 'weekly', 'weekly', 'message_unique', 5, 'super_like', 1, 'Super Like', '🦋', '#D4A5FF', 35, 24),
('Feed Star', 'Post 3 times to the Feed', 'content', 'weekly', 'weekly', 'post_feed', 3, 'like', 3, '3 Free Likes', '⭐', '#FFD700', 30, 25),
('Behind the Scenes', 'Post a BTS photo', 'content', 'weekly', 'weekly', 'post_bts', 1, 'super_like', 1, 'Super Like', '🎬', '#FF8A80', 25, 26),
('Forum Voice', 'Post in the Forum', 'community', 'weekly', 'weekly', 'forum_post', 2, 'like', 2, '2 Free Likes', '💬', '#87CEEB', 25, 27),
('Join the Crew', 'Join a Community group', 'community', 'weekly', 'weekly', 'join_community', 1, 'like', 1, 'Free Like', '🤝', '#98FB98', 20, 28),
('Event Goer', 'RSVP to an event', 'community', 'weekly', 'weekly', 'rsvp_event', 1, 'like', 1, 'Free Like', '🎉', '#FFD700', 20, 29),
('Brief Applicant', 'Apply to a Creative Brief', 'content', 'weekly', 'weekly', 'apply_brief', 1, 'like', 2, '2 Free Likes', '🎯', '#FF8A80', 20, 30),
('Photo Drop', 'Upload a photo to your portfolio', 'profile', 'weekly', 'weekly', 'upload_photo', 1, 'like', 2, '2 Free Likes', '📷', '#FFD700', 15, 31),
('Networker', 'Like 20 profiles this week', 'discovery', 'weekly', 'weekly', 'like_20', 20, 'like', 2, '2 Free Likes', '🤝', '#87CEEB', 25, 32),
('Chat Champion', 'Send 10 messages this week', 'social', 'weekly', 'weekly', 'send_message', 10, 'like', 2, '2 Free Likes', '🏆', '#FFD700', 30, 33);

-- ─── MONTHLY (bigger monthly challenges) ───────────────────────────
INSERT INTO muse_quests (title, description, category, quest_tier, frequency, action_key, target_count, reward_type, reward_amount, reward_label, icon, color, xp_reward, sort_order) VALUES
('Monthly Streak', 'Log in 20 days this month', 'streaks', 'monthly', 'monthly', 'login_monthly', 20, 'super_like', 3, '3 Super Likes', '🔥', '#FF6B35', 100, 40),
('Discovery Machine', 'Swipe 200 profiles this month', 'discovery', 'monthly', 'monthly', 'swipe_200', 200, 'super_like', 2, '2 Super Likes', '🤖', '#87CEEB', 80, 41),
('Popular Creator', 'Get 10 matches this month', 'discovery', 'monthly', 'monthly', 'get_matches', 10, 'boost', 1, 'Free Boost', '🌟', '#FF69B4', 100, 42),
('Content Creator', 'Post 10 times to Feed this month', 'content', 'monthly', 'monthly', 'post_feed', 10, 'super_like', 2, '2 Super Likes', '🎬', '#FFD700', 80, 43),
('Community Builder', 'Join 3 groups and RSVP to 3 events', 'community', 'monthly', 'monthly', 'community_active', 6, 'boost', 1, 'Free Boost', '🏗️', '#98FB98', 90, 44),
('Prolific Poster', 'Create 5 Moments this month', 'content', 'monthly', 'monthly', 'create_moment', 5, 'super_like', 1, 'Super Like', '✨', '#FF8A80', 60, 45),
('Conversation Starter', 'Message 15 unique people', 'social', 'monthly', 'monthly', 'message_unique', 15, 'super_like', 2, '2 Super Likes', '🗣️', '#D4A5FF', 70, 46),
('Verified Artist', 'Get identity verified', 'profile', 'monthly', 'once', 'get_verified', 1, 'boost', 2, '2 Free Boosts', '✅', '#FFD700', 150, 47),
('Session Booked', 'Book a paid session', 'commerce', 'monthly', 'monthly', 'book_session', 1, 'super_like', 2, '2 Super Likes', '💼', '#FFD700', 100, 48),
('Session Host', 'Host a paid session', 'commerce', 'monthly', 'monthly', 'host_session', 1, 'super_like', 2, '2 Super Likes', '🎤', '#FF69B4', 100, 49),
('Forum Regular', 'Post 5 times in the Forum', 'community', 'monthly', 'monthly', 'forum_post', 5, 'like', 5, '5 Free Likes', '📢', '#87CEEB', 60, 50),
('BTS Creator', 'Post 3 Behind the Scenes photos', 'content', 'monthly', 'monthly', 'post_bts', 3, 'super_like', 1, 'Super Like', '🎥', '#FF8A80', 50, 51),
('Brief Completer', 'Apply to 3 Creative Briefs', 'content', 'monthly', 'monthly', 'apply_brief', 3, 'like', 3, '3 Free Likes', '📋', '#D4A5FF', 50, 52),
('Social Star', 'Get 50 messages sent this month', 'social', 'monthly', 'monthly', 'send_message', 50, 'super_like', 1, 'Super Like', '⭐', '#FFD700', 60, 53);

-- ─── SEASON (quarterly / long-term goals) ──────────────────────────
INSERT INTO muse_quests (title, description, category, quest_tier, frequency, action_key, target_count, reward_type, reward_amount, reward_label, icon, color, xp_reward, sort_order) VALUES
('Dedicated User', 'Log in 50 days total', 'streaks', 'season', 'lifetime', 'total_logins', 50, 'boost', 1, 'Free Boost', '🏅', '#FFD700', 200, 60),
('Power swiper', 'Swipe 1000 profiles total', 'discovery', 'season', 'lifetime', 'total_swipes', 1000, 'super_like', 3, '3 Super Likes', '⚡', '#87CEEB', 150, 61),
('Match Collector', 'Get 50 matches total', 'discovery', 'season', 'lifetime', 'total_matches', 50, 'boost', 2, '2 Free Boosts', '💘', '#FF69B4', 200, 62),
('Content Machine', 'Post 50 times to Feed total', 'content', 'season', 'lifetime', 'total_feed_posts', 50, 'boost', 1, 'Free Boost', '📸', '#FFD700', 150, 63),
('Community Pillar', 'Join 5 groups and RSVP to 10 events', 'community', 'season', 'lifetime', 'total_community', 15, 'boost', 1, 'Free Boost', '🏛️', '#98FB98', 150, 64),
('Booking Pro', 'Complete 10 paid sessions', 'commerce', 'season', 'lifetime', 'total_sessions_booked', 10, 'boost', 3, '3 Free Boosts', '💰', '#FFD700', 300, 65),
('Host Hero', 'Host 10 paid sessions', 'commerce', 'season', 'lifetime', 'total_sessions_hosted', 10, 'boost', 3, '3 Free Boosts', '🎤', '#FF69B4', 300, 66),
('Referral Rockstar', 'Refer 5 friends who sign up', 'social', 'season', 'lifetime', 'total_referrals', 5, 'super_like', 5, '5 Super Likes', '🤝', '#98FB98', 250, 67),
('Moment Master', 'Create 20 Moments total', 'content', 'season', 'lifetime', 'total_moments', 20, 'super_like', 2, '2 Super Likes', '✨', '#FF8A80', 150, 68),
('Forum Leader', 'Post 20 times in the Forum', 'community', 'season', 'lifetime', 'total_forum_posts', 20, 'super_like', 2, '2 Super Likes', '📢', '#87CEEB', 150, 69),
('BTS Director', 'Post 10 Behind the Scenes photos', 'content', 'season', 'lifetime', 'total_bts', 10, 'super_like', 2, '2 Super Likes', '🎥', '#FF8A80', 150, 70),
('Networker Pro', 'Like 500 profiles total', 'discovery', 'season', 'lifetime', 'total_likes_given', 500, 'super_like', 3, '3 Super Likes', '🤝', '#D4A5FF', 150, 71);

-- ─── LEGENDARY (ultra-hard lifetime achievements) ──────────────────
INSERT INTO muse_quests (title, description, category, quest_tier, frequency, action_key, target_count, reward_type, reward_amount, reward_label, icon, color, xp_reward, sort_order) VALUES
('365-Day Legend', 'Log in 365 days total', 'streaks', 'legendary', 'lifetime', 'total_logins', 365, 'superpower', 1, '1 Month Pro Free', '👑', '#FFD700', 1000, 80),
('Swipe Master', 'Swipe 5000 profiles total', 'discovery', 'legendary', 'lifetime', 'total_swipes', 5000, 'superpower', 1, '1 Month Pro Free', '🌪️', '#87CEEB', 500, 81),
('Century Matcher', 'Get 100 matches total', 'discovery', 'legendary', 'lifetime', 'total_matches', 100, 'superpower', 1, '1 Month Pro Free', '💯', '#FF69B4', 500, 82),
('Content Legend', 'Post 200 times to Feed total', 'content', 'legendary', 'lifetime', 'total_feed_posts', 200, 'superpower', 1, '1 Month Pro Free', '📸', '#FFD700', 500, 83),
('Community Icon', 'Join 10 groups, RSVP 25 events, post 50 forum topics', 'community', 'legendary', 'lifetime', 'total_community_actions', 85, 'superpower', 1, '1 Month Pro Free', '🏛️', '#98FB98', 500, 84),
('Booking Legend', 'Complete 50 paid sessions total', 'commerce', 'legendary', 'lifetime', 'total_sessions_booked', 50, 'superpower', 2, '2 Months Pro Free', '💰', '#FFD700', 1000, 85),
('Host Legend', 'Host 50 paid sessions total', 'commerce', 'legendary', 'lifetime', 'total_sessions_hosted', 50, 'superpower', 2, '2 Months Pro Free', '🎤', '#FF69B4', 1000, 86),
('Ambassador', 'Refer 20 friends who sign up', 'social', 'legendary', 'lifetime', 'total_referrals', 20, 'superpower', 2, '2 Months Pro Free', '🌍', '#98FB98', 750, 87),
('Top Creator', 'Reach 1000 likes received on your profile', 'profile', 'legendary', 'lifetime', 'total_likes_received', 1000, 'superpower', 1, '1 Month Pro Free', '⭐', '#FFD700', 500, 88),
('Muse Pioneer', 'Complete 100 quests total', 'profile', 'legendary', 'lifetime', 'total_quests_completed', 100, 'superpower', 3, '3 Months Pro Free', '🏆', '#FFD700', 2000, 89),
('Booking Mogul', 'Complete 100 paid sessions total', 'commerce', 'legendary', 'lifetime', 'total_sessions_booked', 100, 'superpower', 5, '5 Months Pro Free', '💎', '#FFD700', 3000, 90),
('Muse Elite', 'Reach Level 50', 'profile', 'legendary', 'lifetime', 'reach_level', 50, 'superpower', 5, '5 Months Pro Free', '👑', '#FFD700', 5000, 91)
ON CONFLICT (action_key, frequency, target_count) DO NOTHING;
