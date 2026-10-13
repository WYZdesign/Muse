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

## The open reconciliation: production drift

The production migration ledger (`supabase_migrations.schema_migrations`) records only
`20261004005723 0031_harden_internal_function_privileges`, while the repo has `0000`-`0038`
and production already contains objects from the later source migrations. Consequences:

- **Do NOT replay `0032`-`0038`** against production; they are likely already applied but
  unrecorded, so a blind apply can error or double-apply.
- **A fresh reset is not production-equivalent** until this is reconciled.

### Required next step (owner-gated)

Introspect production schema-only and normalized-diff it against the local canonical dump,
then classify every delta (already-applied-but-unrecorded vs genuinely missing) and emit
ONE reviewed reconciliation migration (or backfill the migration ledger). This needs an
explicit go-ahead to read the production database, which has not been given, so it is
**PENDING**. Prod DDL stays owned by opencode/Wyzmind and only through the verified
workflow with role probes and advisors.
