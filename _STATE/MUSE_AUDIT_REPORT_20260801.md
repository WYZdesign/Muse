# MUSE AUDIT REPORT — 2026-08-01

Four-phase audit: (a) own code audit, (b) frontend/backend/opsec subagent audits, (c) re-audit with live verification, (d) final wrap-up subagent audit. Read-only plus two targeted fixes (both deployed).

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

1. **Run `sql/muse_fix_chat.sql`** (v2) — messages columns + realtime publication (if not already: verify `muse_messages` has `receiver_id`, `client_msg_id` — the live probe shows YES).
2. **Add the 9 missing tables** (from `MUSE_APPLY_ALL.sql` table defs only — NOT its RLS policies).
3. **`ALTER TABLE muse_notifications ADD COLUMN text TEXT DEFAULT '';`**
4. **Enable RLS per `sql/rls_policies.sql`** — but first strip the wide-open policies; add email-column restriction; `authenticated` only.
5. **Enable Realtime** for `muse_messages` (publication) — required for chat to work.
6. **Verify after each step** with: `GET /api/muse?type=admin` (stats), then live-test Connect/Report/Block/Book buttons.
7. Optional hardening: rotate JWT secret (forces all stale sessions out), add `UNIQUE(endpoint)` on `muse_push_subscriptions`, URL-restrict the Mapbox token, delete the dead `/api/backup` cron in vercel.json.
