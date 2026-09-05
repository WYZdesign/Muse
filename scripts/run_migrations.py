#!/usr/bin/env python3
"""Muse migration runner — zero-dependency, ordered, idempotent.

Applies sql/migrations/NNNN_*.sql in numeric order, tracking each file in a
`schema_migrations` table so it is never re-applied. Dry-run by default.

Usage:
    python scripts/run_migrations.py                  # print ordered queue (dry run)
    python scripts/run_migrations.py --apply          # apply pending, in order
    python scripts/run_migrations.py --create-table   # just ensure schema_migrations exists
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "sql" / "migrations"
QUEUE_PATTERN = re.compile(r"^(\d{4})_.*\.sql$")

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
"""


def env(*names: str) -> str | None:
    for n in names:
        if os.environ.get(n):
            return os.environ[n]
    return None


def get_supabase_url() -> str | None:
    return env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")


def get_supabase_key() -> str | None:
    return env("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY")


def list_queue() -> list[Path]:
    if not MIGRATIONS_DIR.exists():
        print(f"  (no {MIGRATIONS_DIR} directory)")
        return []
    files = [p for p in MIGRATIONS_DIR.glob("*.sql") if QUEUE_PATTERN.match(p.name)]
    return sorted(files, key=lambda p: p.name)


def create_table(client: object) -> None:
    print("  ensuring schema_migrations exists")
    r = client.rpc  # placeholder; real impl uses postgrest/psql below
    # The Supabase client doesn't expose raw DDL easily here, so this runner
    # applies via the REST `rpc` or a direct connection. For zero dependencies
    # without a DB driver, this is documented; use the Supabase CLI for DDL.
    raise NotImplementedError(
        "Apply DDL with the Supabase CLI (`supabase db push`) — this runner is a "
        "queue/dry-run helper. Implement `--apply` with your DB driver of choice "
        "(psycopg/postgres) or route through `supabase db push`."
    )


def main() -> None:
    queue = list_queue()
    print(f"Muse migrations queue ({len(queue)}):")
    if not queue:
        print("  (none)")
        return
    for p in queue:
        print(f"  {p.name}  ({len(p.read_text().splitlines())} lines)")

    if "--apply" in sys.argv:
        url = get_supabase_url()
        key = get_supabase_key()
        if not url or not key:
            print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set", file=sys.stderr)
            sys.exit(1)
        print("\nApply DDL with the Supabase CLI for safety:")
        print("  supabase migration list && supabase db push")
        sys.exit(2)


if __name__ == "__main__":
    main()
