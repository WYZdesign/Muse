-- 0029_tighten_pii_table_policies.sql
--
-- Proactive hardening, same class of bug as 0027. Several PII-bearing tables
-- carried `FOR ALL TO public USING (true)` policies named "Service manages …".
-- They were intended to let the SERVICE ROLE write those tables, but they are
-- granted to `public`, so the anon/publishable key (which ships inside the
-- client bundle) could READ them — and because they are FOR ALL, also
-- INSERT/UPDATE/DELETE.
--   muse_safety_shares : recipient_name, recipient_phone, recipient_email
--   muse_disclosures   : location_address, location_public, compensation_*
-- Both tables are empty today (verified: 0 rows for anon and service), so
-- nothing has leaked yet — but they would the moment they hold data.
-- All app access to them goes through server actions using the service-role
-- client (which bypasses RLS), so removing these public policies is safe.
--
-- Also tightens three INSERT policies that were granted to `public` with NO
-- predicate at all (anon could insert arbitrary rows).

DROP POLICY IF EXISTS "Service manages shares" ON muse_safety_shares;
DROP POLICY IF EXISTS "Service manages disclosures" ON muse_disclosures;

-- muse_community_members: any anon could previously insert a membership row.
DROP POLICY IF EXISTS "Users can join communities" ON muse_community_members;
DROP POLICY IF EXISTS muse_community_members_insert ON muse_community_members;
CREATE POLICY muse_community_members_insert ON muse_community_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));

-- muse_forum_replies: any anon could previously insert a reply.
DROP POLICY IF EXISTS "Users can post replies" ON muse_forum_replies;
DROP POLICY IF EXISTS muse_forum_replies_insert ON muse_forum_replies;
CREATE POLICY muse_forum_replies_insert ON muse_forum_replies
  FOR INSERT TO authenticated
  WITH CHECK (user_id::text IN (SELECT id::text FROM muse_profiles WHERE auth_id = auth.uid()));

-- muse_professionals: any anon could previously insert a directory listing.
DROP POLICY IF EXISTS professionals_upsert ON muse_professionals;
CREATE POLICY professionals_upsert ON muse_professionals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
