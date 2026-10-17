#!/usr/bin/env python3
"""Muse migration runner — ordered, idempotent, tracked in `schema_migrations`.

Applies sql/migrations/NNNN_*.sql in numeric order, recording each file in a
`schema_migrations` table so it is never re-applied. Dry-run by default.

Usage:
    python scripts/run_migrations.py                  # print ordered queue (dry run)
    python scripts/run_migrations.py --apply          # apply pending, in order
    python scripts/run_migrations.py --create-table   # just ensure schema_migrations exists

Connection: prefers a Postgres DSN from the first of
    DATABASE_URL / SUPABASE_DB_URL / MUSE_DATABASE_URL
(a Supabase pooler/direct URL with the DB password — NOT the service_role JWT).

When a DSN is intentionally unavailable, the runner can use the Supabase
Management API with both SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF set.
The Management path applies each migration and records its ledger entry in one
database transaction, so it cannot repeat the old manual-DDL/manual-ledger
split. Use --backend dsn or --backend management to require one path; default
auto prefers DSN and falls back to Management API.
"""
from __future__ import annotations

import os
import re
import sys
import json
import urllib.error
import urllib.request
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "sql" / "migrations"
QUEUE_PATTERN = re.compile(r"^(\d{4})_.*\.sql$")

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
"""

MANAGEMENT_API_BASE = "https://api.supabase.com/v1/projects"


def env(*names: str) -> str | None:
    for n in names:
        if os.environ.get(n):
            return os.environ[n]
    return None


def get_dsn() -> str | None:
    return env("DATABASE_URL", "SUPABASE_DB_URL", "MUSE_DATABASE_URL")


def management_config() -> tuple[str, str] | None:
    token = env("SUPABASE_ACCESS_TOKEN", "MUSE_SUPABASE_ACCESS_TOKEN")
    project_ref = env("SUPABASE_PROJECT_REF", "MUSE_SUPABASE_PROJECT_REF")
    if not token or not project_ref:
        return None
    return token, project_ref


def requested_backend() -> str:
    try:
        index = sys.argv.index("--backend")
        backend = sys.argv[index + 1]
    except (ValueError, IndexError):
        return "auto"
    if backend not in {"auto", "dsn", "management"}:
        print("ERROR: --backend must be auto, dsn, or management", file=sys.stderr)
        sys.exit(2)
    return backend


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
    # Each migration and its ledger insert must commit or roll back together.
    # Autocommit would let DDL succeed while the later ledger insert failed.
    conn.autocommit = False
    return conn


def management_query(token: str, project_ref: str, query: str) -> object:
    """Run one database statement through Supabase's authenticated API.

    The token is deliberately never included in errors. The endpoint executes
    the whole SQL string server-side, allowing migration SQL and its ledger
    insert to share a transaction.
    """
    body = json.dumps({"query": query}).encode("utf-8")
    request = urllib.request.Request(
        f"{MANAGEMENT_API_BASE}/{project_ref}/database/query",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"Management API returned HTTP {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Management API connection failed: {error.reason}") from error
    try:
        return json.loads(raw) if raw else None
    except json.JSONDecodeError as error:
        raise RuntimeError("Management API returned a non-JSON response") from error


def sql_literal(value: str) -> str:
    """Quote a migration filename for a generated SQL literal."""
    return "'" + value.replace("'", "''") + "'"


def management_transaction(sql: str, filename: str) -> str:
    """Keep DDL and ledger state atomic on the Management API path."""
    return "\n".join((
        "BEGIN;",
        CREATE_TABLE.strip(),
        sql.rstrip(),
        "INSERT INTO schema_migrations (filename) VALUES ("
        + sql_literal(filename) + ") ON CONFLICT (filename) DO NOTHING;",
        "COMMIT;",
    ))


def apply_management(queue: list[Path], token: str, project_ref: str, create_only: bool) -> None:
    management_query(token, project_ref, CREATE_TABLE)
    print("\n  ensured schema_migrations exists (Management API)")
    if create_only:
        return

    rows = management_query(token, project_ref, "SELECT filename FROM schema_migrations")
    applied = {str(row["filename"]) for row in rows or [] if isinstance(row, dict) and "filename" in row}
    print(f"  already applied: {len(applied)}")
    newly = 0
    for path in queue:
        if path.name in applied:
            print(f"  SKIP  {path.name}")
            continue
        try:
            management_query(token, project_ref, management_transaction(path.read_text(encoding="utf-8"), path.name))
        except Exception as error:  # noqa: BLE001
            print(f"  FAIL  {path.name}: {type(error).__name__}: {str(error)[:300]}")
            sys.exit(1)
        newly += 1
        print(f"  OK    {path.name}")
    print(f"\nDone. {newly} applied, {len(queue) - newly} already present.")


def main() -> None:
    # Validate an explicit backend even for a dry run so CI catches a typo
    # before a later operator reaches an apply command.
    backend = requested_backend()
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
    management = management_config()
    if backend == "management" or (backend == "auto" and not dsn and management):
        if not management:
            print("ERROR: set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF for the "
                  "Management API backend.", file=sys.stderr)
            sys.exit(1)
        apply_management(queue, *management, create_only)
        return
    if backend == "dsn" and not dsn:
        print("ERROR: set DATABASE_URL (or SUPABASE_DB_URL / MUSE_DATABASE_URL) to a "
              "Postgres DSN with the DB password.", file=sys.stderr)
        sys.exit(1)
    if not dsn:
        print("ERROR: no migration backend is configured. Set a Postgres DSN, or set "
              "SUPABASE_ACCESS_TOKEN plus SUPABASE_PROJECT_REF for the Management API.", file=sys.stderr)
        sys.exit(1)

    conn = connect(dsn)
    cur = conn.cursor()
    try:
        cur.execute(CREATE_TABLE)
        conn.commit()
    except Exception as error:  # noqa: BLE001
        conn.rollback()
        print(f"ERROR: could not ensure schema_migrations: {type(error).__name__}: {str(error)[:200]}", file=sys.stderr)
        cur.close()
        conn.close()
        sys.exit(1)
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
            conn.commit()
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
