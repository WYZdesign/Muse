# Index maintenance (unused-index triage)

Measured against production 2026-10-12 (read-only).

## Measurement

| Metric | Value |
|--------|-------|
| public indexes | 235 |
| indexes with `idx_scan = 0` | 165 |
| indexes with `idx_scan > 0` | 70 |
| tables with rows | 27 |
| total live tuples (public) | 1,636 |

Top used indexes confirm the live query paths, for example `idx_msg_requests_status`
(60,080 scans), `muse_rate_limits_pkey` (12,071), `muse_profiles_auth_id_key` (8,447),
`muse_matches_user_id_target_id_key` (3,436).

## Decision: keep every index; drop none

The database is essentially empty during the founding beta (1,636 rows across 27 tables),
so 165 indexes show zero scans only because there is no traffic to exercise them. Most of
those are the FK-support indexes added in `0038` plus unique/PK indexes that guard
correctness. Dropping them would be premature and would degrade the join paths the moment
real traffic arrives.

Re-measure before any drop, once there is representative traffic, with:

```sql
select relname, indexrelname, idx_scan
from pg_stat_user_indexes
where schemaname = 'public'
order by idx_scan asc;
```

Only an index that is (a) non-unique, (b) not backing a constraint, and (c) still at
`idx_scan = 0` under real traffic is a drop candidate, and it must go through a reviewed
migration with rollback notes and the verified workflow.

## Guardrail

`0038_index_foreign_keys.sql` exists specifically so FK lookups do not sequential-scan.
Do not remove those indexes on the strength of a zero count measured on an empty database.
