# MUSE VISUAL AUDIT — HANDOVER FOR CLAUDE

> Purpose: Full visual audit of the Muse app — every page, link, and action — with ACCURATE screenshots. Owner (Torreé) will do his own manual visual pass afterward; this is the automated sweep that should catch everything before he does.
> Repo: `W:\WYZ_Design_Site\muse` · Live app: https://muse.wyzdesign.com · Vercel project: `wyzdesigns-projects/muse`

## 1. CURRENT DEPLOYED STATE (verify against live — this is what's on prod)

- **Commits on master:** `80e5f9f` (logout/persisted-state fix, screen validation, notifications query, metadataBase), `2d3870f` (update-profile auto-create + service client key fallback), `f20659c` (server-side auth on profile update/delete/upload/export, sanitized upload folders, consolidated RLS).
- **Live-verified via API:** register 200, update-profile 200 (Bearer), export 200 (Bearer), delete-account 200 (Bearer + full cascade), upload 401/400/200 (magic bytes + storage + public URL), unauthenticated update-profile 401.
- **DB state:** 3 real auth users (`wildyetzealous@gmail.com`, `info@wyzdesign.com`, `torree.marcel@gmail.com`). All 92+ `e2e_*` junk accounts purged. `muse_messages`/`muse_matches`/`muse_notifications` tables are empty. `muse_profiles` has ~8 rows, all with empty avatar/photos.
- **Discover behavior (intentional):** profiles API excludes the current user and drops profiles with no avatar AND no photos. With empty DB, frontend falls back to a hardcoded demo `PROFILES` array. This is why you'll see demo cards in discover, not real people.
- **Admin emails** on Vercel: `torree.marcel@gmail.com`, `info@wyzdesign.com`, `wildyetzealous@gmail.com`.

## 2. SCREEN MAP (in-app navigation — all on the `/muse` single page)

Screens are SPA panels toggled by the `screen` state. Valid values: `auth`, `onboard`, `discover`, `connections`, `matches`, `chat`, `briefs`, `portfolio`, `moments`, `profile`, `settings`, `subscription`.

| Screen | How to reach | Key actions on it |
|--------|--------------|-------------------|
| **auth** | Default when logged out | Log In / Sign Up tabs, email+password, forgot password, terms/privacy/guidelines links |
| **onboard** | New user without name+type, or after signup | 3-step wizard: Get Started → Your Info → done → Welcome |
| **discover** | Default when logged in | search (hdr), discovery prefs (hdr), filter modal (hdr), map view toggle (hdr), boost (hdr), swipe/match cards |
| **connections** | Hamburger → Community | channels/groups/events tabs |
| **matches** | Bottom nav or hamburger → Network | search, "likes you" bell, match list, chat open |
| **chat** | Tap a match | message thread, quick replies/icebreakers |
| **briefs** | Hamburger or bottom nav | post brief (+ hdr), saved briefs, applied briefs |
| **portfolio** | Bottom nav | upload (+ hdr), gallery |
| **moments** | Hamburger → BTS | story feed, story viewer (tap to open/close) |
| **profile** | Hamburger → Profile or hdr | edit profile (hdr), premium/upgrade, delete account, personality/creative profile links |
| **settings** | Hamburger → Settings or profile hdr | preferences, safety, help FAQ, logout, premium |
| **subscription** | "Upgrade $9.99" buttons | pricing / Stripe upgrade |

**Hamburger menu** (top-left on most screens): Community, Sessions, Network, Profile, Settings, BTS. Each opens a sub-panel with a Back arrow.

**Global overlay:** Premium popup (shows on load, dismissible ✕, "Upgrade $9.99" → profile/premium).

## 3. THE AUDIT TASK — what to verify, screen by screen

Run against the LIVE app (https://muse.wyzdesign.com) in a real browser. Use Playwright (already installed in this repo: `node_modules/playwright` v1.60) OR Claude's own browser tooling. For every item, take a REAL screenshot (actual browser render of the live site — never fabricate or describe). Save screenshots to `W:\WYZ_Design_Site\muse\_AUDIT_SHOTS\` with names like `01-auth-login.png`, `02-discover.png`, etc.

**Checklist (go through every row):**
1. **auth** — login form, signup form, both tabs. No console errors. Links work.
2. **onboard** — all 3 steps clickable, back/next, completes to discover.
3. **discover** — cards render (demo array), swipe buttons work, each hdr button opens its modal, map view loads (Mapbox — note: public token in code), search filters, filter modal apply works, boost flow, discovery prefs.
4. **connections** — each tab (channels/groups/events) renders, back to menu.
5. **matches** — match list renders (likely empty state — verify it's graceful, not blank/broken), search works, "likes you" bell.
6. **chat** — open a chat (may be empty since tables are empty — verify the empty state renders cleanly, no crash), send button, icebreakers.
7. **briefs** — post brief modal opens/submits, saved/applied tabs.
8. **portfolio** — upload modal, gallery (likely empty — graceful state), zoom.
9. **moments** — story feed, story viewer opens, closes by tap/✕.
10. **profile** — edit profile modal (name/bio/location + geolocation), avatar upload (now requires auth — verify upload works when logged in), premium buttons, personality/creative profile sub-screens, delete account (red button — be careful, this deletes!).
11. **settings** — toggles work, FAQ accordion, logout button ACTUALLY logs out (this was the bug — verify reload shows auth screen, no blank/relogin).
12. **premium popup** — dismisses, upgrade navigates to subscription.

**Cross-cutting checks:**
- **No blank screens** — the previous bug was a blank phone behind the premium popup caused by stale persisted state. Verify each screen renders content.
- **Console clean** — no uncaught errors/red text on any screen.
- **Broken images** — no 404s/failed image requests (photos fall back to demo).
- **Bottom nav + hamburger reachable from every main screen** — no dead-ends.
- **All modals open AND close** (✕ / back / outside tap).

## 4. ACCURATE-SCREENSHOT RULES

1. Screenshots MUST be real renders of https://muse.wyzdesign.com — no mockups, no hand-drawn, no "what it should look like" images.
2. Use a mobile-ish viewport (the app is a phone-frame UI, ~390×844 is ideal) so the phone frame fits on screen.
3. Log in with a REAL account to reach authed screens. Test creds: create a throwaway account via Sign Up (the app creates real profiles) OR ask Torreé for a test login. Do NOT use `torree.marcel@gmail.com` unless Torreé gives the password.
4. If a screen shows an empty state (no matches, no messages), screenshot that too and note "graceful empty state OK" — an empty state must still look intentional, not broken.
5. After taking each screenshot, note in the audit log: filename, screen, what you clicked, console errors (if any), broken images (if any).
6. Present results as: PASS / WARN / FAIL per screen with the screenshot file paths.

## 5. KNOWN BACKLOG / THINGS THAT CANNOT BE FIXED BY CODE ALONE

- **SQL migration NOT applied:** `sql/muse_fix_chat.sql` v2 (message keys → TEXT, `receiver_id`/`client_msg_id`, realtime, participant RLS) and `sql/rls_policies.sql` still need to be run by Torreé in Supabase Dashboard → SQL Editor. Until then `match_id` is still UUID and chat/push may behave oddly. This is NOT an app bug — note it if you see chat weirdness.
- **Push notifications** (`/api/muse/push`) — requires service worker + FCM/VAPID setup; may be non-functional. Note status.
- **Mapbox token** is a public key hardcoded in `page.tsx` (~line 2628) — works but not a secret.
- **Full forced logout of all users** — could not be done via admin API (needs per-user JWT). Either rotate JWT secret in Dashboard or the deployed session-validation fix handles stale sessions on load.

## 6. FILE MAP FOR FIXES

- `src/app/(muse)/muse/page.tsx` — the entire SPA (single file, ~2650 lines). All screens, state, modals.
- `src/app/api/muse/auth/route.ts` — register/login/session/update-profile/update-password/delete-account/logout.
- `src/app/api/muse/route.ts` — profiles/discover, export, notifications, communities, sessions.
- `src/app/api/muse/upload/route.ts` — avatar/portfolio upload (auth-gated).
- `src/app/api/muse/push/route.ts` — push notifications.
- `src/lib/supabase.ts` — client + service client.
- `sql/muse_complete_schema.sql` — canonical schema (reference).
- `sql/muse_fix_chat.sql`, `sql/rls_policies.sql` — pending Torreé migrations.
- `vercel.json` — redirects (/ → /muse), cron, CSP headers, function config.
- `.env.local` — local env (contains Supabase service role — NEVER commit, NEVER paste).
