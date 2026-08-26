-- ═══════════════════════════════════════════════════════════════════════
-- QUEST SYSTEM V2 — Consolidated action keys
-- One key per action family so cumulative tiers (daily→legendary) all
-- progress from a single tracked event. Server-side bumps handle
-- match / session / verification / referral quests.
-- Safe to run after V1: wipes and reseeds muse_quests (user progress
-- rows cascade-delete with them).
-- ═══════════════════════════════════════════════════════════════════════

DELETE FROM muse_quests;

INSERT INTO muse_quests (title, description, category, quest_tier, frequency, action_key, target_count, reward_type, reward_amount, reward_label, icon, color, xp_reward, sort_order) VALUES
-- ─── STARTER ────────────────────────────────────────────────────────────
('Welcome to Muse', 'Complete your profile setup', 'profile', 'starter', 'once', 'complete_profile', 1, 'like', 3, '3 Free Likes', '🎉', '#FFD700', 50, 1),
('First Steps', 'Swipe your first profile', 'discovery', 'starter', 'once', 'first_swipe', 1, 'like', 1, 'Free Like', '👆', '#87CEEB', 10, 2),
('Ice Breaker', 'Send your first message', 'social', 'starter', 'once', 'send_message', 1, 'like', 1, 'Free Like', '💬', '#98FB98', 10, 3),
('First Match', 'Get your first match', 'discovery', 'starter', 'once', 'match', 1, 'super_like', 1, 'Super Like', '💘', '#FF69B4', 25, 4),
('Portfolio Starter', 'Upload your first portfolio photo', 'profile', 'starter', 'once', 'upload_photo', 1, 'like', 2, '2 Free Likes', '📷', '#FFD700', 20, 5),
('Bio Complete', 'Write a bio (50+ characters)', 'profile', 'starter', 'once', 'write_bio', 1, 'like', 1, 'Free Like', '✍️', '#D4A5FF', 15, 6),
('Style Picker', 'Set your creative styles', 'profile', 'starter', 'once', 'set_styles', 1, 'like', 1, 'Free Like', '🎨', '#FF8A80', 10, 7),
('Get Verified', 'Verify your identity', 'profile', 'starter', 'once', 'get_verified', 1, 'boost', 1, 'Free Boost', '✅', '#FFD700', 150, 8),

-- ─── DAILY ──────────────────────────────────────────────────────────────
('Daily Login', 'Open Muse today', 'streaks', 'daily', 'daily', 'login', 1, 'like', 1, 'Free Like', '🔥', '#FF6B35', 5, 10),
('Quick Browse', 'Swipe 5 profiles', 'discovery', 'daily', 'daily', 'swipe', 5, 'like', 1, 'Free Like', '👆', '#87CEEB', 10, 11),
('Say Hello', 'Send 1 message', 'social', 'daily', 'daily', 'send_message', 1, 'like', 1, 'Free Like', '💬', '#98FB98', 10, 12),
('Share Something', 'Post to the Feed', 'content', 'daily', 'daily', 'post_feed', 1, 'like', 1, 'Free Like', '📸', '#FFD700', 15, 13),
('Capture the Moment', 'Post a Moment', 'content', 'daily', 'daily', 'create_moment', 1, 'like', 1, 'Free Like', '✨', '#FF8A80', 15, 14),
('Profile Check', 'Update your profile', 'profile', 'daily', 'daily', 'update_profile', 1, 'like', 1, 'Free Like', '✅', '#98FB98', 10, 15),
('Event Scout', 'View an event', 'community', 'daily', 'daily', 'view_event', 1, 'like', 1, 'Free Like', '🗓️', '#D4A5FF', 5, 16),
('Group Watch', 'View a community group', 'community', 'daily', 'daily', 'view_community', 1, 'like', 1, 'Free Like', '👀', '#87CEEB', 5, 17),

-- ─── WEEKLY ─────────────────────────────────────────────────────────────
('3-Day Streak', 'Log in 3 days this week', 'streaks', 'weekly', 'weekly', 'login_streak', 3, 'super_like', 1, 'Super Like', '⚡', '#FFD700', 30, 20),
('7-Day Warrior', 'Log in every day this week', 'streaks', 'weekly', 'weekly', 'login_streak', 7, 'boost', 1, 'Free Boost', '🚀', '#FF69B4', 75, 21),
('Swipe Storm', 'Swipe 50 profiles this week', 'discovery', 'weekly', 'weekly', 'swipe', 50, 'super_like', 1, 'Super Like', '🌪️', '#87CEEB', 30, 22),
('Match Maker', 'Get 3 matches this week', 'discovery', 'weekly', 'weekly', 'match', 3, 'like', 3, '3 Free Likes', '💘', '#FF69B4', 40, 23),
('Social Butterfly', 'Send 25 messages this week', 'social', 'weekly', 'weekly', 'send_message', 25, 'super_like', 1, 'Super Like', '🦋', '#D4A5FF', 35, 24),
('Feed Star', 'Post 3 times to the Feed', 'content', 'weekly', 'weekly', 'post_feed', 3, 'like', 3, '3 Free Likes', '⭐', '#FFD700', 30, 25),
('Behind the Scenes', 'Share a BTS moment', 'content', 'weekly', 'weekly', 'post_bts', 1, 'super_like', 1, 'Super Like', '🎬', '#FF8A80', 25, 26),
('Forum Voice', 'Post 2 times in the Forum', 'community', 'weekly', 'weekly', 'forum_post', 2, 'like', 2, '2 Free Likes', '💬', '#87CEEB', 25, 27),
('Join the Crew', 'Join a Community group', 'community', 'weekly', 'weekly', 'join_community', 1, 'like', 1, 'Free Like', '🤝', '#98FB98', 20, 28),
('Event Goer', 'RSVP to an event', 'community', 'weekly', 'weekly', 'rsvp_event', 1, 'like', 1, 'Free Like', '🎉', '#FFD700', 20, 29),
('Brief Applicant', 'Apply to a Creative Brief', 'content', 'weekly', 'weekly', 'apply_brief', 1, 'like', 2, '2 Free Likes', '🎯', '#FF8A80', 20, 30),
('Photo Drop', 'Upload a photo to your portfolio', 'profile', 'weekly', 'weekly', 'upload_photo', 1, 'like', 2, '2 Free Likes', '📷', '#FFD700', 15, 31),
('Generous Heart', 'Like 20 profiles this week', 'discovery', 'weekly', 'weekly', 'like_profile', 20, 'like', 2, '2 Free Likes', '🤝', '#87CEEB', 25, 32),
('Chat Champion', 'Send 10 messages this week', 'social', 'weekly', 'weekly', 'send_message', 10, 'like', 2, '2 Free Likes', '🏆', '#FFD700', 30, 33),

-- ─── MONTHLY ────────────────────────────────────────────────────────────
('Monthly Streak', 'Log in 20 days this month', 'streaks', 'monthly', 'monthly', 'login_streak', 20, 'super_like', 3, '3 Super Likes', '🔥', '#FF6B35', 100, 40),
('Discovery Machine', 'Swipe 200 profiles this month', 'discovery', 'monthly', 'monthly', 'swipe', 200, 'super_like', 2, '2 Super Likes', '🤖', '#87CEEB', 80, 41),
('Popular Creator', 'Get 10 matches this month', 'discovery', 'monthly', 'monthly', 'match', 10, 'boost', 1, 'Free Boost', '🌟', '#FF69B4', 100, 42),
('Content Creator', 'Post 10 times to Feed', 'content', 'monthly', 'monthly', 'post_feed', 10, 'super_like', 2, '2 Super Likes', '🎬', '#FFD700', 80, 43),
('Event Explorer', 'RSVP to 3 events', 'community', 'monthly', 'monthly', 'rsvp_event', 3, 'boost', 1, 'Free Boost', '🗺️', '#98FB98', 90, 44),
('Prolific Poster', 'Create 5 Moments', 'content', 'monthly', 'monthly', 'create_moment', 5, 'super_like', 1, 'Super Like', '✨', '#FF8A80', 60, 45),
('Conversation Starter', 'Send 50 messages', 'social', 'monthly', 'monthly', 'send_message', 50, 'super_like', 2, '2 Super Likes', '🗣️', '#D4A5FF', 70, 46),
('Session Booked', 'Book a paid session', 'commerce', 'monthly', 'monthly', 'book_session', 1, 'super_like', 2, '2 Super Likes', '💼', '#FFD700', 100, 47),
('Session Host', 'List a session offering', 'commerce', 'monthly', 'monthly', 'host_session', 1, 'super_like', 2, '2 Super Likes', '🎤', '#FF69B4', 100, 48),
('Forum Regular', 'Post 5 times in the Forum', 'community', 'monthly', 'monthly', 'forum_post', 5, 'like', 5, '5 Free Likes', '📢', '#87CEEB', 60, 49),
('BTS Director', 'Share 3 BTS moments', 'content', 'monthly', 'monthly', 'post_bts', 3, 'super_like', 1, 'Super Like', '🎥', '#FF8A80', 50, 50),
('Brief Completer', 'Apply to 3 Creative Briefs', 'content', 'monthly', 'monthly', 'apply_brief', 3, 'like', 3, '3 Free Likes', '📋', '#D4A5FF', 50, 51),

-- ─── SEASON ─────────────────────────────────────────────────────────────
('Dedicated User', 'Log in 50 days total', 'streaks', 'season', 'lifetime', 'login_streak', 50, 'boost', 1, 'Free Boost', '🏅', '#FFD700', 200, 60),
('Power Swiper', 'Swipe 1000 profiles total', 'discovery', 'season', 'lifetime', 'swipe', 1000, 'super_like', 3, '3 Super Likes', '⚡', '#87CEEB', 150, 61),
('Match Collector', 'Get 50 matches total', 'discovery', 'season', 'lifetime', 'match', 50, 'boost', 2, '2 Free Boosts', '💘', '#FF69B4', 200, 62),
('Content Machine', 'Post 50 times to Feed total', 'content', 'season', 'lifetime', 'post_feed', 50, 'boost', 1, 'Free Boost', '📸', '#FFD700', 150, 63),
('Community Pillar', 'RSVP to 10 events total', 'community', 'season', 'lifetime', 'rsvp_event', 10, 'boost', 1, 'Free Boost', '🏛️', '#98FB98', 150, 64),
('Booking Pro', 'Complete 10 paid sessions', 'commerce', 'season', 'lifetime', 'complete_session', 10, 'boost', 3, '3 Free Boosts', '💰', '#FFD700', 300, 65),
('Host Hero', 'Host 10 completed sessions', 'commerce', 'season', 'lifetime', 'complete_host', 10, 'boost', 3, '3 Free Boosts', '🎤', '#FF69B4', 300, 66),
('Referral Rockstar', 'Refer 5 friends who sign up', 'social', 'season', 'lifetime', 'referral_signup', 5, 'super_like', 5, '5 Super Likes', '🤝', '#98FB98', 250, 67),
('Moment Master', 'Create 20 Moments total', 'content', 'season', 'lifetime', 'create_moment', 20, 'super_like', 2, '2 Super Likes', '✨', '#FF8A80', 150, 68),
('Forum Leader', 'Post 20 times in the Forum', 'community', 'season', 'lifetime', 'forum_post', 20, 'super_like', 2, '2 Super Likes', '📢', '#87CEEB', 150, 69),
('BTS Auteur', 'Share 10 BTS moments total', 'content', 'season', 'lifetime', 'post_bts', 10, 'super_like', 2, '2 Super Likes', '🎥', '#FF8A80', 150, 70),
('Big Swiper', 'Like 500 profiles total', 'discovery', 'season', 'lifetime', 'like_profile', 500, 'super_like', 3, '3 Super Likes', '🤝', '#D4A5FF', 150, 71),

-- ─── LEGENDARY ──────────────────────────────────────────────────────────
('365-Day Legend', 'Log in 365 days total', 'streaks', 'legendary', 'lifetime', 'login_streak', 365, 'superpower', 1, '1 Month Pro Free', '👑', '#FFD700', 1000, 80),
('Swipe Master', 'Swipe 5000 profiles total', 'discovery', 'legendary', 'lifetime', 'swipe', 5000, 'superpower', 1, '1 Month Pro Free', '🌪️', '#87CEEB', 500, 81),
('Century Matcher', 'Get 100 matches total', 'discovery', 'legendary', 'lifetime', 'match', 100, 'superpower', 1, '1 Month Pro Free', '💯', '#FF69B4', 500, 82),
('Content Legend', 'Post 200 times to Feed total', 'content', 'legendary', 'lifetime', 'post_feed', 200, 'superpower', 1, '1 Month Pro Free', '📸', '#FFD700', 500, 83),
('Community Icon', 'RSVP to 50 events total', 'community', 'legendary', 'lifetime', 'rsvp_event', 50, 'superpower', 1, '1 Month Pro Free', '🏛️', '#98FB98', 500, 84),
('Booking Legend', 'Complete 50 paid sessions', 'commerce', 'legendary', 'lifetime', 'complete_session', 50, 'superpower', 2, '2 Months Pro Free', '💰', '#FFD700', 1000, 85),
('Host Legend', 'Host 50 completed sessions', 'commerce', 'legendary', 'lifetime', 'complete_host', 50, 'superpower', 2, '2 Months Pro Free', '🎤', '#FF69B4', 1000, 86),
('Ambassador', 'Refer 20 signed-up friends', 'social', 'legendary', 'lifetime', 'referral_signup', 20, 'superpower', 2, '2 Months Pro Free', '🌍', '#98FB98', 750, 87),
('Muse Pioneer', 'Complete 75 quests total', 'profile', 'legendary', 'lifetime', 'meta_quests', 75, 'superpower', 3, '3 Months Pro Free', '🏆', '#FFD700', 2000, 88),
('Booking Mogul', 'Complete 100 paid sessions', 'commerce', 'legendary', 'lifetime', 'complete_session', 100, 'superpower', 5, '5 Months Pro Free', '💎', '#FFD700', 3000, 89),
('Muse Elite', 'Reach Level 40', 'profile', 'legendary', 'lifetime', 'reach_level', 40, 'superpower', 5, '5 Months Pro Free', '👑', '#FFD700', 5000, 90)
ON CONFLICT (action_key, frequency, target_count) DO NOTHING;
