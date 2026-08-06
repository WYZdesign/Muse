# MUSE AUDIT REPORT — 2026-08-01

Four-phase audit: (a) own code audit, (b) frontend/backend/opsec subagent audits, (c) re-audit with live verification, (d) final wrap-up subagent audit. Read-only plus two targeted fixes (both deployed).

---

## ROUND 5 — 2026-08-06 UPDATE (Claude critique items resolved/verified)

### Git/GitHub push — FIXED ✅ (was the blocker Claude could not verify)
- **Root cause of `git push` failure:** remote returned `HTTP 500` because the 6 unpushed commits contained commit `4eb7736`, which added ~3.6GB of original JPGs (some 25MB, e.g. `DANIELLE/Danielle-26.JPG`). Later deleted by the WebP conversion commit (`797062f`), those blobs stayed in history — every push uploaded the whole 3.6GB pack and GitHub rejected it.
- **Fix:** `git reset --soft c34d9b0` + one squashed commit (`8b25d45`) holding only the final tree (1036 WebP files + code). JPG blobs became unreachable → excluded from pack (1095 objects). Then `chore` commit `37a7702` gitignores `tsconfig.tsbuildinfo` + unreferenced `*_pp.webp` previews.
- **Verified:** local `master` = remote `master` = `37a7702` (via `git ls-remote`). Working tree clean. Claude can `git pull` and see all updates.

### 1. Real Discover data — VERIFIED ✅
- `GET /api/muse?type=profiles` reads `muse_profiles` from Supabase via service client; filters to profiles with `avatar`/`photos`. No mock data. Verified route.ts.

### 2. RLS + sender_id + auth-token chain — PARTIALLY RESOLVED
- **Sender namespace fixed:** `persistMessage()` (muse-realtime.ts:24-50) routes chat writes through the server API (`POST /api/muse action=message`), which resolves the caller's profile id from the Bearer token and stores `sender_id: profile.id` (route.ts:420) — same namespace export/delete-account expect. The old browser-side `getServiceClient()` write path (HIGH #1) is gone.
- **Convo-key IDOR closed:** `match_id` is now derived **server-side** from the verified profile + `toId` (route.ts:417) — a client-supplied `match_id` can no longer target another pair (was HIGH #2).
- `client_msg_id` dedupe (23505 → success) handles retries; rate limit 60/min on message.
- **Browser realtime session fix (new):** `applySession` + email/password `handleAuthClick` now call `supabase.auth.setSession(...)` so the browser realtime channel authenticates as the user — required once RLS `authenticated`-only policies are live, otherwise chat realtime silently dies for email/password users.
- **Still requires Supabase Dashboard (DDL):** RLS is not enabled on live tables; `muse_messages` realtime publication; 9 missing tables; `muse_notifications.text` column. **One consolidated, idempotent, paste-ready script now covers all of it: `sql/MUSE_DASHBOARD_FIX_20260806.sql`** — creates the 9 missing tables (defs only), adds `text`/`target_type`/`UNIQUE(endpoint)` columns, converts chat key columns to TEXT, enables realtime publication, and enables RLS with safe `authenticated`-only policies. Run it in Supabase Dashboard → SQL Editor → Run (safe to re-run). First run hit a Postgres syntax error at the push-subscription constraint (`ADD CONSTRAINT IF NOT EXISTS` is invalid) — fixed with a `pg_constraint`-guarded DO block; re-run the updated file.

### Build verification — PASSED ✅
- `npx tsc --noEmit` clean; `npm run build` (Next 16.2.12, Turbopack) succeeds; `.next/BUILD_ID` created, no errors. Includes swipe-card v2 (portrait-aware hero via `PORTRAIT_IMG`, direct-DOM rAF drag, scroll-fading overlays, portfolio gallery lightbox).

---

## VERIFIED FIXED + DEPLOYED (this session)

| Fix | Commit | Live-verified |
|-----|--------|---------------|
| **Theme system actually works** — `data-theme` was only on the splash `.app` div (the `!hydrated` branch); once hydrated the real app had no `data-theme` so themes never applied. Now set on `document.documentElement` via effect + persisted to `muse_v1`. | `1dd5ace` | Playwright: swatch click → `data-theme="deepsea"`, `--gold`→`#00bcd4`, 5 swatches visible, 0 errors |
| **Login minted no session token** — `/api/muse/auth` `login` returns `{success,user,profile}` but no `access_token`; client stored `""`, so every authed write (profile edit, messages, uploads) silently 401'd for email/password users. Now mints a real session via `supabase.auth.signInWithPassword` after login/register. | `fa2bcae` | Live: minted token → `update-profile` returns 200 |
| **Delete-account confirm path** posted `auth_id` in body but server requires Bearer token → account never actually deleted. Now sends Bearer. | `fa2bcae` | code-verified |
| Passwords reset for `torree.marcel@gmail.com` + `info@wyzdesign.com` | — | both 200 |

---

## 🔴 CRITICAL — need your Supabase Dashboard (I can't run DDL)

1. **9 tables missing on live** (verified via service client, `PGRST205`). Every POST touching them returns 500 and the client shows an optimistic success toast:
   - `muse_sessions`, `muse_blocks`, `muse_connections`, `muse_reports`, `muse_bookings`, `muse_push_subscriptions`, `muse_communities`, `muse_community_members`, `muse_forum_replies`
   - Features currently broken: Connect, Block, Report, Book Session, Join Community, Forum replies, Push notifications, Sessions list, data export (partial).
   - **Fix:** run `sql/MUSE_APPLY_ALL.sql` **selectively** — create ONLY the missing tables. DO NOT run the RLS policy sections of that file (see #3).

2. **`muse_notifications` column drift** — live has `body`/`title` but **no `text`**. API `book-session`/`connect` insert `text:` → those notification rows never write.
   - **Fix:** `ALTER TABLE muse_notifications ADD COLUMN text TEXT DEFAULT '';` (then the code's inserts work). The `CREATE TABLE IF NOT EXISTS` in the migration files won't fix an existing table.

3. **RLS not enabled on ANY live table** — the public anon key (embedded in the browser bundle) can read `muse_profiles` (incl. email), `muse_messages`, `muse_matches`, etc. `sql/rls_policies.sql` was never applied to live.
   - **Fix:** review `sql/rls_policies.sql` carefully — some existing policy files (`MUSE_APPLY_ALL.sql:573-574`, `muse_reports_blocks.sql:32-36`) define **wide-open** `USING(true)`/`WITH CHECK(true)` policies that would *weaken* security. Use `rls_policies.sql` as the base, and:
     - Add `email` column restrictions (any authenticated user can currently `select("*")` and read everyone's email).
     - Only `authenticated` role, never `anon`.

## 🟠 HIGH — code issues found by audit (not yet fixed)

1. **Chat is single-player** — `persistMessage()` uses `getServiceClient()` in the browser (empty key → insert fails), and `sendMsg` (page.tsx:652) discards the boolean. No DB persistence path works from the browser. Realtime needs `supabase` publication enabled on `muse_messages` (Dashboard) + a server-side write path.
2. **IDOR — read/write any conversation by `match_id`** (route.ts:96,321): no participant check. Fix requires participant verification (matches join).
3. **IDOR — delete any upload by path** (upload/route.ts:86): no ownership check on DELETE.
4. **`/api/checkout` doesn't exist** — premium is unpayable (page.tsx:2239 → 404).
5. **`vercel.json` cron → `/api/backup` 404s daily** — dead endpoint.
6. **`sender_id` namespace mismatch** — chat writes auth-uid, server writes profile.id → export/delete-account miss chat rows.
7. **`muse_push_subscriptions` upsert `onConflict:"endpoint"`** — no unique constraint defined anywhere → subscribe always fails.
8. **`muse_reports` insert uses `target_type`** — column exists in no schema file.
9. **`update-password` uses `setSession({refresh_token:""})`** — broken pattern for recovery flow.
10. **Share links 404** — real post/profile IDs aren't in the hardcoded demo arrays in `post/[id]/page.tsx` / `profile/[id]/page.tsx`.
11. **Manifest dedup** — `/manifest.json` (404) vs `/muse-manifest.json` vs `/muse/manifest.json` all referenced.
12. **Mapbox** — public token hardcoded + CSP blocks the map script entirely → map never renders.

## 🟡 MEDIUM

- Optimistic toasts on 500 (report/connect/join/delete-account) — no failure path.
- Rate limiter is per-Vercel-instance, keyed on spoofable `x-forwarded-for`; many actions unthrottled (register, match, sync, connect).
- Legacy duplicate auth endpoints in `route.ts` (register no password-strength check; login returns full session incl. refresh_token; update-profile/delete-account permanently 401 dead code).
- `delete-account` misses: notifications, brief_applications, push_subs, activity_log, forum_replies, host-side bookings.
- `join-community` trusts client `memberCount`; `sync`/`match` create matches to arbitrary targets; `block` upsert no `onConflict`.
- Error messages leak PostgREST internals to clients.
- Matches `target_id(*)` leaks full profile (incl. email) to the match owner.
- Profile discovery serves `mbti/zodiac/life_path/show_nsfw` unauthenticated, no NSFW gating.
- localStorage quota risk (multi-MB data URLs) → silent persistence death; two writers to `muse_v1`.
- Duplicate matches, key collisions (`Date.now()`), stale `doSwipe` closure (`userDefaultIntent` missing dep), state mutation during render.

## ⚪ NOTABLE / NIT

- `MuseAuthProvider.tsx` is dead code (never mounted) — no auth conflict, but its `register` posts always-401 `type:"profile"`.
- sw-muse.js serves stale shell one load after each deploy; pre-caches wrong manifest asset.
- GA gtag blocked by CSP. GA events are no-ops.
- `proxy.ts` glob `muse-*.vercel.app` never matches (literal string in includes). CORS `*` on `/api` in vercel.json.
- `.gitignore` ignores `.env*.local` but not bare `.env`.
- RIFF magic treated as webp (WAV/AVI pass magic check).

---

## ✅ PASSED

- **No XSS/injection**: no `dangerouslySetInnerHTML`, `eval`, `.innerHTML`; all text React-escaped. Upload validation (magic bytes + ext blocklist + 10MB) is solid.
- **No committed secrets**: no `.env*` in git, no service-role key in client bundle, admin emails env-only.
- **Theme cascade**: `[data-theme]` blocks beat `:root` (later, equal specificity) — verified.
- **`[id]` routes** compile under Next 16.2.6, `notFound()` correctly.
- **geocode proxy** well-built (numeric validation, throttle, cache, UA, abort).
- **proxy.ts headers**: nosniff, X-Frame-Options DENY, Referrer-Policy, Cache-Control no-store; CSP/Permissions-Policy/HSTS covered by vercel.json.

---

## SUPABASE DASHBOARD CHECKLIST (for Torreé)

1. **Run `sql/MUSE_DASHBOARD_FIX_20260806.sql`** (one paste) — creates the 9 missing tables, adds `muse_notifications.text` + `target_type` + `UNIQUE(endpoint)`, converts chat key columns to TEXT, enables realtime on `muse_messages`, and enables RLS everywhere with safe `authenticated`-only policies. Idempotent — safe to re-run.
2. **Verify after running** with the file's own verify queries (tables present, `rowsecurity = false` returns no rows, `muse_messages` columns, realtime publication, policies) and `GET /api/muse?type=admin` (stats), then live-test Connect/Report/Block/Book buttons.
3. Optional hardening: rotate JWT secret (forces all stale sessions out), URL-restrict the Mapbox token, delete the dead `/api/backup` cron in vercel.json.
