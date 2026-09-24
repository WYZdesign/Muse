# Bundle B — Formal evidence matrix + blocker list

**Status:** EVIDENCE COMPLETE · type gate + GO cleared · residual open: BLK-MIG-STATE  
**Date:** 2026-09-23  
**From:** Wyzmind (sole integrator)  
**Base SHA:** `b1d3cbd` (see DELIVERY_STATUS)  
**Role:** bundle-specific evidence · **not** deployment approval  

---

## 1. Scope

Deployment/migration/cron/demo-mode readiness evidence requested for release-gate review. This file does **not** authorize push, migrate, Vercel change, or deploy.

---

## 2. Evidence matrix

| # | Claim under test | Evidence | Exact result | Status |
|---|------------------|----------|--------------|--------|
| B1 | Cron schedules registered | `vercel.json` `crons[]` | `/api/backup` `0 6 * * *`; `/api/cron/checkins` `0 8 * * *`; `/api/cron/capture-bookings` `0 */6 * * *`; `/api/cron/purge-deleted-accounts` `30 7 * * *` | **VERIFIED** (file) |
| B2 | Cron routes fail closed without secret | source: `checkins` L7–13, `capture-bookings` L39–43, `purge-deleted-accounts` L24–26, `backup` L16–18 | all: `if (!process.env.CRON_SECRET \|\| authHeader !== expected)` → **401** | **VERIFIED** (source) |
| B3 | Cron unit tests exist (missing/wrong/demo) | `route.test.ts` under `src/app/api/cron/{checkins,capture-bookings,purge-deleted-accounts}` | checkins pattern: missing→401, wrong→401, unset secret→401, demo+valid→200 `{demo:true}` | **VERIFIED** (source) |
| B4 | `backup` route unit test | `src/app/api/backup/route.test.ts` (added 2026-09-23) | missing→401, wrong→401, unset secret→401, demo+valid→200 `{success:true,demo:true}` · **3/3 exit 0** | **VERIFIED** |
| B5 | Local env key names present | `.env.local` key names only (values never read) | includes `CRON_SECRET`, `MUSE_DEMO_MODE` not listed (defaults demo-ON via `demo-mode.ts`), Supabase/Stripe/OpenRouter/Sentry/Mapbox keys present | **VERIFIED** names only; **values UNVERIFIED** |
| B6 | Vercel `CRON_SECRET` set in project | `vercel env ls production` (names only) | `CRON_SECRET` · Encrypted · Preview+Production · created 41d ago | **VERIFIED (2026-09-23)** |
| B7 | Demo mode server truth | `src/lib/demo-mode.ts` L9–17 | default ON unless `MUSE_DEMO_MODE==="false"`; helper returns `{error: "... unavailable in demo mode", code:"DEMO_MODE"}` | **VERIFIED** (source) |
| B8 | Live demo 409 on mutation | `POST /api/muse` action `create-album` body file `{"action":"create-album"}` + Origin `https://muse.wyzdesign.com` + browser UA on local :3000 | **409** `{"error":"This action is unavailable in demo mode","code":"DEMO_MODE"}` · Playwright Demo Mode Negative 9/9 also green this round | **VERIFIED (2026-09-23 Bundle E)** |
| B9 | Migration `0022_secure_album_storage_and_webm.sql` applied to target | file present | applied-state **not** queried against Supabase | **UNVERIFIED** |
| B10 | Migration `0024_add_account_deletion_schedule.sql` applied | file present | applied-state **not** queried | **UNVERIFIED** |
| B11 | Migration runner exists | `scripts/run_migrations.py` | `Test-Path` → **True** | **VERIFIED** (exists); not executed |
| B12 | Migration `0025` (Bundle A) | **on main** as `sql/migrations/0025_add_storage_cleanup_jobs.sql` (merge `0f38ca3`) | **NOT applied to any DB** | **FILE ON MAIN · UNAPPLIED** |
| B13 | `DELIVERY_STATUS.md` current | reconciled to `b1d3cbd` Round 56/57 | matches origin/main | **CURRENT** |
| B14 | CORS origin for API | `vercel.json` headers | `Access-Control-Allow-Origin: https://muse.wyzdesign.com` | **VERIFIED** (file) |
| B15 | CI runtime env parity | `.github/workflows/ci.yml` | job-level `env` has placeholder Supabase/Stripe + `MUSE_DEMO_MODE: 'true'`; `Start server`: `nohup npx next start -p 3000 &` inherits job env | **MOSTLY VERIFIED** — `CRON_SECRET` **not** in CI env (cron tests stub env in-process; live CI server cron routes would 401 without secret — acceptable fail-closed) |

---

## 3. Blocker list (ordered)

| ID | Blocker | Owner | Clears when |
|----|---------|-------|-------------|
| **BLK-TSC** | ~~Cache-free tsc exit 2~~ | Codex | **CLEARED** — tsc exit 0 pre-GO; merged `d8c24d1` |
| **BLK-GO** | ~~Owner has not said `go`~~ | Owner | **CLEARED** — GO 1–7 complete |
| **BLK-MIG-STATE** | 0022 / 0024 / 0025 applied-state unknown on target Supabase | Wyzmind (after DSN/migrate auth) | runner dry-run cannot SELECT applied-state without DSN |
| **BLK-CRON-VERCEL** | ~~Vercel `CRON_SECRET` presence unknown~~ | Wyzmind | **CLEARED** — `vercel env ls` shows CRON_SECRET Encrypted 41d (2026-09-23) |
| **BLK-BACKUP-TEST** | ~~No `backup/route.test.ts`~~ | implementation agent | **CLEARED** — added + 3/3 green (2026-09-23) |
| **BLK-DELIVERY-STALE** | ~~DELIVERY_STATUS stale~~ | Wyzmind | **CLEARED** — reconciled `b1d3cbd` Round 56/57 |
| **BLK-LOCAL-HTTP** | ~~:3000 HTTP timed out~~ | Wyzmind | **CLEARED** — health/muse/landing 200; create-album 409 Bundle E |
| **BLK-0025-MAIN** | ~~0025 not on main~~ | Wyzmind | **CLEARED (file)** — on main via `0f38ca3`; still **UNAPPLIED** to DB |

---

## 4. What is NOT claimed

- No production migration executed (0022/0024/0025 applied-state still UNVERIFIED / UNAPPLIED).
- No Vercel config/env **mutation**; `CRON_SECRET` **presence** verified read-only (value never read).
- No `MUSE_DEMO_MODE=false`.
- Bundle A **is** merged to main (`0f38ca3`); migration 0025 is file-only, unapplied.
- Protected bundle integrated at `5d07bd4` (muse.css, e2e, fixtures, helpers, CODEX handoff).

---

## 5. Verification record

- Revision/worktree: `V:\Muse` @ `b1d3cbd` == origin/main
- Files changed: this document; `src/app/api/backup/route.test.ts` (new prior round)
- Commands: `vercel env ls production` → CRON_SECRET present · tsc **exit 0** · vitest **53/417 exit 0** · eslint page.tsx **exit 0** · `wyz_deploy_check.py b1d3cbd` **READY LIVE** · `/api/health` 200 · migration dry-run queue only (no DSN for applied-state SELECT)
- Browser/mobile: Bundle E matrix in HANDOFF (320/375/390 + chromium)
- Migration/environment/deploy: demo ON; BLK-CRON-VERCEL CLEARED; BLK-MIG-STATE open
- Known remaining: BLK-MIG-STATE
- Next owner/action: **Owner** — supply migrate DSN/auth for 0022/0024/0025 applied-state; assign next bundle?

---

## Heartbeat (2026-09-23 · CRON clear + protected bundle verified)

owner | base `b1d3cbd` | files `BUNDLE_B_EVIDENCE.md`, `DELIVERY_STATUS.md`, `HANDOFF.md` | action: clear BLK-CRON-VERCEL + reconcile Round 56/57 | exact result: HEAD == origin/main == `b1d3cbd`, deploy READY LIVE ✅, health 200, vitest 417/417, tsc 0, CRON_SECRET present in Vercel env | blockers/UNVERIFIED: BLK-MIG-STATE (no DSN) | next owner: **Owner** — migrate DSN/auth; next bundle?
