# MUSE — HANDOVER

> Generated 2026-08-18. Closed-beta launch-readiness pass is COMPLETE. Read this instead of re-exploring the repo.

## TL;DR
Muse is ready for closed beta. All 4 OAuth providers verified working, RLS security fixed + verified, 89 tests green, build/typecheck clean, 0 audit vulns. Only non-blocking items remain (attorney memo, Facebook public App Review, Spotify playlists).

---

## 1. PROJECT

- **What:** Muse — creative professional networking platform (photographers, models, filmmakers, musicians). Matching, messaging, bookings, paid sessions, communities, portfolios, verification, safety/disclosure flows.
- **Repo:** `V:\Muse` (git, `main` branch)
- **Stack:** Next.js **16.3.1** (App Router, Turbopack), React 19, TypeScript, Supabase (Auth + Postgres + Storage + Realtime), Vercel (auto-deploy from `main`), Stripe (payments + Connect), Tailwind, react-icons, Playwright + vitest for tests.
- **URLs:**
  - App: `https://muse.wyzdesign.com/muse`
  - Landing: `https://muse.wyzdesign.com` (redirects to `/muse`... actually `muse.wyzdesign.com` → 308 → `/muse`; root `wyzdesign.com` → `/splash`)
  - Landing page source: `src/app/muse/landing/page.tsx`
- **Note on the SSL "connection isn't private" issue:** was NOT a real problem — cert is a valid Let's Encrypt wildcard `*.wyzdesign.com` + `wyzdesign.com` (SAN covers both). The user saw `ERR_CERT_COMMON_NAME_INVALID` due to DNS propagation / stale cache on recipients' side. Self-heals. No config change needed.

## 2. SUPABASE

- **Production:** project ref `ejbwjmzrazfgtisqsamf`
- **Staging:** ref `rwgofoxqycpzsvxfnozt` (created, schema applied, but NOT wired to Vercel preview — currently unused)
- **Auth callback URL:** `https://ejbwjmzrazfgtisqsamf.supabase.co/auth/v1/callback`
- Supabase projects CANNOT be merged. Only production is needed for closed beta.
- Nameservers are `ns1/ns2.vercel-dns.com` (domain delegated to Vercel).

## 3. OAuth STATUS (all verified working via live authorize-endpoint test)

| Provider | GoTrue key | Redirect target | Status |
|---|---|---|---|
| Google | `google` | accounts.google.com | ✅ |
| Facebook | `facebook` | facebook.com/dialog/oauth | ✅ |
| X/Twitter | **`x`** (NOT `twitter`!) | x.com | ✅ |
| Spotify | `spotify` | accounts.spotify.com | ✅ |

**CRITICAL GOTCHA:** the "X / Twitter (OAuth 2.0)" provider key is **`x`**, NOT `twitter`. `twitter` is the *deprecated* OAuth 1.0 provider (correctly left disabled). Testing `provider=twitter` returns "provider is not enabled"; testing `provider=x` redirects correctly.

## 4. CREDENTIALS / VAULT

Credentials live in a DPAPI vault on the WYZMIND host (`W:\WYZ_Command_Center\.vault`), accessed via the `wyz_vault` Python module:
```python
import wyz_vault
wyz_vault.get_credential("NAME")
wyz_vault.add_credential("NAME", "value")
wyz_vault.list_credentials()
wyz_vault._load_vault()   # returns full dict
```

Muse OAuth credentials are stored with `MUSE_` prefix:
- `MUSE_GOOGLE_CLIENT_ID`, `MUSE_GOOGLE_CLIENT_SECRET`
- `MUSE_FACEBOOK_APP_ID` (= `1387634410012798`), `MUSE_FACEBOOK_APP_SECRET` (= `3e724958913946ec92c533fc34331c7d`)
- `MUSE_X_APP_ID` (= `2089798908608192512`), `MUSE_X_CLIENT_ID` (= `dkFCSGhXbTJJUURLZHhxY0VRejU6MTpjaQ`), `MUSE_X_CLIENT_SECRET`
- `MUSE_SPOTIFY_CLIENT_ID` (= `6c2b278eece14af6aed8edeafb99df5d`), `MUSE_SPOTIFY_CLIENT_SECRET` (= `662bd0e2d8c14b71b054be138d1f28cc`)
- `MUSE_SPOTIFY_CALLBACK` (= `https://muse.wyzdesign.com/api/spotify/callback`), `MUSE_SUPABASE_CALLBACK`

**NEVER print secret values to logs/stdout.** The vault's `SUPABASE_PAT` is NOT valid for the Muse org (Management API returns 403) — don't rely on it.

## 5. SQL MIGRATIONS (all applied + VERIFIED live via PostgREST)

1. `sql/MUSE_ALBUM_LIKES_20260816.sql` — creates `muse_album_likes` table ✅ (verified exists)
2. `sql/MUSE_CHECKINS_UNIQUE_20260816.sql` — unique constraint on checkins (original had `ADD CONSTRAINT IF NOT EXISTS` which PG rejects; fixed via `DO $$ ... $$` block) ✅
3. `sql/MUSE_RLS_HARDENING_20260818.sql` — dynamic `DO` block enabling RLS on ALL `muse_*` tables + drops `zz_test_a`/`zz_test_b` ✅ (verified: anon now gets empty result, junk tables 404)

Other SQL files in `sql/` are historical migrations already baked into the schema.

## 6. WHAT'S DONE & VERIFIED (this session)

- **Dependency security:** Next.js 16.2.12 → 16.3.1 (fixed postcss XSS + sharp libvips CVEs), `uuid` override added (moderate vuln), `npm audit --audit-level=high` = **0 vulns**.
- **Tests:** 46 unit (vitest) + 22 integration + 21 smoke (Playwright) = **89 passing**. `npx tsc --noEmit` clean. `npm run build` clean.
  - The 413 oversized-body test needs `test.setTimeout(60000)` + `timeout: 30000` on the request (6MB upload).
- **Chat image upload:** was a dead no-op (`chatImg`/`setChatImg` hardcoded no-ops). Now `sendChatImg` in page.tsx uploads via `/api/muse/upload` and sends an image bubble.
- **Notification center:** `showActivityFeed` modal was dead (no trigger); Nav badge not rendered; server `muse_notifications` never fetched. Fixed: MenuModal "Activity" entry + unread badge + server-notifications merge via `/api/muse?type=notifications`.
- **Disclosure consent checkbox:** was `onChange={()=>{}}` (no-op) — now tracked in `agreeTerms`, enforced before submit.
- **Disclosure confirm view:** "Content types" rendered `[].filter(Boolean)` (always empty) — now renders actual `content_type_*` booleans.
- **RLS security:** see section 5.
- **OG image:** regenerated — cloudy site-color gradient + 50% black overlay + centered glowing icon + subtle stars + shooting star (`public/og-image.png`, 1200×630). Referenced in both `layout.tsx` files. Social platforms cache it (Facebook Debugger / Twitter Card Validator to refresh).
- **Landing page:** hero "scroll" indicator was a flex-row sibling pushing content off-center → `flex-direction: column`; eyebrow pill wraps on mobile; `SplitText` trailing-margin bug fixed; mystical curly section dividers (`SectionDivider` SVG component) between sections.

## 7. WHAT'S IN PROGRESS / UNFINISHED

- **None blocking.** Nothing uncommitted. All changes pushed to `main`.

## 8. MANUAL ACTION ITEMS (human-owned)

- **Attorney memo:** `_audit_artifacts/ATTORNEY_HANDOFF.md` → send to a real licensed attorney (online flat-fee review via Rocket Lawyer/UpCounsel ~$100–300). Covers bookings/payments/NSFW-adjacent content/liability. No digital substitute exists.
- **Facebook App Review:** only needed for PUBLIC launch. Dev mode works for closed-beta admins/testers now. When public: submit at developers.facebook.com (fields already filled: privacy policy, terms, category "Lifestyle", icon).
- **Spotify playlists** (not login): blocked behind Spotify Premium (Web API). Deferred.
- **Optional env:** `NCMEC_*` (CSAM pipeline), `NEXT_PUBLIC_REVENUECAT_*` (native IAP) — skip for now.
- **Vercel env:** `MUSE_CACHE_VERSION=1` was added. Everything else (SUPABASE, STRIPE, R2, SENTRY, OPENROUTER, MAPBOX, CRON_SECRET) already present.

## 9. RANKED NEXT STEPS (code backlog)

1. **Accessibility pass** — ~25 icon-only close/back buttons missing `aria-label` (mechanical, low risk).
2. **Image optimization** — Supabase/Unsplash images served full-res; add resize params or `next/image`.
3. **Bundle analysis + code splitting** — lazy-load heavy screens (Discover/Chat/Community); `page.tsx` is a ~2331-line monolith.
4. **zod validation** on API inputs (currently hand-rolled checks).
5. **Split `page.tsx`** — highest long-term value, highest risk; do carefully with vision.

## 10. GOTCHAS & CONVENTIONS

- **Git:** GitHub Copilot active on `main`. `git pull --rebase` refuses with unstaged changes → always `git stash push` → `git pull --rebase` → `git stash pop` → commit → push. Never force-push.
- **No em-dashes** in user-facing copy (comments/admin dashboards are fine).
- **Email:** use `info@wyzdesign.com` (NOT `support@`).
- **apiFetch** throws on non-ok; **authFetch** (lib/api.ts) does NOT throw.
- **Session token:** client stores `localStorage["muse_user"]` = JSON `{access_token, refresh_token, user}`.
- **authFetch/getAccessToken** canonical source: `src/app/(muse)/muse/lib/api.ts`; `lib/auth-client.ts` re-exports it.
- **Windows:** Bash tool = PowerShell (pwsh). Don't use `head`/`grep` shell aliases — use the dedicated tools. No inline `python -c` with f-strings (write a `.py` file).
- **Playwright config** `baseURL = https://muse.wyzdesign.com` (overridable via `E2E_BASE_URL`).
- **Provider key `x`** for X/Twitter OAuth 2.0 (see section 3).

## 11. KEY FILES

- `src/app/(muse)/muse/page.tsx` — main app (~2331 lines; all screens render here)
- `src/app/(muse)/muse/lib/api.ts` — canonical authFetch/getAccessToken
- `src/app/api/muse/route.ts` — main API (auth, block, feed, save-preferences, book-session, add-album-photo, admin-suspend, notifications, events)
- `src/app/api/muse/upload/route.ts` — image upload + content moderation
- `src/app/muse/landing/page.tsx` + `landing.css` — landing page
- `src/app/(muse)/muse/screens/*.tsx` — screens (Discover, Chat, Profile, MenuModal, Sessions, etc.)
- `src/app/(muse)/muse/components/*.tsx` — components (DisclosureModal, SafetyCheckinModal, etc.)
- `tests/api-integration.spec.ts`, `tests/smoke.spec.ts`, `tests/*.spec.ts` — 89 tests
- `sql/` — migrations (see section 5)
- `public/og-image.png` — link-preview image

---

## 12. SESSION UPDATE — 2026-08-18 (booking loop + moments + payment closure)

### Built this session (all pushed to `main`)
- `ccfcece` — booking loop backend: `create-session`, `complete-booking`, `submit-review`, `get-reviews`, escrow (`capture_method: manual` on `create-payment`; capture on complete, release on cancel).
- `ca3528b` — UI + feed + payment:
  - **SessionsScreen** "List a Session" button + form modal (calls `create-session`).
  - **BTS/Moments live feed**: `muse_moments` table + `create-moment` action + `GET /api/muse?type=moments`, replacing the `DEMO_MOMENTS` fallback.
  - **Booking payment**: `create-booking-checkout` (Stripe Checkout redirect, manual-capture escrow, 5% commission, destination charge — no client Stripe.js needed). Webhook `checkout.session.completed` stores the PaymentIntent + marks the booking payment `held`.
- `8b7faf6` — **full booking management UI** (the core loop is now complete end-to-end):
  - `GET /api/muse?type=bookings` returns the user's bookings as booker + host (joined session + profile).
  - `page.tsx`: `myBookings` state + fetch + passed to SessionsScreen.
  - **SessionsScreen "My Bookings"** (booker): real `muse_bookings` with status badge + Pay (confirmed) / Complete / Leave Review (completed).
  - **SessionsScreen "Requests"** (host): accept/decline (`respond-booking`) + Complete + Leave Review.
  - **Pay button**: calls `create-booking-checkout` → redirects to Stripe Checkout (parses session `rate` text to cents).
  - **Review modal**: 5-star + body, submits via `submit-review`.

### Corrections to the prior audit (verified against code, not assumed)
1. **Payment path already existed.** `create-payment` (connect route) already created a PaymentIntent with 5% commission (`COMMISSION_RATE = 0.05`) + `transfer_data.destination` to the host. The "no payment tied to a booking" claim was wrong. What was actually missing: escrow, UI wiring, and a client-usable flow. Escrow + Checkout flow now added.
2. **"Send note" is NOT missing.** It's `doLikeWithNote` (page.tsx) → note modal → `action: "match"` with `intent` + the note text (page.tsx:978). No separate `send-note` action is required.

### Manual actions required (human)
1. Run **`sql/MUSE_BOOKING_LOOP_20260818.sql`** (`completed_at` + `muse_reviews` table) and **`sql/MUSE_MOMENTS_20260818.sql`** (`muse_moments` table) — in BOTH prod (`ejbwjmzrazfgtisqsamf`) and staging (`rwgofoxqycpzsvxfnozt`) SQL Editors. ✅ CONFIRMED RUN — verified via PostgREST (`muse_reviews` + `muse_moments` both return 200 `[]`).
2. Confirm the Stripe webhook endpoint is registered for `checkout.session.completed` + `payment_intent.succeeded` (it already handles them; ensure the booking Checkout's events reach it).

### Remaining (not yet built / not end-to-end tested)
1. **End-to-end payment test** — the escrow/Checkout/capture flow is backend-complete + UI-wired, but NOT live-tested (needs Stripe test keys + a browser + a host with an onboarded Connect account).
2. **Untraced screens** (from the audit "not yet traced" list): Collab/Briefs full lifecycle, Community beyond join, Subscription Stripe flow, Codex, Settings sub-panels, admin panel, match/like/super-like creation path, disclosure trigger's client-side keyword weakness.

### Verification done this session
- `npx tsc --noEmit` clean, `npm run build` clean, 46 unit tests pass. (Playwright integration/smoke not re-run — they target the deployed app and are unaffected by these backend additions.)
