# Muse Migrations

## Conventions

The legacy `sql/` folder is frozen as "pre-migration" reference (ad-hoc
`MUSE_<FEATURE>_<DATE>.sql` naming, applied by hand into the Supabase SQL editor).
**No new schema changes go there.**

All NEW migrations go here, append-only, numbered, applied in order:

```
sql/migrations/
  0001_add_status_column.sql
  0002_create_muse_album_likes.sql
  ...
```

## Rules

1. **Four-digit, zero-padded number** (`0001_`, `0002_`, ...) — one per file, never
   renumber; append only.
2. **Idempotent where possible** — prefer `ADD COLUMN IF NOT EXISTS`,
   `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING` so a re-run is a no-op.
3. **One migration = one concern** (single table / single column / single index).
4. Filename: `NNNN_<snake_case_what_it_does>.sql`.
5. Tracked in `schema_migrations` (created by the runner) so applied migrations are
   never re-applied.

## Running

```bash
# Dry-run (print the ordered queue, apply nothing)
python scripts/run_migrations.py

# Apply all pending in order against the configured Supabase project
python scripts/run_migrations.py --apply
```

The runner reads the Supabase connection from the existing env vars
(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, or `NEXT_PUBLIC_SUPABASE_URL` +
`SUPABASE_SECRET_KEY`). It records each applied file in `schema_migrations`
(filename, applied_at) and never re-applies a recorded file.

> Prefer the **Supabase CLI** (`supabase migration new` / `supabase db push`) if you
> want migrations run from the CLI against the linked project; this runner exists
> as a zero-dependency alternative for scripted/CI application.
