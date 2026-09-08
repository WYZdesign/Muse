-- Migration 007: Travel & availability fields on profiles
-- Adds travel dates, availability status, budget, and travel destinations.

ALTER TABLE muse_profiles
  ADD COLUMN IF NOT EXISTS travel_dates JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS budget_range TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS travel_destinations TEXT[] DEFAULT '{}';

-- Index for filtering by availability status
CREATE INDEX IF NOT EXISTS idx_profiles_availability
  ON muse_profiles (availability_status)
  WHERE availability_status != 'unavailable';

-- Index for filtering by travel destinations
CREATE INDEX IF NOT EXISTS idx_profiles_travel_dest
  ON muse_profiles USING GIN (travel_destinations);