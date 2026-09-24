# Priority E — Read-only migration audit (0022 / 0024 / 0025)

**Status:** READ-ONLY AUDIT COMPLETE · applied-state still **UNVERIFIED** · **BLK-MIG-STATE OPEN**  
**Date:** 2026-09-24  
**From:** Wyzmind (sole integrator)  
**Base SHA:** `7384624cf6863159413d8c13cb4d52daa82ef34f` (== origin/main at audit start)  
**Hard stop observed:** no migration apply · no `--apply` · no Vercel/Supabase mutation · no prod DSN · no values read from secrets

---

## 1. Scope

ChatGPT queue **Priority E**: read-only audit of `sql/migrations/0022`, `0024`, `0025` file state, consumer code dependencies, and applied-state evidence. This document does **not** authorize migrate, apply, bucket policy change, or schema mutation.

---

## 2. Exact commands + results

| # | Command | Result |
|---|---------|--------|
| E1 | `git -C V:\Muse rev-parse HEAD` / `origin/main` | both `7384624cf6863159413d8c13cb4d52daa82ef34f` |
| E2 | `git fetch origin` | clean (no new tip) |
| E3 | `python V:\Muse\scripts\run_migrations.py` (default = **dry-run**) | queue **26** files `0001`…`0026`; footer `(dry run — pass --apply …)` — **no apply** |
| E4 | env presence only: `DATABASE_URL` / `SUPABASE_DB_URL` / `MUSE_DATABASE_URL` | **DSN_ENV=UNSET** (values never printed/read) |
| E5 | `Test-Path` 0022, 0024, 0025, 0026, `scripts/run_migrations.py` | all **True** |
| E6 | `git ls-files sql/migrations/` | **0001–0025 tracked**; **0026 NOT tracked** (untracked Codex file) |
| E7 | `git merge-base --is-ancestor` introducing commits → HEAD | `95b7544` (0022) · `477862f` (0024) · `0f38ca3` (0025 via Bundle A) · `a504daa` (0025 branch tip) — **all ancestors** |
| E8 | `git show <sha>:sql/migrations/…` for 0022/0024/0025 | file contents present at introducing SHAs (identical header claims to worktree) |
| E9 | consumer grep `src/**` | see §4 dependency table |
| E10 | historical ledger evidence in-repo | Round 48 (`DELIVERY_STATUS.md`): **applied all 15** (`0001`–`0015`), `schema_migrations` **15 rows** on 2026-09-19 — **no later recorded apply** for `0016`–`0026` |

**Not run (by design):** `run_migrations.py --apply`, any SQL against Supabase, `vercel env` mutation, bucket/policy inspection API, `schema_migrations` SELECT (impossible without DSN).

---

## 3. Per-migration file audit

### 3.1 `0022_secure_album_storage_and_webm.sql` (18 lines)

| Aspect | Finding |
|--------|---------|
| File on main | **YES** (tracked; introduced `95b7544`, ancestor of HEAD) |
| Contents | `UPDATE storage.buckets` → `muse-uploads` `file_size_limit=26214400`, MIMEs += `audio/webm`,`video/webm`; `INSERT … muse-private` (private, 10MB, image MIMEs only, `ON CONFLICT DO UPDATE`); `DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects` |
| Idempotent? | **YES** (upsert-style bucket + `DROP POLICY IF EXISTS`) |
| Applied-state | **UNVERIFIED** — no DSN; BUNDLE_B **B9** remains UNVERIFIED |
| Consumers | `upload/route.ts:104` routes `folder=album` → `muse-private`; `albums.ts` / `get.ts` signed URLs on `muse-private`; `purge-deleted-accounts` removes `muse-private` tree; WebM path in upload expects bucket MIME allowlist |
| If NOT applied (code risk) | album uploads / signed URLs fail or land wrong; WebM may be rejected by stale `muse-uploads` allowlist; legacy direct-upload policy may still exist |
| Evidence still required (owner/DSN) | `schema_migrations` row · `storage.buckets` row for `muse-private` (`public=false`) · `muse-uploads` MIME/limit · raw private object URL 401/403 · signed URL after auth · policy list |

### 3.2 `0024_add_account_deletion_schedule.sql` (9 lines)

| Aspect | Finding |
|--------|---------|
| File on main | **YES** (introduced `477862f`, ancestor of HEAD) |
| Contents | `muse_profiles` + `deletion_requested_at`, `deletion_purge_after` (`IF NOT EXISTS`); partial index `muse_profiles_deletion_purge_after_idx` |
| Idempotent? | **YES** |
| Applied-state | **UNVERIFIED** — BUNDLE_B **B10** remains UNVERIFIED |
| Consumers | `profile.ts` `profileDelete` UPDATE both columns; `auth/route.ts` UPDATE + login `ACCOUNT_DELETION_PENDING`; `purge-deleted-accounts` `.not("deletion_requested_at"…)` / `.lte("deletion_purge_after"…)` |
| If NOT applied (code risk) | account-delete / login pending-deletion / purge cron **column-does-not-exist** errors (500s or silent delete-account failure) |
| Evidence still required | `schema_migrations` row · `information_schema.columns` on `muse_profiles` · index exists · disposable schedule sets ≈30d purge · cron selects due rows only after window |

### 3.3 `0025_add_storage_cleanup_jobs.sql` (27 lines)

| Aspect | Finding |
|--------|---------|
| File on main | **YES** (introduced `a504daa`, merge `0f38ca3`, ancestor of HEAD) |
| Contents | `CREATE TABLE IF NOT EXISTS public.muse_storage_cleanup_jobs` (status check `pending\|done\|failed`); status+updated_at index; `ENABLE ROW LEVEL SECURITY` |
| Idempotent? | **YES** |
| Applied-state | **FILE ON MAIN · UNAPPLIED** per BUNDLE_A + BUNDLE_B **B12** — treated as **NOT applied** until DSN proves otherwise; **do not claim applied** |
| Consumers | `albums.ts:123` upsert on failed object deletes; Codex worker `api/cron/storage-cleanup` (untracked) reads/updates table; unit tests mock table |
| If NOT applied (code risk) | failed album object deletes **cannot enqueue** (upsert fails → `queued:false`); worker SELECT/UPDATE fails |
| Evidence still required | `schema_migrations` row · `to_regclass('public.muse_storage_cleanup_jobs')` · RLS enabled + no public policies · disposable enqueue after forced storage remove failure |

### 3.4 Adjacent (not queue-focus, recorded for integrity)

| File | On main? | Applied-state |
|------|----------|---------------|
| `0023_require_call_recording_consent.sql` | YES (`95b7544`) | **UNVERIFIED** (same DSN gap; ChatGPT handoff required apply with 0022) |
| `0016`–`0021` | YES | **No post-Round-48 apply record** in-repo → treat **UNVERIFIED** without DSN |
| `0026_storage_cleanup_worker.sql` | **NO — untracked Codex** | **NOT on main**; dry-run **does list it** (filesystem queue includes untracked file) |

---

## 4. Consumer dependency matrix (source only — not runtime proof)

| Migration object | Source references | Failure mode if object missing |
|------------------|-------------------|--------------------------------|
| bucket `muse-private` | `upload/route.ts`, `albums.ts`, `get.ts`, `purge-deleted-accounts` | upload/sign/remove errors on album privacy path |
| `muse-uploads` WebM MIME + 25MB | `upload/route.ts` WebM branch | bucket rejects `audio/webm` / oversize limit |
| `muse_profiles.deletion_*` | `profile.ts`, `auth/route.ts`, `purge-deleted-accounts` | UPDATE/SELECT column errors |
| `muse_storage_cleanup_jobs` | `albums.ts` enqueue; Codex worker | enqueue/claim fails; retries never durable |
| `next_attempt_at` + `processing` (**0026 only**) | Codex `route.test.ts` TS2339; worker lease SQL | **0025 alone insufficient for Codex worker** — needs 0026 after 0025 |

---

## 5. Applied-state synthesis (honest)

```
0022  file=YES on main     applied=UNVERIFIED   (no DSN; B9 open)
0024  file=YES on main     applied=UNVERIFIED   (no DSN; B10 open)
0025  file=YES on main     applied=UNAPPLIED    (B12 + Bundle A + GO protocol; no DSN contradiction found)
0026  file=UNTRACKED       applied=N/A (not on main; Codex exclusive)
last recorded ledger apply = 0001–0015 only (Round 48, 2026-09-19, 15 rows)
```

**Nothing in this session upgrades 0022/0024 from UNVERIFIED to applied or unapplied.**  
**Nothing downgrades or upgrades 0025 from UNAPPLIED without DSN SELECT.**

---

## 6. Blocker (unchanged)

| ID | Statement | Clears when |
|----|-----------|-------------|
| **BLK-MIG-STATE** | 0022 / 0024 / 0025 applied-state unknown on target Supabase | Owner supplies migrate DSN/auth → runner dry-run + `SELECT filename FROM schema_migrations` + bucket/column inspection; then (only with explicit owner authorize) `--apply` pending files in order |

---

## 7. What is NOT claimed

- No migration executed this session.  
- No production schema/bucket/policy change.  
- No Vercel env/config mutation.  
- No DSN, password, or service-role value read.  
- No “live feature proof” for private albums, 30-day purge, or cleanup outbox.  
- Dry-run queue ≠ applied-state (lists **filesystem** files, including untracked `0026`).

---

## 8. Recommended next owner actions (still not authorized here)

1. **Owner:** provide DSN (`DATABASE_URL` / `SUPABASE_DB_URL` / `MUSE_DATABASE_URL`) or run:  
   `python scripts/run_migrations.py` then (with auth) apply pending + record `schema_migrations`.  
2. Inspect buckets/columns/index/RLS per §3 evidence rows.  
3. Only then authorize `--apply` for `0022` then `0023` then `0024` then `0025` (0026 only after Codex bundle integration decision).  
4. Disposable-DB proof for delete/purge/cleanup before any open-beta claim.

---

## 9. Verification record (this audit)

- Files written: `PRIORITY_E_MIGRATION_AUDIT.md` (new), footers to `HANDOFF.md`, `DELIVERY_STATUS.md`  
- Staged: docs only — **no** Codex exclusives, **no** `muse.css` / `page.tsx` / `vercel.json` / `storage-cleanup/` / `0026` / `_LOGS_dev_*` / `node_modules_broken_bak`  
- Gates for docs-only: path checks + git ancestry + dry-run only (no tsc/eslint delta required; no code touched)  
- Next: **Wyzmind** — Priority F (`src/app/api/muse/**`, cron tests, `contentScan` / `rate-limit`)
