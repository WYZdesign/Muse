-- Reconcile the production supabase_migrations.schema_migrations ledger.
-- Verified 2026-10-12: production schema is structurally identical to a fresh
-- DB built from sql/migrations/0000-0038 (only deparse-formatting differences in the
-- CHECK constraints). Production objects already exist; only the ledger drifted: it
-- records one timestamp-prefixed row while the repo uses zero-padded 0000-0038.
--
-- This backfills the ledger so future db push/migrate does not re-apply an existing
-- change. It performs NO schema DDL. Apply only through the verified workflow, and
-- only after owner approval (production write).

insert into supabase_migrations.schema_migrations (version, name)
values
  ('0000', 'baseline'),
  ('0001', 'init_schema_migrations_and_seed'),
  ('0002', 'add_like_anchor_to_matches'),
  ('0003', 'add_community_rules_and_member_roles'),
  ('0004', 'add_report_resolution_columns'),
  ('0005', 'add_message_requests'),
  ('0006', 'add_nested_forum_threading'),
  ('0007', 'add_travel_availability'),
  ('0008', 'add_community_governance'),
  ('0009', 'add_saved_searches'),
  ('0010', 'add_criterion_reviews'),
  ('0011', 'add_forum_post_moderation'),
  ('0012', 'add_community_join_requests'),
  ('0013', 'add_boost_inventory_and_expiry'),
  ('0014', 'add_refund_and_dispute_requests'),
  ('0015', 'add_photo_likes'),
  ('0016', 'add_voice_video_messages'),
  ('0017', 'add_feed_voice_video'),
  ('0018', 'add_moment_voice_video'),
  ('0019', 'add_calls_log_and_voicemail'),
  ('0020', 'add_request_voice_video'),
  ('0021', 'add_call_recording'),
  ('0022', 'secure_album_storage_and_webm'),
  ('0023', 'require_call_recording_consent'),
  ('0024', 'add_account_deletion_schedule'),
  ('0025', 'add_storage_cleanup_jobs'),
  ('0026', 'storage_cleanup_worker'),
  ('0027', 'lock_down_profile_reads'),
  ('0028', 'fix_album_rls_recursion'),
  ('0029', 'tighten_pii_table_policies'),
  ('0030', 'add_birthdate'),
  ('0031', 'harden_internal_function_privileges'),
  ('0032', 'remove_legacy_permissive_mutation_policies'),
  ('0033', 'app_referenced_columns'),
  ('0034', 'waitlist_referral_codes'),
  ('0035', 'wrap_rls_initplans'),
  ('0036', 'dedupe_permissive_policies'),
  ('0037', 'dedupe_matches_select'),
  ('0038', 'index_foreign_keys')
on conflict (version) do nothing;

-- Optional: the stray pre-rename row can be left in place (harmless) or removed with:
-- delete from supabase_migrations.schema_migrations where version = '20261004005723';
