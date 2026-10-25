#!/usr/bin/env python3
"""Logical dump + restore drill for Muse.

Proves the backup path actually works without touching production data:
for each table it dumps every row to a CSV file, creates a throwaway table in a
temporary schema from the same column layout, restores the CSV into it, then
compares row counts and an id checksum against public.<table>. The scratch
schema is dropped at the end (unless --keep).

It only ever reads public.* and writes inside restore_drill_<timestamp>.

Usage:
  DATABASE_URL=postgres://... python scripts/restore-drill.py
  python scripts/restore-drill.py --from-vault muse_DATABASE_URL
  python scripts/restore-drill.py --tables muse_quests,muse_reports
  python scripts/restore-drill.py --keep

Exit code 0 = every table matched, 1 = any mismatch or error.
"""
import argparse
import os
import sys
import tempfile
import time

DEFAULT_TABLES = [
    "muse_quests",
    "muse_reports",
    "muse_notifications",
    "muse_profiles",
    "muse_feed_posts",
]

# Applied to every table: row count plus a stable id checksum, so a restore
# that silently drops or duplicates rows cannot pass on count alone.
CHECK_SQL = "SELECT count(*), md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')) FROM {schema}.{table}"


def load_url(args) -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    if args.from_vault:
        sys.path.insert(0, os.environ.get("WYZMIND_ROOT", r"W:\WYZ_Command_Center"))
        from wyz_vault import get  # type: ignore

        url = get(args.from_vault)
        if url:
            return url
    raise SystemExit("No database URL. Set DATABASE_URL or pass --from-vault <vault key>.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tables", default=",".join(DEFAULT_TABLES))
    ap.add_argument("--from-vault", default=None)
    ap.add_argument("--keep", action="store_true", help="keep the scratch schema")
    args = ap.parse_args()

    import psycopg2

    tables = [t.strip() for t in args.tables.split(",") if t.strip()]
    schema = "restore_drill_" + time.strftime("%Y%m%d_%H%M%S")
    url = load_url(args)

    conn = psycopg2.connect(url, connect_timeout=30)
    conn.autocommit = True
    failures = 0
    results = []

    try:
        with conn.cursor() as cur:
            cur.execute(f'CREATE SCHEMA "{schema}"')

            for table in tables:
                tmp = os.path.join(tempfile.gettempdir(), f"drill_{schema}_{table}.csv")
                try:
                    cur.execute(CHECK_SQL.format(schema="public", table=table))
                    src = cur.fetchone()
                    if src is None:
                        raise RuntimeError("no source row")

                    started = time.time()
                    with open(tmp, "w", newline="", encoding="utf-8") as fh:
                        cur.copy_expert(
                            f'COPY (SELECT * FROM public."{table}") TO STDOUT WITH (FORMAT csv, HEADER)',
                            fh,
                        )
                    dump_bytes = os.path.getsize(tmp)

                    cur.execute(f'CREATE TABLE "{schema}"."{table}" AS SELECT * FROM public."{table}" WITH NO DATA')
                    with open(tmp, "r", newline="", encoding="utf-8") as fh:
                        cur.copy_expert(
                            f'COPY "{schema}"."{table}" FROM STDIN WITH (FORMAT csv, HEADER)',
                            fh,
                        )

                    cur.execute(CHECK_SQL.format(schema=schema, table=table))
                    dst = cur.fetchone()
                    elapsed = time.time() - started
                    ok = tuple(src) == tuple(dst)
                    failures += 0 if ok else 1
                    results.append(
                        {
                            "table": table,
                            "rows": src[0],
                            "checksum_match": ok,
                            "dump_bytes": dump_bytes,
                            "seconds": round(elapsed, 2),
                        }
                    )
                    print(f"{'PASS' if ok else 'FAIL'} {table}: {src[0]} rows, {dump_bytes} bytes, {elapsed:.2f}s")
                finally:
                    if os.path.exists(tmp):
                        os.remove(tmp)
    finally:
        try:
            with conn.cursor() as cur:
                if args.keep:
                    print(f"\nscratch schema kept: {schema}")
                else:
                    cur.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
        finally:
            conn.close()

    checked = len(results)
    print(f"\nrestore drill: {checked - failures}/{checked} tables verified")
    if failures:
        print("RESULT: FAIL")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
