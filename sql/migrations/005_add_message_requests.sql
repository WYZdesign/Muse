-- Message Requests — separate cold-outreach conversations from matched chats
-- Pattern: Hinge/Bumble/LinkedIn InMail style — unmatched users can send a
-- "request to talk" that must be accepted before a real conversation starts.
BEGIN;

CREATE TABLE IF NOT EXISTS muse_message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_from UUID NOT NULL REFERENCES muse_profiles(id),
  request_to UUID NOT NULL REFERENCES muse_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(request_from, request_to)
);

CREATE INDEX IF NOT EXISTS idx_msg_requests_to ON muse_message_requests(request_to);
CREATE INDEX IF NOT EXISTS idx_msg_requests_status ON muse_message_requests(status);

COMMIT;