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

## Confirmed merged, last verified at: `9b584cb`

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