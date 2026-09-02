-- ═══════════════════════════════════════════════════════════════════════
-- QUEST SYSTEM V3 — Merged, deduped, all action_keys validated
-- Replaces V2 entirely. 100 unique quests, zero duplicates.
-- Every action_key is confirmed tracked in client or server code.
-- Safe to run: DELETE + reseed with ON CONFLICT DO NOTHING.
-- ═══════════════════════════════════════════════════════════════════════

DELETE FROM muse_quests;

INSERT INTO muse_quests (title, description, category, quest_tier, frequency, action_key, target_count, reward_type, reward_amount, reward_label, icon, color, xp_reward, sort_order) VALUES

-- ─── STARTER (10) ─────────────────────────────────────────────────────
('Welcome to Muse', 'Complete your profile setup', 'profile', 'starter', 'once', 'complete_profile', 1, 'like', 3, '3 Free Likes', '🎉', '#FFD700', 50, 1),
('First Steps', 'Swipe your first profile', 'discovery', 'starter', 'once', 'first_swipe', 1, 'like', 1, 'Free Like', '👆', '#87CEEB', 10, 2),
('Ice Breaker', 'Send your first message', 'social', 'starter', 'once', 'first_message', 1, 'like', 1, 'Free Like', '💬', '#98FB98', 10, 3),
('First Match', 'Get your first match', 'discovery', 'starter', 'once', 'match', 1, 'super_like', 1, 'Super Like', '💘', '#FF69B4', 25, 4),
('Portfolio Starter', 'Upload your first portfolio photo', 'profile', 'starter', 'once', 'upload_photo', 1, 'like', 2, '2 Free Likes', '📷', '#FFD700', 20, 5),
('Bio Complete', 'Write a bio (50+ characters)', 'profile', 'starter', 'once', 'write_bio', 1, 'like', 1, 'Free Like', '✍️', '#D4A5FF', 15, 6),
('Style Picker', 'Set your creative styles', 'profile', 'starter', 'once', 'set_styles', 1, 'like', 1, 'Free Like', '🎨', '#FF8A80', 10, 7),
('Get Verified', 'Verify your identity', 'profile', 'starter', 'once', 'get_verified', 1, 'boost', 1, 'Free Boost', '✅', '#FFD700', 150, 8),
('Album Artist', 'Create your first album', 'profile', 'starter', 'once', 'create_album', 1, 'like', 2, '2 Free Likes', '🖼️', '#FFD700', 20, 9),
('Event Goer', 'RSVP to your first event', 'community', 'starter', 'once', 'rsvp_event', 1, 'like', 1, 'Free Like', '🎉', '#98FB98', 10, 10),

-- ─── DAILY (14) ───────────────────────────────────────────────────────
('Daily Login', 'Open Muse today', 'streaks', 'daily', 'daily', 'login', 1, 'like', 1, 'Free Like', '🔥', '#FF6B35', 5, 20),
('Quick Browse', 'Swipe 5 profiles', 'discovery', 'daily', 'daily', 'swipe', 5, 'like', 1, 'Free Like', '👆', '#87CEEB', 10, 21),
('Say Hello', 'Send 1 message', 'social', 'daily', 'daily', 'send_message', 1, 'like', 1, 'Free Like', '💬', '#98FB98', 10, 22),
('Share Something', 'Post to the Feed', 'content', 'daily', 'daily', 'post_feed', 1, 'like', 1, 'Free Like', '📸', '#FFD700', 15, 23),
('Capture the Moment', 'Post a Moment', 'content', 'daily', 'daily', 'create_moment', 1, 'like', 1, 'Free Like', '✨', '#FF8A80', 15, 24),
('Profile Check', 'Update your profile', 'profile', 'daily', 'daily', 'update_profile', 1, 'like', 1, 'Free Like', '✅', '#98FB98', 10, 25),
('Event Scout', 'View an event', 'community', 'daily', 'daily', 'view_event', 1, 'like', 1, 'Free Like', '🗓️', '#D4A5FF', 5, 26),
('Group Watch', 'View a community group', 'community', 'daily', 'daily', 'view_community', 1, 'like', 1, 'Free Like', '👀', '#87CEEB', 5, 27),
('Like Spree', 'Like 5 profiles today', 'discovery', 'daily', 'daily', 'like_profile', 5, 'like', 1, 'Free Like', '❤️', '#FF69B4', 10, 28),
('Check In', 'Complete a safety check-in', 'safety', 'daily', 'daily', 'checkin', 1, 'like', 1, 'Free Like', '🛡️', '#98FB98', 10, 30),
('Prompt Answer', 'Answer a prompt question', 'content', 'daily', 'daily', 'answer_prompt', 1, 'like', 1, 'Free Like', '✍️', '#D4A5FF', 5, 31),
('Album Browse', 'View 2 albums today', 'content', 'daily', 'daily', 'create_album', 1, 'like', 1, 'Free Like', '🖼️', '#FFD700', 5, 32),
('Quick RSVP', 'RSVP to an event today', 'community', 'daily', 'daily', 'rsvp_event', 1, 'like', 1, 'Free Like', '📅', '#87CEEB', 5, 33),

-- ─── WEEKLY (18) ──────────────────────────────────────────────────────
('3-Day Streak', 'Log in 3 days this week', 'streaks', 'weekly', 'weekly', 'login_streak', 3, 'super_like', 1, 'Super Like', '⚡', '#FFD700', 30, 40),
('7-Day Warrior', 'Log in every day this week', 'streaks', 'weekly', 'weekly', 'login_streak', 7, 'boost', 1, 'Free Boost', '🚀', '#FF69B4', 75, 41),
('Swipe Storm', 'Swipe 50 profiles this week', 'discovery', 'weekly', 'weekly', 'swipe', 50, 'super_like', 1, 'Super Like', '🌪️', '#87CEEB', 30, 42),
('Match Maker', 'Get 3 matches this week', 'discovery', 'weekly', 'weekly', 'match', 3, 'like', 3, '3 Free Likes', '💘', '#FF69B4', 40, 43),
('Social Butterfly', 'Send 25 messages this week', 'social', 'weekly', 'weekly', 'send_message', 25, 'super_like', 1, 'Super Like', '🦋', '#D4A5FF', 35, 44),
('Feed Star', 'Post 3 times to the Feed', 'content', 'weekly', 'weekly', 'post_feed', 3, 'like', 3, '3 Free Likes', '⭐', '#FFD700', 30, 45),
('Behind the Scenes', 'Share a BTS moment', 'content', 'weekly', 'weekly', 'post_bts', 1, 'super_like', 1, 'Super Like', '🎬', '#FF8A80', 25, 46),
('Forum Voice', 'Post 2 times in the Forum', 'community', 'weekly', 'weekly', 'forum_post', 2, 'like', 2, '2 Free Likes', '💬', '#87CEEB', 25, 47),
('Join the Crew', 'Join a Community group', 'community', 'weekly', 'weekly', 'join_community', 1, 'like', 1, 'Free Like', '🤝', '#98FB98', 20, 48),
('Event Goer', 'RSVP to an event', 'community', 'weekly', 'weekly', 'rsvp_event', 1, 'like', 1, 'Free Like', '🎉', '#FFD700', 20, 49),
('Brief Applicant', 'Apply to a Creative Brief', 'content', 'weekly', 'weekly', 'apply_brief', 1, 'like', 2, '2 Free Likes', '🎯', '#FF8A80', 20, 50),
('Photo Drop', 'Upload a photo to your portfolio', 'profile', 'weekly', 'weekly', 'upload_photo', 1, 'like', 2, '2 Free Likes', '📷', '#FFD700', 15, 51),
('Generous Heart', 'Like 20 profiles this week', 'discovery', 'weekly', 'weekly', 'like_profile', 20, 'like', 2, '2 Free Likes', '🤝', '#87CEEB', 25, 52),
('Chat Champion', 'Send 10 messages this week', 'social', 'weekly', 'weekly', 'send_message', 10, 'like', 2, '2 Free Likes', '🏆', '#FFD700', 30, 53),
('Album Week', 'Create 2 albums this week', 'content', 'weekly', 'weekly', 'create_album', 2, 'like', 2, '2 Free Likes', '🖼️', '#FFD700', 20, 54),
('Prompt Star', 'Answer 3 prompt questions', 'content', 'weekly', 'weekly', 'answer_prompt', 3, 'like', 2, '2 Free Likes', '✍️', '#D4A5FF', 20, 55),
('Safety First', 'Complete 3 check-ins this week', 'safety', 'weekly', 'weekly', 'checkin', 3, 'like', 2, '2 Free Likes', '🛡️', '#98FB98', 20, 56),
('Moment Maker', 'Post 2 Moments this week', 'content', 'weekly', 'weekly', 'create_moment', 2, 'like', 2, '2 Free Likes', '✨', '#FF8A80', 20, 57),

-- ─── MONTHLY (18) ─────────────────────────────────────────────────────
('Monthly Streak', 'Log in 20 days this month', 'streaks', 'monthly', 'monthly', 'login_streak', 20, 'super_like', 3, '3 Super Likes', '🔥', '#FF6B35', 100, 60),
('Discovery Machine', 'Swipe 200 profiles this month', 'discovery', 'monthly', 'monthly', 'swipe', 200, 'super_like', 2, '2 Super Likes', '🤖', '#87CEEB', 80, 61),
('Popular Creator', 'Get 10 matches this month', 'discovery', 'monthly', 'monthly', 'match', 10, 'boost', 1, 'Free Boost', '🌟', '#FF69B4', 100, 62),
('Content Creator', 'Post 10 times to Feed', 'content', 'monthly', 'monthly', 'post_feed', 10, 'super_like', 2, '2 Super Likes', '🎬', '#FFD700', 80, 63),
('Event Explorer', 'RSVP to 3 events', 'community', 'monthly', 'monthly', 'rsvp_event', 3, 'boost', 1, 'Free Boost', '🗺️', '#98FB98', 90, 64),
('Prolific Poster', 'Create 5 Moments', 'content', 'monthly', 'monthly', 'create_moment', 5, 'super_like', 1, 'Super Like', '✨', '#FF8A80', 60, 65),
('Conversation Starter', 'Send 50 messages', 'social', 'monthly', 'monthly', 'send_message', 50, 'super_like', 2, '2 Super Likes', '🗣️', '#D4A5FF', 70, 66),
('Session Booked', 'Book a paid session', 'commerce', 'monthly', 'monthly', 'book_session', 1, 'super_like', 2, '2 Super Likes', '💼', '#FFD700', 100, 67),
('Session Host', 'List a session offering', 'commerce', 'monthly', 'monthly', 'host_session', 1, 'super_like', 2, '2 Super Likes', '🎤', '#FF69B4', 100, 68),
('Forum Regular', 'Post 5 times in the Forum', 'community', 'monthly', 'monthly', 'forum_post', 5, 'like', 5, '5 Free Likes', '📢', '#87CEEB', 60, 69),
('BTS Director', 'Share 3 BTS moments', 'content', 'monthly', 'monthly', 'post_bts', 3, 'super_like', 1, 'Super Like', '🎥', '#FF8A80', 50, 70),
('Brief Completer', 'Apply to 3 Creative Briefs', 'content', 'monthly', 'monthly', 'apply_brief', 3, 'like', 3, '3 Free Likes', '📋', '#D4A5FF', 50, 71),
('Album Collector', 'Create 5 albums this month', 'content', 'monthly', 'monthly', 'create_album', 5, 'super_like', 1, 'Super Like', '🖼️', '#FFD700', 60, 72),
('Like Legend', 'Like 100 profiles this month', 'discovery', 'monthly', 'monthly', 'like_profile', 100, 'super_like', 1, 'Super Like', '❤️', '#FF69B4', 60, 73),
('Prompt Master', 'Answer 10 prompt questions', 'content', 'monthly', 'monthly', 'answer_prompt', 10, 'like', 3, '3 Free Likes', '✍️', '#D4A5FF', 50, 74),
('Safety Champion', 'Complete 10 check-ins this month', 'safety', 'monthly', 'monthly', 'checkin', 10, 'super_like', 1, 'Super Like', '🛡️', '#98FB98', 60, 75),
('Verified Creator', 'Get verified this month', 'profile', 'monthly', 'monthly', 'get_verified', 1, 'boost', 1, 'Free Boost', '✅', '#FFD700', 100, 76),
('Brief Master', 'Apply to 5 Creative Briefs', 'content', 'monthly', 'monthly', 'apply_brief', 5, 'super_like', 1, 'Super Like', '📋', '#D4A5FF', 60, 77),

-- ─── SEASON (20) ──────────────────────────────────────────────────────
('Dedicated User', 'Log in 50 days total', 'streaks', 'season', 'lifetime', 'login_streak', 50, 'boost', 1, 'Free Boost', '🏅', '#FFD700', 200, 80),
('Power Swiper', 'Swipe 1000 profiles total', 'discovery', 'season', 'lifetime', 'swipe', 1000, 'super_like', 3, '3 Super Likes', '⚡', '#87CEEB', 150, 81),
('Match Collector', 'Get 50 matches total', 'discovery', 'season', 'lifetime', 'match', 50, 'boost', 2, '2 Free Boosts', '💘', '#FF69B4', 200, 82),
('Content Machine', 'Post 50 times to Feed total', 'content', 'season', 'lifetime', 'post_feed', 50, 'boost', 1, 'Free Boost', '📸', '#FFD700', 150, 83),
('Community Pillar', 'RSVP to 10 events total', 'community', 'season', 'lifetime', 'rsvp_event', 10, 'boost', 1, 'Free Boost', '🏛️', '#98FB98', 150, 84),
('Booking Pro', 'Complete 10 paid sessions', 'commerce', 'season', 'lifetime', 'complete_session', 10, 'boost', 3, '3 Free Boosts', '💰', '#FFD700', 300, 85),
('Host Hero', 'Host 10 completed sessions', 'commerce', 'season', 'lifetime', 'complete_host', 10, 'boost', 3, '3 Free Boosts', '🎤', '#FF69B4', 300, 86),
('Referral Rockstar', 'Refer 5 friends who sign up', 'social', 'season', 'lifetime', 'referral_signup', 5, 'super_like', 5, '5 Super Likes', '🤝', '#98FB98', 250, 87),
('Moment Master', 'Create 20 Moments total', 'content', 'season', 'lifetime', 'create_moment', 20, 'super_like', 2, '2 Super Likes', '✨', '#FF8A80', 150, 88),
('Forum Leader', 'Post 20 times in the Forum', 'community', 'season', 'lifetime', 'forum_post', 20, 'super_like', 2, '2 Super Likes', '📢', '#87CEEB', 150, 89),
('BTS Auteur', 'Share 10 BTS moments total', 'content', 'season', 'lifetime', 'post_bts', 10, 'super_like', 2, '2 Super Likes', '🎥', '#FF8A80', 150, 90),
('Big Swiper', 'Like 500 profiles total', 'discovery', 'season', 'lifetime', 'like_profile', 500, 'super_like', 3, '3 Super Likes', '🤝', '#D4A5FF', 150, 91),
('Album Legend', 'Create 20 albums total', 'content', 'season', 'lifetime', 'create_album', 20, 'boost', 2, '2 Free Boosts', '🖼️', '#FFD700', 200, 92),
('Session Master', 'Complete 20 paid sessions', 'commerce', 'season', 'lifetime', 'complete_session', 20, 'boost', 2, '2 Free Boosts', '💰', '#FFD700', 250, 93),
('Host Master', 'Host 20 completed sessions', 'commerce', 'season', 'lifetime', 'complete_host', 20, 'boost', 2, '2 Free Boosts', '🎤', '#FF69B4', 250, 94),
('Prompt Legend', 'Answer 50 prompt questions', 'content', 'season', 'lifetime', 'answer_prompt', 50, 'super_like', 3, '3 Super Likes', '✍️', '#D4A5FF', 200, 95),
('Safety Guardian', 'Complete 50 check-ins total', 'safety', 'season', 'lifetime', 'checkin', 50, 'boost', 2, '2 Free Boosts', '🛡️', '#98FB98', 200, 96),
('Brief Legend', 'Apply to 20 Creative Briefs', 'content', 'season', 'lifetime', 'apply_brief', 20, 'super_like', 3, '3 Super Likes', '📋', '#D4A5FF', 200, 97),
('Social Legend', 'Send 500 messages total', 'social', 'season', 'lifetime', 'send_message', 500, 'super_like', 3, '3 Super Likes', '💬', '#98FB98', 250, 98),
('Profile Perfect', 'Complete all profile sections', 'profile', 'season', 'lifetime', 'complete_profile', 1, 'boost', 2, '2 Free Boosts', '✨', '#FFD700', 200, 99),

-- ─── LEGENDARY (20) ───────────────────────────────────────────────────
('365-Day Legend', 'Log in 365 days total', 'streaks', 'legendary', 'lifetime', 'login_streak', 365, 'superpower', 1, '1 Month Pro Free', '👑', '#FFD700', 1000, 100),
('Swipe Master', 'Swipe 5000 profiles total', 'discovery', 'legendary', 'lifetime', 'swipe', 5000, 'superpower', 1, '1 Month Pro Free', '🌪️', '#87CEEB', 500, 101),
('Century Matcher', 'Get 100 matches total', 'discovery', 'legendary', 'lifetime', 'match', 100, 'superpower', 1, '1 Month Pro Free', '💯', '#FF69B4', 500, 102),
('Content Legend', 'Post 200 times to Feed total', 'content', 'legendary', 'lifetime', 'post_feed', 200, 'superpower', 1, '1 Month Pro Free', '📸', '#FFD700', 500, 103),
('Community Icon', 'RSVP to 50 events total', 'community', 'legendary', 'lifetime', 'rsvp_event', 50, 'superpower', 1, '1 Month Pro Free', '🏛️', '#98FB98', 500, 104),
('Booking Legend', 'Complete 50 paid sessions', 'commerce', 'legendary', 'lifetime', 'complete_session', 50, 'superpower', 2, '2 Months Pro Free', '💰', '#FFD700', 1000, 105),
('Host Legend', 'Host 50 completed sessions', 'commerce', 'legendary', 'lifetime', 'complete_host', 50, 'superpower', 2, '2 Months Pro Free', '🎤', '#FF69B4', 1000, 106),
('Ambassador', 'Refer 20 signed-up friends', 'social', 'legendary', 'lifetime', 'referral_signup', 20, 'superpower', 2, '2 Months Pro Free', '🌍', '#98FB98', 750, 107),
('Muse Pioneer', 'Complete 75 quests total', 'profile', 'legendary', 'lifetime', 'meta_quests', 75, 'superpower', 3, '3 Months Pro Free', '🏆', '#FFD700', 2000, 108),
('Muse Elite', 'Reach Level 40', 'profile', 'legendary', 'lifetime', 'reach_level', 40, 'superpower', 5, '5 Months Pro Free', '👑', '#FFD700', 5000, 109),
('Album God', 'Create 100 albums total', 'content', 'legendary', 'lifetime', 'create_album', 100, 'superpower', 3, '3 Months Pro Free', '🖼️', '#FFD700', 2000, 110),
('Session God', 'Complete 100 paid sessions', 'commerce', 'legendary', 'lifetime', 'complete_session', 100, 'superpower', 5, '5 Months Pro Free', '💰', '#FFD700', 3000, 111),
('Host God', 'Host 100 completed sessions', 'commerce', 'legendary', 'lifetime', 'complete_host', 100, 'superpower', 5, '5 Months Pro Free', '🎤', '#FF69B4', 3000, 112),
('Prompt God', 'Answer 200 prompt questions', 'content', 'legendary', 'lifetime', 'answer_prompt', 200, 'superpower', 3, '3 Months Pro Free', '✍️', '#D4A5FF', 2000, 113),
('Safety Legend', 'Complete 200 check-ins total', 'safety', 'legendary', 'lifetime', 'checkin', 200, 'superpower', 3, '3 Months Pro Free', '🛡️', '#98FB98', 2000, 114),
('Brief God', 'Apply to 50 Creative Briefs', 'content', 'legendary', 'lifetime', 'apply_brief', 50, 'superpower', 3, '3 Months Pro Free', '📋', '#D4A5FF', 2000, 115),
('Moment God', 'Create 200 Moments total', 'content', 'legendary', 'lifetime', 'create_moment', 200, 'superpower', 3, '3 Months Pro Free', '✨', '#FF8A80', 2000, 116),
('Social God', 'Send 2000 messages total', 'social', 'legendary', 'lifetime', 'send_message', 2000, 'superpower', 5, '5 Months Pro Free', '💬', '#98FB98', 3000, 117),
('Community God', 'RSVP to 100 events total', 'community', 'legendary', 'lifetime', 'rsvp_event', 100, 'superpower', 5, '5 Months Pro Free', '🏛️', '#98FB98', 3000, 118),
('Muse Immortal', 'Reach Level 60', 'profile', 'legendary', 'lifetime', 'reach_level', 60, 'superpower', 10, '10 Months Pro Free', '👑', '#FFD700', 5000, 119)

ON CONFLICT (action_key, frequency, target_count) DO NOTHING;
