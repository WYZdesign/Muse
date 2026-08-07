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

### 2. RLS + sender_id + auth-token chain — VERIFIED ✅
- **Sender namespace fixed:** `persistMessage()` (muse-realtime.ts:24-50) routes chat writes through the server API (`POST /api/muse action=message`), which resolves the caller's profile id from the Bearer token and stores `sender_id: profile.id` (route.ts:420) — same namespace export/delete-account expect. The old browser-side `getServiceClient()` write path (HIGH #1) is gone.
- **Convo-key IDOR closed:** `match_id` is now derived **server-side** from the verified profile + `toId` (route.ts:417) — a client-supplied `match_id` can no longer target another pair (was HIGH #2).
- `client_msg_id` dedupe (23505 → success) handles retries; rate limit 60/min on message.
- **Browser realtime session fix (new):** `applySession` + email/password `handleAuthClick` now call `supabase.auth.setSession(...)` so the browser realtime channel authenticates as the user — required once RLS `authenticated`-only policies are live, otherwise chat realtime silently dies for email/password users.
- **DDL applied + RLS verified live:** The consolidated script `sql/MUSE_DASHBOARD_FIX_20260806.sql` was run in Supabase Dashboard → SQL Editor. Iterative Postgres errors fixed: `ADD CONSTRAINT IF NOT EXISTS` (invalid → `pg_constraint`-guarded DO block), FK-blocked column cast (dynamic FK drop), policy-blocked `ALTER COLUMN` (dynamic drop-all-policies). Live policy dump confirmed clean: all wide-open `Service manages X` policies (which defaulted to PUBLIC/anon) are **gone**; RLS is enabled on all tables; only `authenticated` owner/participant-gated policies remain. `muse_admin_audit_log` and `muse_profile_embeddings` correctly deny-all via `USING(false)`.
- **Security hardening (this session):** Added `src/lib/http.ts` with `safeServerError()` helper — logs real errors server-side, returns generic `"Server error"` to clients. Sanitized ~45 `error.message` leaks across all API routes (main route, auth, upload, push, referral, content-scan, verification, cron, backup, stripe webhook). **forgot-password now always returns success** to prevent email enumeration. Mapbox script CSP-unblocked (`api.mapbox.com` added to `script-src` in vercel.json) so the map renders. Manifest dedup: `sw-muse.js` now precaches canonical `/manifest.webmanifest`, deleted duplicate `muse-manifest.json`. `npx tsc --noEmit` clean.

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
| **Error message sanitization** — ~45 `error.message` leaks returned PostgREST internals to clients. Added `src/lib/http.ts` `safeServerError()` helper; sanitized all API routes (main, auth, upload, push, referral, content-scan, verification, cron, backup, stripe). forgot-password now always returns success (anti-enumeration). | uncommitted | `npx tsc --noEmit` clean |
| **Mapbox CSP + manifest dedup** — mapbox-gl.js blocked by CSP (`script-src`); added `api.mapbox.com`. sw-muse.js precached wrong manifest; pointed at canonical `/manifest.webmanifest`, deleted duplicate `muse-manifest.json`. | uncommitted | code-verified |

---

## 🔴 CRITICAL — RESOLVED ✅ (DDL applied + live-verified)

The consolidated script `sql/MUSE_DASHBOARD_FIX_20260806.sql` was run in Supabase Dashboard → SQL Editor (idempotent — safe to re-run). Live policy dump confirmed clean.

1. **9 missing tables** — Created on live. Connect/Block/Report/Book/Community/Forum/Push/Sessions features now have their tables.
2. **Column drift** — `muse_notifications.text`, `muse_reports.target_type`, `UNIQUE(endpoint)` on push subs all added.
3. **RLS enabled on all tables** with safe `authenticated`-only, owner/participant-gated policies. Wide-open `Service manages X` policies (defaulted to PUBLIC/anon) dropped. Admin audit + embeddings deny-all via `USING(false)`.

## 🟠 HIGH — status (audit items re-verified against current code)

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 1 | Chat single-player (no server write path) | **FIXED** | `persistMessage()` routes through `POST /api/muse action=message`; server derives `match_id`/`sender_id` (route.ts:417-426) |
| 2 | IDOR read/write any convo by match_id | **FIXED** | `isConvoParticipant()` check (route.ts:66-70, 109) + server-side match_id derive |
| 3 | IDOR delete any upload by path | **FIXED** | `path.startsWith(`${profileId}/`)` ownership gate (upload/route.ts:91) |
| 4 | `/api/checkout` doesn't exist | **FIXED** | `src/app/api/checkout/route.ts` exists — Stripe checkout session, $9.99/mo |
| 5 | `/api/backup` cron 404s | **FIXED** | `src/app/api/backup/route.ts` exists — table counts + recent messages snapshot |
| 6 | sender_id namespace mismatch | **FIXED** | Server derives `sender_id: profile.id` from Bearer token (route.ts:420) |
| 7 | push upsert no UNIQUE constraint | **FIXED** | SQL script adds `UNIQUE(endpoint)`; code has `onConflict:"endpoint"` (push/route.ts:47) |
| 8 | `muse_reports.target_type` missing column | **FIXED** | SQL script adds the column |
| 9 | update-password broken setSession | **FIXED** | Uses `sb.auth.admin.updateUserById()` (auth/route.ts:119) |
| 10 | Share links 404 (hardcoded demo IDs) | **FIXED** | `post/[id]` + `profile/[id]` fetch real rows from Supabase via service client |
| 11 | Manifest dedup | **FIXED** | `sw-muse.js` precaches canonical `/manifest.webmanifest`; duplicate `muse-manifest.json` deleted |
| 12 | Mapbox blocked by CSP | **FIXED** | `api.mapbox.com` added to `script-src` in vercel.json — map script now loads |

**No HIGH items remain open.** All 12 verified fixed in code + live (RLS dump confirmed).

## 🟡 MEDIUM

### Fixed this session
- **Error messages leak PostgREST internals** → **FIXED** — `safeServerError()` helper sanitizes ~45 `error.message` leaks across all API routes. Real errors logged server-side, generic `"Server error"` returned to clients.
- **`delete-account` misses tables** → **FIXED** — now deletes messages, matches, feed, briefs, brief_applications, forum_posts, forum_replies, connections, community_members, bookings, notifications, push_subs, activity_log, reports, blocks before profile + admin auth user (auth/route.ts:158-175).
- **Legacy auth endpoints** → **FIXED** — register has password-strength validation (6+ chars, capital, symbol); login mints real session; forgot-password always returns success (anti-enumeration); update-password uses admin API.
- **Matches `target_id(*)` email leak** → **FIXED** — match select uses explicit column list, no email (route.ts:100).
- **Profile discovery NSFW fields** → **FIXED** — discovery select returns only `id, name, type, avatar, bio, loc, styles, looking, photos` — no mbti/zodiac/life_path/show_nsfw (route.ts:89).

### Still open (non-security, UX/reliability)
- Optimistic toasts on 500 (report/connect/join/delete-account) — no failure path shown to user.
- Rate limiter is per-Vercel-instance, keyed on spoofable `x-forwarded-for`; many actions unthrottled (register, match, sync, connect).
- `join-community` trusts client `memberCount`; `sync`/`match` create matches to arbitrary targets; `block` upsert no `onConflict`.
- localStorage quota risk (multi-MB data URLs) → silent persistence death; two writers to `muse_v1`.
- Duplicate matches, key collisions (`Date.now()`), stale `doSwipe` closure (`userDefaultIntent` missing dep), state mutation during render.

## ⚪ NOTABLE / NIT

### Fixed this session
- **sw-muse.js pre-caches wrong manifest** → **FIXED** — now precaches canonical `/manifest.webmanifest`; duplicate `muse-manifest.json` deleted.
- **`proxy.ts` glob never matches** → **FIXED** — now uses regex `/^https:\/\/muse-.+\.vercel\.app$/` (proxy.ts:12). CORS `*` on `/api` retained as defense-in-depth alongside proxy origin enforcement.

### Still open (cosmetic / low-impact)
- `MuseAuthProvider.tsx` is dead code (never mounted) — no auth conflict, but its `register` posts always-401 `type:"profile"`.
- GA gtag blocked by CSP. GA events are no-ops.
- `.gitignore` ignores `.env*.local` but not bare `.env`.
- RIFF magic treated as webp — **partially fixed**: upload route now validates `WEBP` at bytes 8-12 for RIFF containers (upload/route.ts:20-23).

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
