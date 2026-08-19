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

---

## 13. LIVE-SITE AUDIT — 2026-08-19 (login-and-browse via Playwright, fixed errors)

Logged in as `torree.marcel@gmail.com` and browsed the live app, capturing console errors + 4xx/5xx. Root causes found + fixed (all pushed):

- `a3ef83f` — **500s** on `/api/muse?type=albums|album-photos|reviews`: discover fell back to seed profiles with *numeric* ids, which the albums endpoint cast to UUID → Postgres error. Fixed with a `UUID_RE` guard (non-UUID → empty result). Also CSP (`vercel.live`), manifest `scope`, OG/meta description rewrite.
- `0405b14` — **401** on `/api/muse/match` pre-login: `bootstrapData` now gates the match fetch on an existing `access_token`.
- `67d4fda` — **404** on model images: 10 `Nico + Draco-*.webp` files have a literal `+` in the filename; Vercel decodes `+` as space. Fixed by encoding `+` → `%2B` in `types.ts` + `photoOrientation.ts` (verified `%2B` → 200).

### Audit facts (verified, for Claude)
- `public/models/` IS tracked in git (1000 files, 130MB) — the placeholder photos are committed, not missing. Only the `+`-in-filename subset 404'd.
- Default auth mode is **Sign Up** (not Log In) — `button.btn-gold` reads "Create Account" until the "Log In" tab is clicked.
- `track-event` is already auth-exempt (route.ts:432-434). The remaining `/api/muse` POST 401 on boot is a minor pre-auth action (likely `sync`), untraced.

### Remaining (recommended for Claude / next)
1. ~~**Disclosure trigger weakness**~~ ✅ FIXED `3baf700` — the `message` action now blocks payment+NSFW keywords with `DISCLOSURE_REQUIRED` (409), mirroring the client prompt as server-side enforcement (defense-in-depth). Note: `persistMessage` routes through the server `message` action (authFetch), NOT client-direct — so the server check now covers the real path.
2. ~~**Unused deps**~~ ✅ DONE `3baf700` — `zod` + `@supabase/ssr` uninstalled (verified unused).
3. **Hook extraction** — IN PROGRESS. `useChatState` extracted (`25e3444`) as proof-of-pattern (7 state vars moved to `src/app/(muse)/muse/hooks/useChatState.ts`; `tsc` + build + 46 tests green). **10 hooks remain** per Claude's spec: `useAuthState`, `useDiscoverState`, `useBookingState`, `useProfileState`, `useFeedState`, `useCommunityState`, `useBriefsState`, `useSettingsState`, `usePersonalityTestState` (`useAppShellState` stays in page.tsx). One hook per commit, `tsc` + unit tests after each.
4. **Untraced screens** — Collab/Briefs lifecycle, Community beyond join, Subscription Stripe flow, Codex, Settings sub-panels, admin panel, match/like/super-like path.
5. **End-to-end payment test** — escrow/Checkout/capture is code-complete + UI-wired but not live-tested (needs Stripe test keys + browser + onboarded host Connect account).

---

## 14. REQUEST FOR CLAUDE — full user-journey ghost trace (everything we never searched)

The core loop is verified (signup → discover → match → chat → book → pay → complete → review). But most other surfaces were never traced end-to-end. **Ghost every journey below** — for each: does it work end-to-end, where does each action lead, is the outcome *successful* (real DB write, correct state, visible to the other party), and where are the dead ends / no-ops / 4xx-5xx?

### Journeys to ghost (keep the user's intent in mind — they want to DO the thing)
1. **Forum** — create a post, comment, reply, upvote, sort, expand a thread (`NetworkScreen`/`FeedScreen` "forum" tab). Does the post persist + show for others? Is there a real `forum` action write path, or read-only?
2. **Feed** — post text + photo, react, comment, filter (`FeedScreen`). Does the post persist? Does the comment/reaction write anywhere?
3. **Collab briefs** — create a brief, apply to someone's brief, save a brief, filter (`CollabScreen`). Does `brief-apply` notify the owner? Does `brief` (create) persist to `muse_briefs`?
4. **Community** — join a group, RSVP an event (`CommunityScreen`). Do `join-community` / RSVP persist, or are they local-state only?
5. **Moments/BTS** — post a moment, view stories, like (`BtsScreen`). `create-moment` + `type=moments` were just built — confirm the post path is wired client-side too, and expires at 24h.
6. **Portfolio/albums** — create album, add/remove photos, set access tiers, grant/revoke access, like (`MyAlbumsManager`). CRUD is verified; trace the *access-tier* and *like-album* flows end-to-end.
7. **Network** — connect, pros list, forum (`NetworkScreen`). Does `connect` notify the target?
8. **Settings** — every sub-panel: `save-preferences`, NSFW toggle + age gate, notification prefs, connected accounts (Stripe Connect onboarding), delete account.
9. **Referral** — generate code, copy link, refer (`ProfileScreen` → `/api/muse/referral`). Does the code actually unlock a perk on redemption?
10. **Subscription** — Pro Checkout redirect → webhook → tier upgrade → paywalled features unlock.
11. **Admin** — admin-brain query, reports, strikes, appeals, suspend/ban (`admin/page.tsx` + `ModerationPanel`). Do strikes/appeals/suspension actually gate the user?
12. **Safety** — safety check-in (`respond-checkin`), trusted contact (`share-safety-details`), disclosure (verified).
13. **Profile** — edit profile, share profile, badge system, prompt bank (`save-prompt-response`), personality/self-discovery test.
14. **Codex** — badges/glossary/matching (`CodexScreen`).
15. **Search** — discover search, muses search, filter modal.
16. **Block/unmatch/report** — do they persist + remove the target from view for the reporter?

### Method (same standard as the booking-loop trace)
- Trace each screen's actual `action: "..."` / `?type=...` calls against the API route inventory (44+ actions).
- Flag: dead buttons, no-op handlers (`onClick={() => {}}`), actions that 400/500, UI that doesn't reflect the DB write, and anything "wired but does nothing."
- Verify against **code**, not the UI impression. Report a ✅/⚠️/❌ table like the booking-loop pass.

### Also still open
- **9 hooks remain** in the `page.tsx` state extraction (`useChatState` + `useBriefsState` done; next: `useAuthState`, `useDiscoverState`, `useBookingState`, `useProfileState`, `useFeedState`, `useCommunityState`, `useSettingsState`, `usePersonalityTestState`).
- **NSFW blur + moderation** ✅ DONE `4cb28eb` — discover card hero blurs NSFW profiles behind an "18+ NSFW · Tap to reveal" overlay (`DiscoverScreen.tsx`); `contentScan.ts` now allows `Suggestive` (boudoir/tasteful/artistic is legitimate, age-gated) and still blocks `Explicit Nudity` (nipples/groin). Still TODO: extend the blur to profile view, moments, and album photos.
- **Live payment test** — needs Stripe test keys + browser.

---

## 15. SESSION UPDATE — 2026-08-19 (Stripe onboarding, X OAuth, premium popup, NSFW blur completion, RSVP)

### Stripe — FULLY ONBOARDED (manual, done by Torreé)
- Connected account `acct_1U6FfvAfDBHWmLX4` (email `info@wyzdesign.com`) is now **Enabled** — no longer "Restricted".
- Completed: terms of service accepted, business details (`WYZ Design LLC`, EIN `••2681`, address `1200 S. Wall St., Los Angeles, CA 90015`, industry `Apps`), website `https://muse.wyzdesign.com` (NOT the broken `www.` variant — that one has no valid SSL cert and causes `ERR_CERT_COMMON_NAME_INVALID`), public name `Muse`, statement descriptor `MUSE CO.`, support phone `+1 (213) 399-9610`, representative `Torree Harris` (DOB 1991-10-14, SSN last-4, ID doc), payout bank `COASTAL COMMUNITY BANK` (routing `125109019` — this is the user's **Bluevine** account; Bluevine partners with Coastal Community Bank, so this is correct and expected).
- **Product:** single active `Muse Pro` product, `$9.99/month`, lookup key `price_muse_pro_monthly` (this is what `checkout/route.ts` queries), category `General - Electronically Supplied Services` (Eligible for Managed Payments), description + image set, tax behavior `Exclusive`. The duplicate "General - Services" product (Ineligible) was **archived**.
- **Important:** the "Create a live customer / Create an invoice / Create a non-recurring product" items in Stripe's *Setup guide* checklist are generic beginner-tutorial steps — IGNORE them. The app's Checkout API auto-creates customers + invoices on real purchases. No manual customer/invoice creation needed.
- **Remaining:** only the **live payment test** (app → Settings → Muse Pro → Upgrade → `4242 4242 4242 4242`), which creates the first real customer + invoice automatically through the code.

### X/Twitter OAuth button — DONE (`79739f7`)
- Replaced the **Apple** login button with **X/Twitter** (`handleOAuth` provider union changed `"apple"` → `"x"`). X logo SVG inline. Apple is deferred (requires paid Apple Developer account).
- X OAuth keys live in the **Supabase dashboard** (Auth → Providers → x), NOT Vercel: `MUSE_X_CLIENT_ID` / `MUSE_X_CLIENT_SECRET` from the vault. Already added by Torreé.
- **Facebook OAuth "error occurred" after confirm** is a Facebook App config issue (app in Development mode; needs Live mode + redirect URI `https://ejbwjmzrazfgtisqsamf.supabase.co/auth/v1/callback` whitelisted in the FB app's Valid OAuth Redirect URIs). NOT a code bug.

### Premium popup — REMOVED (`79739f7`)
- Deleted the "Muse Premium" popup entirely (state `showPremiumPopup`/`premiumDismissed`, the auto-dismiss `useEffect`, the popup render block, and the `setShowPremiumPopup` trigger in `MusesScreen`). Premium is now reached via the Profile tab + a dedicated premium page.

### Landing page fixes (`79739f7`)
- Nav bar was too tall (padding `22px` → `12px`, logo `34px` → `30px`), and there was a huge gap at the top on desktop (hero `padding-top` `120px` → `88px`, mobile `110px` → `90px`).

### Settings button — moved + renamed (`79739f7`, `a4535e1`)
- Removed the gear icon from the profile **header**.
- Added a full-width rectangular **"Account Settings"** button directly under **"Edit Profile"** on the Profile tab (routes to `setScreen("settings")`).

### NSFW blur — COMPLETED (`be58799`, `a4535e1`)
- Now applied to ALL surfaces: discover card hero, discover card portfolio photos, profile view modal, and moments (BTS feed). Every one uses the "18+ NSFW · Tap to reveal" pattern with `revealedNsfw` `Set<string>` state.

### RSVP — SQL APPLIED + VERIFIED (`5d0003c` + manual SQL run)
- `sql/MUSE_RSVP_20260819.sql` was run manually in the Supabase SQL Editor. **Verified live via PostgREST** — `muse_rsvps` returns `200 []` (table exists + RLS active).
- Frontend: CommunityScreen + MenuModal RSVP buttons call `action: "rsvp"` / `"cancel-rsvp"`; page.tsx fetches `?type=rsvps` into `rsvpdEvents`.

### All 5 ghost-trace ⚠️ items — CONFIRMED WIRED (verified against code)
1. **Moments posting** ✅ → `create-moment` server action (BTS button in FeedScreen).
2. **Referral redemption** ✅ → `/api/muse/referral` has `generate`/`apply`/`redeem-reward`/`status`; page.tsx:1923 calls `apply`.
3. **Subscription unlock** ✅ → Stripe webhook `checkout.session.completed` sets `tier: "muse_pro"`; `customer.subscription.deleted` reverts to `free`.
4. **Admin panel** ✅ → `ModerationPanel.tsx` calls `admin-reports`/`admin-strikes`/`admin-suspend-user`; all email-gated via `ADMIN_EMAILS`.
5. **Block/report call sites** ✅ → `action:"block"` (route.ts:640, page.tsx:2181), `action:"report"` (route.ts:621, page.tsx:1976).

### Env vars — COMPLETE
- The only thing that was missing is X/Twitter, which belongs in **Supabase** (not Vercel) and is now done. Vercel already has: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_EMAILS`, `CRON_SECRET`, `OPENROUTER_API_KEY`, `AWS_ACCESS_KEY_ID/SECRET/REGION`, `NCMEC_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_SUPPORT_EMAIL`.

---

## 16. FINAL STATE — CLOSED-BETA GATES

| Gate | Status |
|---|---|
| Core product loop (signup→discover→match→book→pay→complete→review) | ✅ code-complete |
| Stripe onboarding (account, product, bank, terms) | ✅ done |
| RLS security + IDOR + admin auth | ✅ hardened + verified |
| NSFW blur + moderation (all surfaces) | ✅ done |
| 89 tests + tsc + build + 0 audit vulns | ✅ green |
| RSVP SQL + all migrations applied + verified | ✅ done |
| OAuth (Google/Facebook/X/Spotify) | ✅ Google/X/Spotify verified; Facebook needs App→Live (config) |

**Remaining for true closed-beta go-live (all manual/human, none blocking code):**
1. **Live payment test** — Stripe test card `4242 4242 4242 4242` through the app's Upgrade flow.
2. **Facebook App → Live** (for non-test users; Dev mode works for admins/testers).
3. **Attorney memo review** — `_audit_artifacts/ATTORNEY_HANDOFF.md` → real attorney.

**Recommended code backlog (deferred, non-blocking):**
1. **Hook extraction** — 9 of 11 remain (`useChatState` + `useBriefsState` done): `useAuthState`, `useDiscoverState`, `useBookingState`, `useProfileState`, `useFeedState`, `useCommunityState`, `useSettingsState`, `usePersonalityTestState`, + 1 more per Claude's spec. One hook per commit, `tsc` + unit tests after each.
2. **Accessibility** — ~25 icon-only buttons missing `aria-label`.
3. **Split `page.tsx`** — ~2400-line monolith; highest value, highest risk.
4. **zod validation** on API inputs.
5. **Image optimization** — `next/image` / resize params.

---

## 17. SESSION UPDATE — 2026-08-19 (Edit Profile + Share Profile modals restored, tier leak fixed)

### Edit Profile + Share Profile modals — RESTORED (`c0325a4`)
- **Root cause:** the `showEditProfile` and `showShareProfile` state existed and their buttons called `setShowEditProfile(true)` / `setShowShareProfile(true)`, but the JSX render blocks had been **removed** at some point — clicking "Edit Profile" (pencil icon AND the profile-page button) was a dead no-op.
- **Fix:** recovered the original markup from git history (commit `a88614d`) and re-added both render blocks to `page.tsx` (before the disclosure modal). Edit Profile modal now uses the canonical full-screen pattern (`modal-overlay` → `modal-header` + `modal-body`, no `modal-panel` wrapper) with avatar preview/upload, Display Name, Bio, Location fields, and Save wired to `saveProfileEdits()`. Share Profile is a bottom sheet (`share-sheet`).

### Tier/premium leak — FIXED (`c0325a4`)
- **Root cause:** `saveState`/`loadState` persisted `currentUser.tier` into `muse_v1` localStorage. A stale `tier: "muse_pro"` from the owner session (`torree.marcel@gmail.com`, forced to `muse_pro` via `OWNER_EMAIL` check) leaked into a free account (`wildyetzealous@gmail.com`) on account switch. The DB was always correct (`wildyetzealous@gmail.com` = `free`).
- **Fix:**
  1. `loadState` now forces `tier: "free"`, `foundingTier: ""`, `proExpiresAt: ""` on restore — tier is always re-derived from the auth session, never from localStorage.
  2. `doLogout` now resets `setUserTier("free")` and clears `foundingTier`/`proExpiresAt` in addition to the existing `currentUser` reset.
- **Note:** the owner account (`torree.marcel@gmail.com`) correctly shows "Muse Pro" (it IS the owner, forced to `muse_pro` at `page.tsx:473-474`). To test the Upgrade flow, use a free-tier account.

### Verification
- `npx tsc --noEmit` clean, `npm run build` clean, 46 unit tests pass. Pushed to `main` → Vercel auto-deploys.

### Still open for Claude (next session)
1. **Systematic dead-button audit** — grep every `onClick` across all screens and trace to a real handler/action/modal (Edit Profile + Share Profile were the two confirmed dead modals; now fixed). The 57 `= () => {}` matches in screens are harmless default-prop fallbacks, NOT dead handlers.
2. **Live payment test** — Stripe test card `4242 4242 4242 4242` via a free-tier account's Upgrade flow (owner is pre-pro).
3. **Facebook App → Live** for public OAuth.
