-- 0001_init_schema_migrations_and_seed.sql
-- Example migration following the Muse convention (see sql/migrations/README.md).
-- Idempotent: safe to re-run. Illustrates the numbered, append-only pattern.

-- Ensure the migrations-tracking table exists (created here so a fresh run works).
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
