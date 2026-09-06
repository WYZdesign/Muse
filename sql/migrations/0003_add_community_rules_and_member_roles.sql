-- 0003_add_community_rules_and_member_roles.sql
-- Community governance visibility: groups can carry a numbered rules list,
-- and each membership row carries a role ('admin' | 'moderator' | 'member')
-- so the member list can show admin/mod badges. Idempotent: safe to re-run.

ALTER TABLE muse_communities ADD COLUMN IF NOT EXISTS rules JSONB NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN muse_communities.rules IS 'Ordered array of {title, body} rule objects shown in the group detail view.';

ALTER TABLE muse_community_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';
COMMENT ON COLUMN muse_community_members.role IS 'Membership role: admin | moderator | member. The community creator is seeded as admin.';
