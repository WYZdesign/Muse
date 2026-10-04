# Muses by WYZ — Verified Release Gaps

**Date:** 2026-10-03  
**Method:** current source, current production Supabase read-only inspection,
GitHub deployment status, and the newest delivery/bundle evidence.  
**Purpose:** distinguish verified gaps from historical handoff debt that is
already merged or superseded.

## Immediate release blockers

| Priority | Gap | Verified evidence | Required closure |
| --- | --- | --- |
| P0 | Function hardening migration not applied | `0031_harden_internal_function_privileges.sql` is committed, but production `schema_migrations` ends at `0030_add_birthdate.sql`. Production still exposes internal functions through direct RPC. | Prove on a disposable database that trigger paths and service-client RPCs retain behavior while anon/auth RPCs are denied; then apply 0031 and rerun the Supabase Security Advisor. |
| P0 | Leaked-password protection disabled | Production Supabase Security Advisor reports `auth_leaked_password_protection`. | Enable the Auth dashboard setting and verify registration and password-reset behavior. |
| P0 for real video uploads | No durable video moderation pipeline | `upload/route.ts` returns `VIDEO_UPLOAD_UNAVAILABLE` for video before storage. This is correctly fail-closed, but `contentScan.ts` still has helper-level video APIs without the required quarantine/job/result/promotion lifecycle. | Keep video disabled for closed beta, or build and prove the full private-quarantine durable-job workflow before enabling it. |
| P0 for visual sign-off | External-browser audit unavailable | The requested browser extension was not connected in this session. | Connect the extension and run the existing desktop/mobile screen, modal, and critical-flow matrix on the live build. |

## Verified engineering debt worth scheduling

| Priority | Gap | Evidence | Recommended boundary |
| --- | --- | --- | --- |
| P1 | Partial screen lazy-loading | `page.tsx` lazy-loads Portfolio, BTS, Codex, Subscription, Analytics, Match Guide, and Public Profile. Discover, Feed, Muses, Chat, Collab, Community, Sessions, Studios, Network, Profile, and Settings are still eager imports. | Profile a real production route first; then split one low-risk heavy screen at a time with loading/error boundaries and route tests. Do not use this as a substitute for fixing launch blockers. |
| P1 | RLS access-model documentation | 22 tables have RLS enabled with no policies. This is fail-closed, not automatically a vulnerability, but the intended server-only/user-readable/user-writable model is not recorded table-by-table. | Classify and test each table; add narrow policies only where a client path is intended. |
| P1 | Migration ledger stale | `DELIVERY_STATUS.md` identifies an older verified SHA while newer commits are present locally and on GitHub. `git fetch` is blocked in this environment by `.git/FETCH_HEAD` permissions. | The integrator should refresh the ledger from a machine with Git write access after the next push. |

## Reconciled historical claims

- Claude Code’s available bundles are dated September 12–18. They are not a
  new pending delivery; later merged work supersedes many of their task lists.
- Migrations 0022–0030 are recorded in production, resolving the earlier
  applied-state uncertainty for private storage, deletion scheduling, cleanup
  worker, RLS/PII tightening, and birthdate support.
- The committed Vercel deployment statuses for `3a2d126` and `5602048` are
  successful. A green deployment is build evidence, not proof of the pending
  database migration or interactive UX.

## Deliberately not scheduled as launch blockers

- 100M infrastructure: wait for the LA → Chicago → New York city gates and
  measured transaction demand.
- A paid analytics or monitoring vendor: the current first-party event
  pipeline is sufficient for the controlled LA cohort.
- More `page.tsx` splitting: the controller extraction is complete; any
  additional split should be justified by a measured bundle or interaction
  problem.
# Update — 2026-10-03: migration 0031 applied and verified

Migration `0031_harden_internal_function_privileges` was applied through
Supabase. Post-apply production checks confirm pinned `search_path=public,
pg_temp` for the six targeted functions; anon and authenticated execution is
revoked; service-role execution remains available. The exposed-function advisor
findings fell from eight to the three intentionally public album RLS helpers.
The remaining follow-up is a disposable-database trigger-path test, not an
unapplied production hardening change.

