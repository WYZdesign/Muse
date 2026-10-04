# Restore Runbook — Closed Beta

## Current capability, accurately stated

`/api/backup` is a **protected health/checkpoint endpoint**, not a restorable
backup. It authenticates with `CRON_SECRET`, returns table counts, and never
returns message bodies. Its authorization tests pass in source, but it cannot
restore records, Storage, Auth users, or configuration.

## Incident decision tree

1. **Stop harmful writes.** Disable the affected workflow or roll back the
   deployment; do not run ad-hoc delete/update commands.
2. **Preserve evidence.** Record incident time, impacted tables/users, deploy
   SHA, request IDs, and relevant provider logs. Restrict access to incident
   responders.
3. **Classify scope.** Data corruption, accidental deletion, Storage loss,
   Auth/configuration error, or application-only regression.
4. **Choose recovery source.** Supabase platform backup/PITR if available;
   provider export; Storage versioning/export; or a forward-only application
   repair. Never treat `/api/backup` as a data source.
5. **Restore to an isolated target first.** Do not restore directly over the
   live project. Verify schema/migration level and service credentials before
   exposing any endpoint.
6. **Validate.** Compare row counts for the protected route’s 14 tracked
   tables, spot-check relational integrity, test two normal accounts, and
   confirm Storage/Auth consistency without copying production PII into logs.
7. **Cut over deliberately.** Obtain owner approval, place the app in
   maintenance mode if needed, perform the smallest safe recovery, then smoke
   check auth, profile, messages, feed, booking, and deletion flows.
8. **Close out.** Record timestamps, data loss window, validation results,
   incident owner, and corrective tasks.

## Closed-beta readiness gaps

Before broad expansion, record the actual Supabase plan’s backup/PITR
retention, export path, storage recovery path, named owner, and a completed
scratch restore with count/integrity evidence. A scratch project or branch may
have cost implications, so it requires an explicit no-spend-compatible option
or owner approval before execution.
