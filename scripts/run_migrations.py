#!/usr/bin/env python3
"""Muse migration runner — ordered, idempotent, tracked in `schema_migrations`.

Applies sql/migrations/NNNN_*.sql in numeric order, recording each file in a
`schema_migrations` table so it is never re-applied. Dry-run by default.

Usage:
    python scripts/run_migrations.py                  # print ordered queue (dry run)
    python scripts/run_migrations.py --apply          # apply pending, in order
    python scripts/run_migrations.py --create-table   # just ensure schema_migrations exists

Connection: reads a Postgres DSN from the first of
    DATABASE_URL / SUPABASE_DB_URL / MUSE_DATABASE_URL
(a Supabase pooler/direct URL with the DB password — NOT the service_role JWT).
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


def get_dsn() -> str | None:
    return env("DATABASE_URL", "SUPABASE_DB_URL", "MUSE_DATABASE_URL")


def list_queue() -> list[Path]:
    if not MIGRATIONS_DIR.exists():
        print(f"  (no {MIGRATIONS_DIR} directory)")
        return []
    files = [p for p in MIGRATIONS_DIR.glob("*.sql") if QUEUE_PATTERN.match(p.name)]
    return sorted(files, key=lambda p: p.name)


def connect(dsn: str):
    try:
        import psycopg2
    except ImportError:
        print("ERROR: psycopg2 not installed (pip install psycopg2-binary)", file=sys.stderr)
        sys.exit(1)
    conn = psycopg2.connect(dsn, connect_timeout=15)
    conn.autocommit = True
    return conn


def main() -> None:
    queue = list_queue()
    print(f"Muse migrations queue ({len(queue)}):")
    if not queue:
        print("  (none)")
        return
    for p in queue:
        print(f"  {p.name}  ({len(p.read_text().splitlines())} lines)")

    create_only = "--create-table" in sys.argv
    apply = "--apply" in sys.argv

    if not (apply or create_only):
        print("\n(dry run — pass --apply to execute, --create-table to only create the ledger)")
        return

    dsn = get_dsn()
    if not dsn:
        print("ERROR: set DATABASE_URL (or SUPABASE_DB_URL / MUSE_DATABASE_URL) to a "
              "Postgres DSN with the DB password.", file=sys.stderr)
        sys.exit(1)

    conn = connect(dsn)
    cur = conn.cursor()
    cur.execute(CREATE_TABLE)
    print("\n  ensured schema_migrations exists")

    if create_only:
        cur.close()
        conn.close()
        return

    cur.execute("SELECT filename FROM schema_migrations")
    applied = {r[0] for r in cur.fetchall()}
    print(f"  already applied: {len(applied)}")

    newly = 0
    for p in queue:
        if p.name in applied:
            print(f"  SKIP  {p.name}")
            continue
        sql = p.read_text(encoding="utf-8")
        try:
            cur.execute(sql)
            cur.execute(
                "INSERT INTO schema_migrations (filename) VALUES (%s) "
                "ON CONFLICT (filename) DO NOTHING",
                (p.name,),
            )
            newly += 1
            print(f"  OK    {p.name}")
        except Exception as e:  # noqa: BLE001
            try:
                conn.rollback()
            except Exception:
                pass
            print(f"  FAIL  {p.name}: {type(e).__name__}: {str(e)[:200]}")
            cur.close()
            conn.close()
            sys.exit(1)

    cur.close()
    conn.close()
    print(f"\nDone. {newly} applied, {len(queue) - newly} already present.")


if __name__ == "__main__":
    main()
