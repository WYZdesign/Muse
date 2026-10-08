-- 0038: index every foreign key column the advisor reports as unindexed.
--
-- An FK without a supporting index makes the referencing side fast but the
-- referenced side slow: deletes/updates on the parent and joins from the child
-- force a sequential scan. 36 constraints were uncovered. Names follow the
-- existing idx_<table>_<column> convention and IF NOT EXISTS keeps this
-- idempotent. Plain CREATE INDEX (not CONCURRENTLY) because the runner executes
-- this file as a single implicit transaction, and every table here is small.

-- muse_album_likes (user_id)
CREATE INDEX IF NOT EXISTS idx_muse_album_likes_user_id ON public.muse_album_likes (user_id);
-- muse_booking_payments (payee_id)
CREATE INDEX IF NOT EXISTS idx_muse_booking_payments_payee_id ON public.muse_booking_payments (payee_id);
-- muse_booking_payments (payer_id)
CREATE INDEX IF NOT EXISTS idx_muse_booking_payments_payer_id ON public.muse_booking_payments (payer_id);
-- muse_bookings (host_id)
CREATE INDEX IF NOT EXISTS idx_muse_bookings_host_id ON public.muse_bookings (host_id);
-- muse_brief_applications (user_id)
CREATE INDEX IF NOT EXISTS idx_muse_brief_applications_user_id ON public.muse_brief_applications (user_id);
-- muse_call_recording_consents (user_id)
CREATE INDEX IF NOT EXISTS idx_muse_call_recording_consents_user_id ON public.muse_call_recording_consents (user_id);
-- muse_communities (created_by)
CREATE INDEX IF NOT EXISTS idx_muse_communities_created_by ON public.muse_communities (created_by);
-- muse_community_bans (banned_by)
CREATE INDEX IF NOT EXISTS idx_muse_community_bans_banned_by ON public.muse_community_bans (banned_by);
-- muse_community_bans (user_id)
CREATE INDEX IF NOT EXISTS idx_muse_community_bans_user_id ON public.muse_community_bans (user_id);
-- muse_community_join_requests (reviewed_by)
CREATE INDEX IF NOT EXISTS idx_muse_community_join_requests_reviewed_by ON public.muse_community_join_requests (reviewed_by);
-- muse_community_mutes (muted_by)
CREATE INDEX IF NOT EXISTS idx_muse_community_mutes_muted_by ON public.muse_community_mutes (muted_by);
-- muse_community_mutes (user_id)
CREATE INDEX IF NOT EXISTS idx_muse_community_mutes_user_id ON public.muse_community_mutes (user_id);
-- muse_event_rsvps (user_id)
CREATE INDEX IF NOT EXISTS idx_muse_event_rsvps_user_id ON public.muse_event_rsvps (user_id);
-- muse_feed_comments (author_id)
CREATE INDEX IF NOT EXISTS idx_muse_feed_comments_author_id ON public.muse_feed_comments (author_id);
-- muse_feed_comments (post_id)
CREATE INDEX IF NOT EXISTS idx_muse_feed_comments_post_id ON public.muse_feed_comments (post_id);
-- muse_forum_comments (author_id)
CREATE INDEX IF NOT EXISTS idx_muse_forum_comments_author_id ON public.muse_forum_comments (author_id);
-- muse_forum_comments (post_id)
CREATE INDEX IF NOT EXISTS idx_muse_forum_comments_post_id ON public.muse_forum_comments (post_id);
-- muse_forum_posts (author_id)
CREATE INDEX IF NOT EXISTS idx_muse_forum_posts_author_id ON public.muse_forum_posts (author_id);
-- muse_forum_replies (user_id)
CREATE INDEX IF NOT EXISTS idx_muse_forum_replies_user_id ON public.muse_forum_replies (user_id);
-- muse_matches (target_id)
CREATE INDEX IF NOT EXISTS idx_muse_matches_target_id ON public.muse_matches (target_id);
-- muse_moments (author_id)
CREATE INDEX IF NOT EXISTS idx_muse_moments_author_id ON public.muse_moments (author_id);
-- muse_notifications (from_id)
CREATE INDEX IF NOT EXISTS idx_muse_notifications_from_id ON public.muse_notifications (from_id);
-- muse_profiles (referred_by)
CREATE INDEX IF NOT EXISTS idx_muse_profiles_referred_by ON public.muse_profiles (referred_by);
-- muse_prompt_responses (prompt_id)
CREATE INDEX IF NOT EXISTS idx_muse_prompt_responses_prompt_id ON public.muse_prompt_responses (prompt_id);
-- muse_referral_rewards (recipient_id)
CREATE INDEX IF NOT EXISTS idx_muse_referral_rewards_recipient_id ON public.muse_referral_rewards (recipient_id);
-- muse_referral_rewards (referral_id)
CREATE INDEX IF NOT EXISTS idx_muse_referral_rewards_referral_id ON public.muse_referral_rewards (referral_id);
-- muse_referrals (referee_id)
CREATE INDEX IF NOT EXISTS idx_muse_referrals_referee_id ON public.muse_referrals (referee_id);
-- muse_refund_requests (resolved_by)
CREATE INDEX IF NOT EXISTS idx_muse_refund_requests_resolved_by ON public.muse_refund_requests (resolved_by);
-- muse_reviews (reviewer_id)
CREATE INDEX IF NOT EXISTS idx_muse_reviews_reviewer_id ON public.muse_reviews (reviewer_id);
-- muse_safety_checkins (disclosure_id)
CREATE INDEX IF NOT EXISTS idx_muse_safety_checkins_disclosure_id ON public.muse_safety_checkins (disclosure_id);
-- muse_safety_incidents (reviewer_id)
CREATE INDEX IF NOT EXISTS idx_muse_safety_incidents_reviewer_id ON public.muse_safety_incidents (reviewer_id);
-- muse_safety_shares (booking_id)
CREATE INDEX IF NOT EXISTS idx_muse_safety_shares_booking_id ON public.muse_safety_shares (booking_id);
-- muse_safety_shares (disclosure_id)
CREATE INDEX IF NOT EXISTS idx_muse_safety_shares_disclosure_id ON public.muse_safety_shares (disclosure_id);
-- muse_safety_shares (user_id)
CREATE INDEX IF NOT EXISTS idx_muse_safety_shares_user_id ON public.muse_safety_shares (user_id);
-- muse_strikes (appeal_resolved_by)
CREATE INDEX IF NOT EXISTS idx_muse_strikes_appeal_resolved_by ON public.muse_strikes (appeal_resolved_by);
-- muse_strikes (issued_by)
CREATE INDEX IF NOT EXISTS idx_muse_strikes_issued_by ON public.muse_strikes (issued_by);

-- 36 indexes
