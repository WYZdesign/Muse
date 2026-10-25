# Restore drill

Proves the database restore path works, without touching production rows.

`scripts/restore-drill.py` dumps every row of the chosen tables to CSV, creates a
scratch table with the same column layout in `restore_drill_<timestamp>`, restores
the CSV into it, and compares row count plus an id checksum against
`public.<table>`. It reads only `public.*`, writes only inside the scratch
schema, and drops that schema at the end.

## Run it

```
DATABASE_URL=postgres://... python scripts/restore-drill.py
python scripts/restore-drill.py --from-vault muse_DATABASE_URL
python scripts/restore-drill.py --tables muse_quests,muse_reports --keep
```

Exit 0 = every table matched. Exit 1 = mismatch or error.

## Last verified run

2026-10-24, against the production database:

```
PASS muse_quests: 99 rows, 18874 bytes, 0.35s
PASS muse_reports: 0 rows, 128 bytes, 0.20s
PASS muse_notifications: 38 rows, 7096 bytes, 0.21s
PASS muse_profiles: 34 rows, 27105 bytes, 0.25s
PASS muse_feed_posts: 6 rows, 1564 bytes, 0.21s
restore drill: 5/5 tables verified
RESULT: PASS
```

A full drill of these tables completes in about 1.2 seconds at the current data
size. Re-run after any schema migration, and before a launch, with the full table
list rather than the default sample.

## What this does not cover

- Restoring onto brand-new infrastructure (this restores within the same database
  cluster). For that, take the Supabase dashboard backup or `pg_dump` and restore
  into a fresh project, then point a preview deploy at it.
- Point-in-time recovery. Supabase's PITR window depends on the plan tier.
- Object storage (avatars, post media). Those live outside the database and are
  not part of this drill.

## Current data size

Muse is early: 34 profiles, 6 feed posts, 99 quests, 0 reports. Capacity has not
been exercised by real usage, so treat any load result as a floor, not a ceiling.
