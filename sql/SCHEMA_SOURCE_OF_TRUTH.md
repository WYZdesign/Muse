# Schema source of truth and reconciliation

Status: 2026-10-12, opencode. Evidence in this file is from a LOCAL disposable DB only.

## The authoritative schema is the migration chain

`sql/migrations/0000_baseline.sql` through `sql/migrations/0038_index_foreign_keys.sql`
are the single source of truth for the Muse database schema. `0000_baseline.sql` is the
disposable-DB baseline; `0001`-`0038` are the incremental chain on top of it.

## Superseded: the ad-hoc dumps

The other files directly under `sql/` (including `MUSE_SCHEMA_FULL_20260813.sql`,
`MUSE_APPLY_ALL.sql`, `MUSE_PASTE_ALL.sql`, `muse_complete_schema.sql`, and the dated
`MUSE_*_YYYYMMDD.sql` files) predate the chain (they are Aug/Sep 2026; the chain starts
2026-10-05) and drift from it. **Do not build a fresh DB from them.** They are kept for
history only. The chain is the authority.

## Local validation (2026-10-12, localhost)

A fresh disposable Supabase DB built purely from the chain applied **all 38 migrations
cleanly** (`0000` -> `0038`, no errors), producing:

| Object | Count |
|--------|-------|
| tables | 70 |
| RLS policies | 81 |
| indexes | 131 |

The 81 policies match the RLS de-duplication end state (`0035`-`0037` collapsed
`multiple_permissive_policies`). This confirms the chain is internally consistent and
that a fresh DB built from it is coherent.

Regenerate / reproduce (all localhost):

```
# 1. stage the chain where the CLI looks for it
Copy-Item sql\migrations\*.sql supabase\migrations\ -Force
# 2. bring up the local stack (storage can be excluded; its health check fails on this host)
supabase start -x storage,imgproxy,studio,analytics,vector,edge-runtime
# 3. dump the canonical schema
supabase db dump --local -f _STATE\canonical_schema_from_chain.sql
# 4. tear down
supabase stop
```

A snapshot of the last run is at `_STATE/canonical_schema_from_chain.sql` (gitignored).

## Production reconciliation result (2026-10-12, owner-authorized read)

A read-only introspection of production was run and normalized-diffed against the same
introspection of the local chain build:

| Object | Production | Local chain build |
|--------|-----------|-------------------|
| tables | 68 | 68 |
| columns | 690 | 690 |
| constraints | 210 | 210 |
| indexes | 235 | 235 |
| policies | 81 | 81 |
| functions | 128 | 128 |
| triggers | 1 | 1 |

The **only** differences were 6 lines of Postgres deparse-formatting on three CHECK
constraints (`muse_booking_payments_status_check`, `muse_referral_rewards_reward_type_check`,
`muse_referrals_status_check`): production renders `ANY ((ARRAY[...])::text[])`, the local
build renders `ANY (ARRAY[(...)::text, ...])`. Same constraints, different Postgres
version text. **The production schema is structurally identical to the chain build.**

### The drift is the migration ledger, not the schema

Production `supabase_migrations.schema_migrations` holds **1** row
(`20261004005723` / `0031_harden_internal_function_privileges`); the repo chain has
**39** rows (`0000`-`0038`). The objects are all present in production; only the ledger
under-records them (the naming convention changed from timestamp-prefixed to zero-padded).

Fix: `sql/RECONCILE_MIGRATION_LEDGER.sql` backfills the 39 zero-padded versions into the
ledger so a future `db push` / migrate does not try to re-apply an existing change. It
performs **no schema DDL**. It was validated locally in a rolled-back transaction
(no-op when the rows exist; correctly re-inserts a deleted row; `statements` is nullable
so the two-column insert is valid).

**Status: APPLIED to production 2026-10-12 (owner-authorized).** The ledger went from
1 row to 40 (`0000`-`0038` plus the pre-existing stray `20261004005723` row, left in place
as harmless). Verification after apply: `missing 0000-0038 = []`. No schema change was made
(DML only, on `supabase_migrations.schema_migrations`). Future `db push`/migrate will no
longer try to re-apply an existing change. Do NOT replay `0032`-`0038` as migrations.

