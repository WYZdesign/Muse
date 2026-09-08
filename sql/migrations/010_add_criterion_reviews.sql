-- 010_add_criterion_reviews.sql
-- Add structured review criteria to muse_reviews for multi-dimensional ratings
-- (communication, reliability, creative_quality, professionalism, safety).
-- Idempotent: safe to re-run.

ALTER TABLE muse_reviews ADD COLUMN IF NOT EXISTS criteria_communication INT CHECK (criteria_communication >= 1 AND criteria_communication <= 5);
ALTER TABLE muse_reviews ADD COLUMN IF NOT EXISTS criteria_reliability INT CHECK (criteria_reliability >= 1 AND criteria_reliability <= 5);
ALTER TABLE muse_reviews ADD COLUMN IF NOT EXISTS criteria_creative_quality INT CHECK (criteria_creative_quality >= 1 AND criteria_creative_quality <= 5);
ALTER TABLE muse_reviews ADD COLUMN IF NOT EXISTS criteria_professionalism INT CHECK (criteria_professionalism >= 1 AND criteria_professionalism <= 5);
ALTER TABLE muse_reviews ADD COLUMN IF NOT EXISTS criteria_safety INT CHECK (criteria_safety >= 1 AND criteria_safety <= 5);

COMMENT ON COLUMN muse_reviews.criteria_communication IS 'Structured criterion: communication (1-5)';
COMMENT ON COLUMN muse_reviews.criteria_reliability IS 'Structured criterion: reliability (1-5)';
COMMENT ON COLUMN muse_reviews.criteria_creative_quality IS 'Structured criterion: creative quality (1-5)';
COMMENT ON COLUMN muse_reviews.criteria_professionalism IS 'Structured criterion: professionalism (1-5)';
COMMENT ON COLUMN muse_reviews.criteria_safety IS 'Structured criterion: safety (1-5)';

-- Profile completion percentage field
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS profile_completion_pct INT DEFAULT 0;
COMMENT ON COLUMN muse_profiles.profile_completion_pct IS 'Computed profile completion percentage (0-100)';
