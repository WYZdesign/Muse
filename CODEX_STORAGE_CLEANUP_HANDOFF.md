# Codex storage-cleanup worker — P0 Bundle

**Status:** PARTIAL — local implementation only; not staged, committed,
deployed, or migrated.

## Scope

- Initial base revision: `a379058`; current local integration base is
  `b0fb457` (Priority-A E2E-only commit). The cleanup files do not overlap
  that commit but all gates must use `b0fb457` or its successor.
- Files owned by this bundle:
  - `sql/migrations/0026_storage_cleanup_worker.sql`
  - `src/app/api/cron/storage-cleanup/route.ts`
  - `src/app/api/cron/storage-cleanup/route.test.ts`
  - `vercel.json`
- The pre-existing page-shell bundle and Wyzmind's E2E files are not part of
  this bundle.

## Reproduced problem

`albumDelete` and `albumRemovePhoto` enqueue failed object deletes into
`muse_storage_cleanup_jobs` (migration 0025), but no repository worker or
schedule consumed those jobs. A failed storage removal could remain pending
forever.

## Change

1. Migration 0026 adds `processing` as a lease state, `next_attempt_at`, and
   a due-job index without altering 0025.
2. New CRON_SECRET-gated `/api/cron/storage-cleanup` route is a demo-mode
   no-op, selects at most 25 due pending jobs, conditionally claims each job,
   validates bucket/path allowlists, removes objects, and marks success done.
3. Failures retry with 5/15/45/135-minute backoff; the fifth failed attempt is
   explicitly marked `failed` as the dead-letter state.
4. `vercel.json` schedules the worker every 15 minutes. Wyzmind must confirm
   that schedule is permitted for the deployed Vercel plan before integration.

## Verification

```text
eslint src/app/api/cron/storage-cleanup/route.ts  -> exit 0
vitest run src/app/api/cron/storage-cleanup/route.test.ts -> 5/5 passed
git diff --check [bundle files] -> exit 0
```

The targeted test covers missing/wrong/unset cron secrets, demo no-op, a
successful removal, and a storage failure returning the job to pending with a
retry timestamp.

```text
tsc --noEmit --incremental false
```

**UNVERIFIED in Codex:** runner reached its 30-second foreground limit without
an exit code. This is not a pass. No local/disposable database migration or
storage operation was run.

`npm run build` reached `✓ Compiled successfully` and completed the configured
post-production compile hook before this runner timed out while Next.js was
running TypeScript. The build therefore remains **UNVERIFIED** (no exit code).

Full E2E was also launched (`Running 1485 tests using 4 workers`) but exceeded
the same 30-second foreground limit before a result. It is **UNVERIFIED**.

## Wyzmind acceptance checklist

1. Review migration 0026 against actual applied state of 0025; do not amend
   production schema without owner authorization.
2. Run cache-free TypeScript, focused/full lint, target/full Vitest, E2E, and
   build on the exact candidate.
3. Verify Vercel cron plan support and `CRON_SECRET` in the intended environment.
4. On a disposable/local database: apply 0025 then 0026; verify unauthenticated
   cron rejection, demo no-op, one-object cleanup, concurrent claim behavior,
   retries/backoff, fifth-attempt dead-letter, and invalid locator rejection.
5. Only then commit/push/deploy; record exact SHA, schedule, migration state,
   live cron/auth smoke, and rollback plan.
