# 🛑 READ THIS FIRST — before touching anything else in this repo

This file is the **only** place that tells you, with certainty, what's actually
merged into `origin/main` versus what's sitting undelivered somewhere else.
Everything else in this repo (`HANDOVER.md` and the dozen other `*HANDOVER*`/
`*AUDIT*` docs) is **narrative** — useful for *why* a change was made, but
**not proof it landed**. Trust this file's verification commands over any
prose, in any doc, in any chat, from any agent — including past instances of
yourself.

## The rule

**A change exists in this codebase only if it's an ancestor of `origin/main`.**
Not if a handoff doc describes it. Not if a chat log says it was "delivered."
Not if a bundle file is sitting in `V:\Muse\_to_delete\`. Run this before
believing anything:

```
git fetch origin
git log --oneline -1 origin/main
```

Compare that SHA to **"Confirmed merged, last verified at"** below. If they
match, everything in this file is current and you can trust it. If they
don't match, someone merged something since this file was last updated —
find out what (`git log <old-sha>..origin/main --oneline`) and update this
file yourself before doing anything else, so the next agent isn't stuck the
same way.

## Confirmed merged, last verified at: `5d07bd4fed716e0b1a1d5c031d45d560364485b8`

### Round 55 — BUNDLE_B_EVIDENCE §4/§5 reconcile (verified 2026-09-23)

- `a4206eb` on `origin/main` — Vercel STATE **READY**, `DEPLOY IS LIVE ✅`
- Fixed stale `BUNDLE_B_EVIDENCE.md` §4 (Bundle A merge / 0025 unapplied) + §5 verification record
- No code delta this round — pure docs
- Gates unchanged from Round 54: vitest **417** · tsc **0** · eslint **0 err** · deploy LIVE
- Still unstaged/protected: `muse.css`, `tests/e2e/*`, `tests/fixtures/*`, `tests/helpers/*`, `CODEX_PAGE_TSX_HANDOFF.md`, dev logs

### Round 54 — backup route test (B4) (verified 2026-09-23)

- `a4206eb` (this tip) — was built + READY at check time
- Added `src/app/api/backup/route.test.ts` (auth branches matching sibling cron tests)
- Gates: backup vitest **3/3** · full vitest **53 files / 417 tests exit 0** · tsc **exit 0** · eslint backup **0 errors**
- Clears BUNDLE_B **B4** / **BLK-BACKUP-TEST**
- Still unstaged/protected: `muse.css`, `tests/e2e/*`, `tests/fixtures/*`, `tests/helpers/*`, `CODEX_PAGE_TSX_HANDOFF.md`, dev logs

### Round 53 — Bundle E live audit + delivery reconcile (verified 2026-09-23)

- `7813f87` on `origin/main` — Vercel STATE **READY**, `DEPLOY IS LIVE ✅` for this exact SHA
- History: `7813f87` (Git+Vercel evidence docs) ← `04dece0` (docs) ← `99fb9e2` (docs) ← `0f38ca3` (Bundle A merge) ← `d8c24d1` (type integration) ← `5031750`
- Gates still green post-merge (no code delta since `99fb9e2`): tsc **0** · eslint **0 err** · vitest **414** · `next build` **0**
- Bundle E Playwright: smoke **21/21** across 320/375/390 (320 serial after parallel goto flake) · Demo Mode Negative **9/9** · chromium smoke **7/7**
- Local smoke: `/api/health` 200 · `/muse` 200 · `/muse/landing` 200 · POST `create-album` **409 `DEMO_MODE`**
- Residual e2e: UI Badge click blocked by first-time `tour-overlay` (badges present in DOM) — harness needs `muse_tour_seen_*` seed; protected tests not edited
- Migration `0025` remains **file on main only — NOT applied** (separate migrate auth)
- Still unstaged/protected: `muse.css`, `tests/e2e/*`, `tests/fixtures/*`, `tests/helpers/*`, `CODEX_PAGE_TSX_HANDOFF.md`, dev logs

### Round 50 — Bundle A merge + delivery reconcile (verified 2026-09-23)

- `99fb9e2` on `origin/main` — Vercel STATE **READY**, `DEPLOY IS LIVE ✅` for this exact SHA
- History: `99fb9e2` (docs) ← `0f38ca3` (Bundle A merge) ← `d8c24d1` (type integration) ← `5031750`
- Post-merge gates: cache-free tsc **exit 0** · eslint page+Feed+albums **0 errors / 103 warnings exit 0** · vitest **52 files / 414 tests exit 0** · `next build` **exit 0**
- Smoke: `/api/health` 200 · POST `/api/muse` `create-album` **409 `DEMO_MODE`** · `/muse` 200 · `/muse/landing` 200
- Bundle A **merged** to main: `albums.ts`, `albums.test.ts`, `BUNDLE_A_HANDOFF.md`, `sql/migrations/0025_add_storage_cleanup_jobs.sql`
- Migration `0025` is a **file on main only — NOT applied to any environment** (separate migrate auth required)
- Still unstaged/protected: `muse.css`, `tests/e2e/*`, `tests/fixtures/*`, `tests/helpers/*`, `CODEX_PAGE_TSX_HANDOFF.md`, dev logs

### Round 49 — type integration + GO protocol docs (verified 2026-09-23)

- `d8c24d1` on `origin/main` — Vercel STATE **READY**, `DEPLOY IS LIVE ✅` for this exact SHA
- Gates pre-commit: cache-free tsc **exit 0** · eslint page+Feed **0 errors / 91 warnings exit 0** · vitest **52 files / 396 tests exit 0** · `next build` **exit 0**
- Smoke: `/api/health` 200 · POST `/api/muse` `create-album` **409 `DEMO_MODE`** local+prod · `/muse` 200 · `/muse/landing` 200 · root 200
- Staged only: `page.tsx`, `useAuthOnboardingState.ts`, `FeedScreen.tsx`, `HANDOFF.md`, `WYZMIND_GO_PROTOCOL.md`, `BUNDLE_B_EVIDENCE.md`, `BUNDLE_D_FINDINGS.md`
- NOT staged: protected e2e/helpers/fixtures, `muse.css`, `next-env.d.ts`, dev logs, Bundle A
- Bundle A was **branch-only** `a504daa` at this SHA — migration `0025` **not applied** (needs separate migrate auth)

### Round 47 — SQL migration suite idempotency (verified 2026-09-19)

`b791dd9` makes the entire `sql/` migration suite run clean back-to-back:
**51/51 files, two consecutive full runs, zero failures.** Fixes in this round:

- `storage.objects` policy qualifiers (`ON storage;` → `ON storage.objects;`)
  and removal of invalid `DROP POLICY ... ON public;` statements that raised
  `relation "public" does not exist`.
- Quest system: `MUSE_QUESTS_V2/V3` now create `muse_quests` themselves
  (`CREATE TABLE IF NOT EXISTS` + unique index) so file order can't break them;
  `MUSE_WEEKLY_QUESTS` seeds use column-inference
  `ON CONFLICT (action_key, frequency, target_count) DO NOTHING` on every
  INSERT (the previous `ON CONFLICT ON CONSTRAINT` referenced an index, not a
  constraint).
- `rls_policies.sql`: a `DROP POLICY IF EXISTS` now precedes every
  `CREATE POLICY`; `id::text` casts added only in policies whose guarded
  column is TEXT (`muse_reports.reporter_id`, `muse_blocks.user_id`).
- `muse_complete_schema.sql`: `muse_profiles.id::text` cast in the
  `muse_messages` participant policies (`sender_id`/`receiver_id` are TEXT).
- `muse.css`: removed `!important` from `.intent-btn:hover` so the two-tap
  selected-state highlight is no longer overridden on hover.

### Round 48 — numbered migrations actually applied (verified 2026-09-19)

The `sql/migrations/` system had **never been run**. Discovered state:
`schema_migrations` did not exist, 12 of 13 migration artifacts were missing
(the deployed code already calls these columns/tables, so those features were
broken in production), 11 files were mis-named 3-digit (`005_`…`015_`) so the
runner's `^(\d{4})_` pattern skipped them entirely, and
`scripts/run_migrations.py --apply` was a stub that only printed "use the
Supabase CLI". Fixed:

- renamed `005_`–`015_` → `0005_`–`0015_` (4-digit convention per the README).
- implemented `scripts/run_migrations.py --apply` for real (psycopg2, DSN from
  `DATABASE_URL` / `SUPABASE_DB_URL` / `MUSE_DATABASE_URL`); it creates
  `schema_migrations`, applies pending files in order, and records each.
- applied all 15 migrations. `schema_migrations` now has 15 rows and every
  artifact exists: `muse_matches.anchor_type/anchor_value/note`,
  `muse_communities.rules`, `muse_community_members.role`, `muse_reports.status/
  resolved_at/resolved_by/resolution_note`, `muse_message_requests`,
  `muse_forum_replies.parent_reply_id/depth`, `muse_profiles.travel_dates/
  availability_status/budget_range/travel_destinations/profile_completion_pct/
  boost_inventory/boost_expires_at`, `muse_forum_posts.locked`,
  `muse_reviews.criteria_*`, `muse_saved_searches`, `muse_community_bans`,
  `muse_community_mutes`, `muse_community_join_requests`, `muse_boost_purchases`,
  `muse_refund_requests`, `muse_photo_likes`.
- removed the duplicate `sql/MUSE_REPORTS_MODERATION.sql` (migration `0004` is
  the canonical owner of the `muse_reports` moderation columns; the `sql/`
  folder is frozen per `sql/migrations/README.md`).

Verification for `b791dd9`: `npx tsc --noEmit` clean, `vitest run` 349/349,
`next build` clean, `check_muse_migration.py` reports all six `muse_reports`
columns present, and Vercel deployment state `READY` (DEPLOY IS LIVE) for the
exact pushed SHA.

Follow-up on `6c4b388` (same round): deleted the confirmed-dead legacy
per-screen CSS block from `muse.css` (68 lines, `.screen-<name>.active`), which
no rendered element carries. `tsc` clean, `vitest` 349/349, `next build` clean,
Vercel `READY` for `6c4b388`. Note: the commit that records this line is a
documentation-only follow-up on top of `6c4b388`; the verified *code* SHA is
`6c4b388`.

### Round 49 — Claude's remaining asks (verified 2026-09-19)

Re-implemented the work that was in Claude's separate workspace but never
delivered as a bundle (it had no push access and ran out of credits):

- **StreakWidget flame vanishing** (`components/StreakWidget.tsx`): SVG
  `<defs>` ids were document-global and `dotGold` was emitted 7× inside the
  day map, so `url(#id)` in one widget resolved to another (unmounted)
  instance's defs and the fill disappeared. Every gradient id is now prefixed
  with a per-instance `useId()` (colons stripped).
- **2FA setup** (`screens/SettingsScreen.tsx`): the Cancel button (and closing
  the sub-page) now unenrolls the just-created factor instead of leaving a
  stale unverified one, and "Set Up Two-Factor" self-heals by dropping any
  unverified factor(s) before enrolling.
- **Transactional email styling** (`src/lib/email.ts`): table-based shell with
  an outer `bgcolor` (Gmail/Outlook strip `body{background}`), table-based CTA
  buttons with a solid `bgcolor` fallback behind the gradient, the flexbox
  onboarding step list replaced with a table (Outlook has no flexbox), all
  `rgba()` colours swapped for hex (Outlook ignores rgba → invisible text), and
  hidden inbox preheaders added.
- **Stripe Connect failure surfacing** (`api/muse/connect/route.ts`): the catch
  block returned a blanket "Server error", which made the Connect-as-user
  failure undiagnosable. Stripe's own user-safe `message`/`code`/`type` are now
  returned (with the full error logged server-side).
- **Two test accounts** (`scripts/seed_test_accounts.py` + `docs/MUSE_TEST_PUNCHLIST.md`):
  the auth users `torree.marcel+musetest1/2@gmail.com` existed but had no
  `muse_profiles` rows, so they couldn't interact. Both now have pre-verified,
  100%-complete profiles, and the host has a bookable session.

Verification: `tsc` clean, `vitest` 349/349, `next build` clean.

### Round 50 — Embedded Stripe Connect (ConnectJS) + fee-copy fix (verified 2026-09-19)

Stripe Connect onboarding was a **hosted redirect** (`accountLinks.create` →
`window.location.href`), so users left the app and got Stripe's default styling.
The Stripe platform profile is already set to *Embedded onboarding components* /
*Embedded account components*, so the app now matches it:

- Added `@stripe/react-connect-js` (3.4.4).
- New `POST /api/muse/connect` action `create-account-session`: creates the
  Express account if the user has none (with `metadata.muse_user_id` + DB
  linkage), then mints an Account Session with `account_onboarding` +
  `account_management` components and returns its `client_secret`.
- New `components/EmbeddedConnect.tsx`: `loadConnectAndInitialize` +
  `<ConnectComponentsProvider>` + `<ConnectAccountOnboarding>`, themed to
  Muse's dark/gold tokens via the ConnectJS `appearance` API (variables + rules)
  so onboarding renders natively inside the app — no redirect.
- `ConnectPanel.tsx` renders the embedded component in place; the hosted
  redirect is kept only as a fallback when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  is absent.
- Corrected the marketplace fee copy: the panel said "5% marketplace fee /
  you receive 95%" but the code charges **7% host commission + 8% buyer service
  fee** (`MUSE_HOST_COMMISSION_RATE` / `MUSE_BUYER_SERVICE_FEE_RATE`). Now reads
  7% / 93%.
- Added a route test for `create-account-session` (350 tests total).

Note on Express: users do **not** need an existing Stripe account — Express
accounts are created under the platform and Stripe collects business type +
identity/tax/bank details dynamically during onboarding. Existing Stripe
accounts can't be linked to Express (that's Standard/OAuth only).

Verification: `tsc` clean, `vitest` 350/350, `next build` clean.

### Round 51 — CSP fix for embedded Connect + loading overlays (verified 2026-09-19)

The embedded Connect lightbox rendered **empty** because the site CSP didn't
allow `connect-js.stripe.com`:

- `next.config.ts` CSP now includes `https://connect-js.stripe.com` in
  `script-src`, `connect-src`, and `frame-src` (plus `https://m.stripe.network`
  in `connect-src`). ConnectJS loads its SDK and renders its iframe from that
  origin, so the previous `frame-src https://js.stripe.com …` blocked it.
- Added `components/LoadingOverlay.tsx` — gold spinner + message, Muse dark
  styling. Shown while the embedded components initialize, and before the
  hosted-redirect fallback navigates away, so the UI never appears frozen.
- `EmbeddedConnect` now drives it via `onLoaderStart` / `onLoadError` — a load
  failure now shows the real message instead of a blank box.

Verification: `tsc` clean, `vitest` 350/350, `next build` clean.

### Round 52 — Rewind disabled when there's nothing to undo (verified 2026-09-19)

The Rewind (↺) button in the card's radial popup was always rendered and always
clickable, so tapping it with an empty history fired a "No profiles left to
undo" toast every time. `page.tsx` now passes `canRewind={rewindStack.length > 0}`
to `DiscoverScreen`, and the button renders disabled (dimmed/grayscaled,
`pointer-events:none`, `disabled` + `aria-disabled`) when the stack is empty, so
there's nothing misleading to tap.

Verification: `tsc` clean, `vitest` 350/350, `next build` clean.

### Round 53 — root cause of the blank Connect box: bad publishable key (verified 2026-09-19)

After the CSP fix (Round 51) the embedded lightbox was still blank. The actual
cause was the env var itself: the deployed `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
held `pk_1TnV6TFBOP6…` — **27 chars, not a valid Stripe key** (Stripe uses
`pk_live_…`/`pk_test_…`, 107 chars). ConnectJS can't initialize with it, so the
component rendered nothing.

- Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel (Production) to the correct
  Muse key `pk_live_51U0n0…` (matching `muse_STRIPE_SECRET_KEY` /
  `sk_live_51U0n0…`).
- Corrected the same stale value in the vault
  (`muse_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
- Confirmed server-side is healthy independently: `stripe.accountSessions.create`
  returns an `accs_secret_…` for the connected account.

`NEXT_PUBLIC_*` is inlined at build time, so this needed a redeploy (this commit
triggers it).

### Round 54 — Discover "0 candidates" explained + test accounts given visuals (verified 2026-09-19)

`/api/muse/match` filters candidates to profiles that have an avatar **or**
photos (`match/route.ts`). The DB has 3 profiles total: the owner's (excluded as
self) and the two test accounts, which were seeded with **empty avatar/photos** —
so they were filtered out and Discover showed 0 candidates. Not a code bug.

`scripts/seed_test_accounts.py` now also sets an avatar + photo on both test
accounts (Unsplash URLs, already allowed by the CSP `img-src`), and back-fills
existing rows that lack one. Verified: 2 profiles now pass the filter, so each
test account sees the other as a candidate.

### Round 55 — header parity, Settings slide sheets, Portfolio & Availability built (verified 2026-09-19)

- **Header parity (web vs mobile):** on desktop `min-width:768px` the `.phone`
  frame had `margin:24px auto` + `height:min(844px,calc(100dvh - 48px))`, which
  pushed `.hdr`, the page title and the top action buttons **27px lower** than
  the mobile layout (24px margin + 3px border) and left a visible gap above the
  app. Mobile is `.phone{position:fixed;top:0}`. Now `margin:0 auto;
  height:100dvh`, so every page's header/title/buttons sit at the same height
  as mobile.
- **Hamburger side-menu header parity:** the panel's close/bell/title sat at
  `top:calc(30px + safe-area)` with `padding-top:calc(96px + safe-area)` —
  ~18px lower than the main header and a large gap before the first item. Now
  the header row sits at 15/18px and the panel content starts at 72px, matching
  the main page header height.
- **Settings popups now slide:** `SettingsSubPage` was a hard `pop`-in sheet.
  It's now a `sheet-overlay`/`sheet-panel` with a buttery
  `sheetSlideUp` (cubic-bezier(.22,1,.36,1)) entrance and a reverse
  `sheetSlideDown` exit — the component holds itself mounted for 280ms so the
  close animation actually plays before unmounting.
- **Portfolio Settings + Availability Calendar built out** (were
  "coming soon" toasts):
  - Portfolio Settings: visibility (Everyone / Matches only / Private),
    featured-work toggle, show-on-profile toggle → persisted.
  - Availability Calendar: status (Available / Busy / Not accepting), booking
    lead time, away/travel dates, budget range, client note → persisted.
  - Added the corresponding keys to `save-preferences`' allowlist in
    `lib/muse-actions/misc.ts`, and SettingsScreen now accepts a `preferences`
    prop (seeded from the profile) so saved values load back.

Verification: `tsc` clean, `vitest` 350/350, `next build` clean.

### Round 56–58 — recorded clips, safety, and LiveKit calls (verified 2026-09-19)

**Recorded voice + video notes** (`ab7a34d`)
- Migration `0016`: `muse_messages.kind / media_url / media_type / duration_ms / transcript`.
- `messageSend` accepts media-only messages; push preview says "sent a voice note".
- `/api/muse/upload` distinguishes audio vs video WebM via `mediaKind` (identical
  EBML headers) → `audio/webm`; voice notes skip the video path that would
  otherwise mark the uploader NSFW.
- Chat: 🎤 + 🎥 record buttons (MediaRecorder, 60s cap), live recording bar with
  Cancel, inline `<audio>`/`<video>` players, video blurred until revealed.
- `/api/muse/transcribe` → Groq Whisper. `GROQ_API_KEY` added to Vercel
  Production, so voice notes now auto-transcribe (searchable + accessible).

**Clip safety** (`88949c9`)
- One-time consent notice before the first recording (two-party-consent states).
- "Report this clip" on received voice/video notes.

**Voice + video calls** (`167eb9a`) — LiveKit
- `POST /api/muse/call`: `start` (create room + token + notify/email callee),
  `token` (accept/rejoin), `end` (delete room). Room name is deterministic
  (`muse-<sorted profile ids>`), so both sides land in the same room with no
  extra handshake. Blocked users can't call each other; returns 503 with a clear
  message when the keys are absent.
- `hooks/useCall.ts`: ringing over one shared Supabase broadcast channel
  (`muse-calls`), filtered by payload `to` — ring / accept / decline / end.
- `components/CallOverlay.tsx`: full-screen LiveKit room, remote view + local
  picture-in-picture, mic + camera toggles, end, and report (wired to the
  existing report modal).
- `ChatScreen`: voice + video call buttons in the header.
- Credentials verified live (token mint, room create/list/delete) before deploy.
- Env: `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` added to Vercel
  Production and vaulted.


### Key rotation (2026-09-21)

- Vercel `SUPABASE_SECRET_KEY` updated to the rotated `sb_secret_` key (verified working).
- Added `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy anon JWT, verified working) so the client no longer depends on the mis-named publishable entry.
- Vault: rotated secret key, legacy service_role/anon JWTs and the new legacy JWT secret recorded.

## Prior verified baseline: `e192af3`

Everything at or before this commit is real, live, deployed code — this
includes round 37 (sessions/search/scrolltop/matchpct/customrole), round 38
(6 dark/6 light themes, splash wave fix), a match-percentage-badge color fix
(`.match-badge` now uses `var(--gold)`), Torree/wyzmind's own fixes for
Discover-page card scroll, wave vertical position (corrected in the round-42
bundle below — see its entry for why), and tutorial-popup first-time-only
behavior, round 39/40 (scroll-fade, Muses icon drop, availability/boost fixes,
forum pin, wave-breakpoint responsive fix), round 41 (the `.match-fab-scrim`
click-block fix plus the `AGENTS.md` wake-up-briefing rewrite), round 42
(match badge now tappable at z-index 7 with matching dark-glass styling,
`.wave-bottom` back flush to the bottom with height 22%→36% and a 4th stacked
wave layer for fullness), round 44 (signup now returns a real session —
`POST /api/muse/auth` with `action=register` now calls `signInWithPassword`
after creating the account so new users are authenticated immediately;
fails open — account still exists even if sign-in throws), round 45/46
(verify-banner z-index fix, booking error swallowing fix, stale sessions
list fix, apostrophe fix, match-failed error surfacing with distinct
429/403/other messages, 10-variant match-celebration animation replacing
the ~3-variant system with gradient-driven per-variant particles), and
Torree/wyzmind's own `e192af3` (match icon now sits atop title text at
15% larger size with float+pulse animation, title uses solid gold with
buttery PowerPoint-style keyframe animations (marquee, wave, typewriter,
fade-up), match percentage badge removed from discover cards, intent
picker buttons no longer have hover effects (two-tap highlight flow),
card-details has pointer-events:auto to fix dark section click-through,
matchTitleFade keyframes updated to buttery curve).
All confirmed merged — this specific SHA verified 2026-09-18 by fetching
`origin/main` directly and diffing actual file content (not trusting commit
messages), and re-running `tsc`/`vitest`/`next build` clean after merging each
into this session's own branch. No action needed on any of these.

**⚠️ Outstanding non-git action from round 37**: `sql/MUSE_CUSTOM_ROLE_PENDING_20260916.sql`
still needs to be run in the Supabase SQL editor (adds `custom_type_pending`/
`custom_style_pending` columns to `muse_profiles`) — this can't be verified
via `git log` since it's a database change, not a commit. If unsure whether
it's been run, check directly: `SELECT column_name FROM information_schema.columns
WHERE table_name='muse_profiles' AND column_name IN ('custom_type_pending','custom_style_pending')`.
Until it runs, saving a custom "Other" type/style will fail.

## Pending delivery — NOT in the codebase yet

## Known open issues (not blocked on delivery, just unsolved)

- `/api/muse/match?limit=50` returns 0 live candidates for at least one real
  account — backend/Supabase-data issue, not a client bug. Discover falls
  back to the static demo deck when this happens.
- ~~Dead legacy per-screen CSS block in `muse.css`~~ **RESOLVED** — the
  `.screen-<name>.active` block was deleted (68 lines) and replaced with a
  one-line note; only the live `.screen-el[data-screen="..."]` theming remains.
  Verified: no source file references `.screen-<name>.active`, CSS braces
  balanced, `tsc`/`vitest`/`next build` clean.

## Protocol for any agent picking up this repo (Claude, wyzmind, or anything
running via opencode)

1. Read this file first, every time, before reading any other handoff doc.
2. Run the verification commands above. Don't take the SHA in this file on
   faith if it's been a while — re-check.
3. If someone (Torreé, a chat transcript, another agent) describes work as
   "done" that you can't find as a commit ancestor of `origin/main`, say so
   plainly and point here — don't assume you're missing context and don't
   silently redo the work from scratch. Ask where the bundle is.
4. If you finish new work and can't push it directly, say so explicitly, add
   a row to the pending table above in the same commit as your work, and
   don't mark anything "confirmed merged" until `git log --oneline -1
   origin/main` actually shows your commit as an ancestor.
## Heartbeat — 2026-09-23 Round 56 — protected bundle integrated

owner | base `5d07bd4fed716e0b1a1d5c031d45d560364485b8` | files `muse.css`, `tests/e2e/*`, `tests/fixtures/*`, `tests/helpers/*`, `CODEX_PAGE_TSX_HANDOFF.md` | action: integrate ChatGPT/Codex protected bundle (Discover header simplify + 390px wrap, gold photo dots, e2e demo login seeding + /muse paths) | exact result: tsc cache-free exit 0 · eslint page.tsx exit 0 · vitest 53/417 exit 0 · next build exit 0 · pushed origin/main · deploy READY LIVE (see wyz_deploy_check) | blockers/UNVERIFIED: BLK-MIG-STATE (0022/0024/0025 applied-state — no DSN this session), BLK-CRON-VERCEL **CLEARED** (CRON_SECRET present in Vercel env 41d ago) | next: owner — migrate auth for 0022/0024/0025; assign next bundle
