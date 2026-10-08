# CLAUDE CODE — TASK PACKET (Muse)

> Third-agent work queue. The other two agents (opencode and ChatGPT/Codex) own the
> app source, commits, pushes, deploys, and DB/ops. **You (Claude Code) get the
> long-tail refactors and quality work** — the large, risky, or tedious items that
> shouldn't be rammed through at the tail of another agent's session.
>
> Everything here is self-contained and verifiable. Work top-down by size if you can
> only do a slice; every task stands alone.

---

## 0. HARD RULES (non-negotiable)

- **Never push to `main`.** Branch `claude/<topic>` → PR. One writer per file.
- **Never commit secrets.** No `.env*`, no keys. Vault is DPAPI (`.vault/`).
- **No em-dashes** in copy. Match the existing code voice.
- **Never `git add -A`.** Stage explicit paths only (another agent may have uncommitted edits in this same working tree).
- **Test before done.** Compile is not proof — run it.
- Windows host; the Bash tool is PowerShell 7. Port 3000 is Open WebUI — use `-p 31xx` for a dev server.

## STATUS (2026-10-08) — read this first

**Repo:** `main` last verified at `e4e0bf09`. Production live. Gate every change
must keep green: `tsc 0` / `vitest 1301 tests (166 files)` / `next build` clean /
`node scripts/audit-gate.mjs` (prod + full, exits 0). CI is **green**; the audit
gate allowlists one dev-only advisory (`braces`, no patched version exists) and
so a new advisory still fails it.
opencode owns merge+deploy — leave your work on a branch and hand it back (§5).

**DONE (by opencode — do not redo):** all XS, M-1 (`role=button` → native
`<button>`), M-2 (>=24px dot targets), L-3 (opt-in mutation-invalidated GET
cache + tests), XL-3 (`MUSE_REST_SCHEMAS` ~50 actions + tests). L-2 partial:
headers added to all 28 API route handlers (screens/components still need theirs
— that half is yours). XL-2 guardrail: `screen-size-budget.test.ts` freezes
NetworkScreen (1760) + SettingsScreen (1601). L-1 and M-3 are already satisfied.

**DONE (2026-10-08 batch, `opencode/env-password-waitlist-batch`) — do not redo:**
- **Env audit** — all 48 code-referenced-but-unset Vercel vars triaged;
  `UNSUBSCRIBE_SECRET` generated, set in prod/preview/development, vaulted.
  Artifact: `W:\WYZ_Command_Center\_STATE\MUSE_ENV_AUDIT_2026-10-08.md`.
- **Shared password policy** — `src/lib/password-policy.ts` (min 12, 3-of-4
  classes, space does not count as a symbol, whitespace/placeholder/repeated-char
  rejection) wired into `api/muse/auth/route.ts`, `reset-password/page.tsx`,
  `SettingsScreen.tsx`. Register/reset/Settings must all use it — never
  re-localize a validator in a client component.
- **Waitlist referral codes** — migration `0034` (applied), `src/lib/waitlist-queue.ts`
  (code gen + queue-position math), `?ref=` attribution, shareable invite link in
  `muse/landing/page.tsx`. The 409 duplicate response deliberately carries NO
  position/referralCode/shareUrl — the endpoint is unauthenticated, so returning
  them leaked a stranger's invite code. Do not put them back.
- **RLS** — `0035` wrapped all 64 `auth_rls_initplan` policies; `0036` + `0037`
  collapsed all 25 `multiple_permissive_policies` to one policy per
  (table, command, role). Advisor: 0 security, 0 initplan, 0 multi-permissive.
  Policies 94 → 81.
- **Dependency audit gate** — `scripts/audit-gate.mjs` replaced the two bare
  `npm audit` CI steps. It fails on any high/critical advisory that is not a
  specific reviewed GHSA id. One entry remains: dev-only `braces` with no patched
  version published. It self-tests its FAIL path every CI run.
- **`next` security patch** — next + eslint-config-next `16.3.6 → 16.3.8`; the
  production tree audits clean (0 high/critical) again.
- **Docs reconciled** — `ROADMAP.md` restated with measured numbers;
  `DELIVERY_STATUS.md` header moved `63f9d71` → `0d99220` (44-commit catch-up).

**Still open (low priority):** `unindexed_foreign_keys` (36) and `unused_index`
(63) advisor lints; the `sql/MUSE_SCHEMA_FULL_*.sql` dumps still predate
migrations 0001-0037 (the migration chain is the authority for a live DB, but a
fresh DB built from the dump would need the chain reconciled).

**ASSIGNED TO YOU (Claude):**
1. **XL-1 rolling `any` purge.** 3 files already done (`components/MatchCard.tsx`
   13→0, `modals/types.ts` 14→0, `components/DisclosureModal.tsx` 24→0); project
   total is **782**. Next worst-first: `lib/muse-actions/get.ts` (110),
   `screens/DiscoverScreen.tsx` (94), `screens/MenuModal.tsx` (47),
   `screens/NetworkScreen.tsx` (40), `screens/FeedScreen.tsx` (40), then the
   17-28 cluster. One PR per file/cluster.
   - Pattern that worked: type props/state with the real shared models
     (`components/types.ts`, `page-models.ts`, `modals/types.ts`, hook exports);
     add genuinely-missing fields to the shared type (we added `skills`/`audience`/
     `showMatchPercent` to `Match`); define a shared row type for distinct DB
     shapes (e.g. `ShootDisclosure`); use `!` only right after an existing
     truthiness guard TS cannot narrow through an inline closure. Never loosen
     behavior to satisfy types.
   - Verify each: `npm run typecheck` + `npm test` + `npm run build`; screenshot
     on-screen changes with `wyz_web_shoot.py`.
2. **XL-2 extraction.** Split `NetworkScreen.tsx` + `SettingsScreen.tsx` into
   `components/`/`hooks/` the way page.tsx was split, and LOWER the budgets in
   `screen-size-budget.test.ts` as blocks move out (never raise).
3. **L-2 remaining.** One-line purpose headers on the screens/components still
   missing a leading comment (~50 files).

**`next` is patched, not to be re-bumped casually.** next + eslint-config-next
went `16.3.6 → 16.3.8`, which cleared the whole advisory cluster (the fixed range
was `>=16.3.8`). Do **not** jump to `next@16.4.0` — that tree fails Vercel's
`npm install` ("Invalid Version"), as an earlier attempt found. The remaining
audit allowlist entry is dev-only `braces` (CVE-2026-93687, no patched version
published, unreachable from production code).

## 1. VERIFICATION GATES (must be green before you call a task done)

```
npm run typecheck     # tsc --noEmit            → 0 errors
npm test              # vitest                   → all pass (currently 161 files / 1234 tests)
npm run build         # next build               → clean
npm audit --omit=dev --audit-level=high          → 0 vulnerabilities
npx eslint <files-you-touched>                   → 0 errors on your files
```
Coverage ratchet lives in `vitest.config.mts` (81/70/86/86) and **may only go up** —
raise it if your work increases coverage.

## 2. INVARIANTS NOT TO BREAK

- `src/app/(muse)/muse/page-size-budget.test.ts` freezes `page.tsx` (currently 1221
  lines). **If you extract from it, lower the budget; never raise it.**
- `page.tsx` has **0 explicit `any`** and all 61 hooks in `hooks/` have colocated
  tests. Keep both true for anything you touch.
- The `/api/muse` dispatch validates via `validateRest` (`src/lib/muse-actions/restSchemas.ts`)
  — prototype-pollution + size + per-action field schemas. Don't weaken it.
- `0000_baseline.sql` is the schema source of truth for disposable DBs (proven with
  `supabase start`; do not edit it without re-validating).

---

## 3. BACKLOG

Sizes: **XL** = multi-day refactor · **L** = a focused multi-file session · **M** = an
hour or two · **S** = quick · **XS** = trivial/cleanup.

### XL — the big ones

**XL-1 · `any` drift purge.** The app is tsc-clean, but ~500 explicit `any` /
`as any` remain (historical). Purge them file-by-file, worst-first, verifying each.
Regenerate the current list with:
```powershell
Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  $n = ([regex]::Matches($c, ':\s*any\b|<any>|\bas\s+any\b|\bany\[\]')).Count
  if ($n) { [pscustomobject]@{N=$n; F=$_.FullName.Replace("$PWD\","")} }
} | Sort N -Desc | Select -First 40
```
Start with the hottest: `src/lib/muse-actions/get.ts` (~96), `screens/DiscoverScreen.tsx`
(~94), `screens/MenuModal.tsx` (~48), `screens/FeedScreen.tsx` (~40),
`screens/NetworkScreen.tsx` (~39). Then the screens (~20-30 each) and finally the
test fixtures. **Do NOT loosen behavior to satisfy types** — prefer real types,
`unknown` + narrowing, or `ReturnType<typeof x>` derivations. One PR per cluster.

**XL-2 · Split the two 1.6k-line screens.**
- `screens/NetworkScreen.tsx` (1766 lines)
- `screens/SettingsScreen.tsx` (1605 lines)
Extract cohesive sub-sections into `components/` (follow the existing screen pattern:
presentational component + props, state stays in the screen or a `hooks/` hook).
Add a `page-size-budget`-style ratchet for each so they can't regrow. Verify with
the same gates + a visual check (`wyz_web_shoot.py`).

**XL-3 · Finishing the `/api/muse` per-action schema split.**
`restSchemas.ts` currently types ~16 of ~120 actions (with `passthrough` for the
rest). Extend `MUSE_REST_SCHEMAS` with real field schemas for every remaining
mutating action (see the `ACTIONS` map in `src/app/api/muse/route.ts` for the full
list). Read each handler in `src/lib/muse-actions/*.ts` for its `rest.*` fields,
add `z.object({...}).passthrough()` with types + bounds. Add tests in
`restSchemas.test.ts`.

### L — a focused session each

**L-1 · Colocated tests for the remaining action handlers.**
`src/lib/muse-actions/*.ts` have route-level tests but not unit tests of the
handler functions themselves. Mock the service client and assert each handler's
happy path + its guard branches. (Extends the 61/61 hook coverage to handlers.)

**L-2 · Document the 121 undocumented files.**
Files without a leading `/** */` or `//` comment. Add a one-line header explaining
*why the file exists* (not what line 1 does). Low risk, wide surface — one PR.

**L-3 · Data-fetch layer (Roadmap 1.2 extension).**
`lib/api.ts` already has in-flight GET dedupe. Add a **short-TTL, mutation-invalidated**
cache on top (opt-in per call, cleared on any non-GET to the same origin), so
mount-time GET bursts collapse further. Do NOT cache auth responses or anything
the app reads from realtime. Add tests.

### M — a couple of hours each

**M-1 · Remaining `role="button"` → native `<button>` conversions.**
`grep -rl 'role="button"' src/app/(muse)/muse` — convert the ones that are genuinely
buttons (not cards with nested interactives). A global `KeyboardDelegate` already
handles keyboard, so this is polish, not a bug; skip any element that would nest
interactive children.

**M-2 · Clear the `target-size` a11y baseline.**
`tests/helpers/accessibility-helpers.ts` (`SHELL_KNOWN_GAPS`) still baselines
`target-size` for the Discover `card-photo-dot`s. Either enlarge the dot hit area
to ≥24px (keep the small visual dot) or document why it stays. Then remove the
baseline entry and run the a11y e2e.

**M-3 · Expand route tests.**
Add acceptance tests (demo-gate / auth / validation / rate-limit) for any route in
`src/app/api/**/route.ts` whose directory lacks a test, following the
`waitlist.route.test.ts` pattern. The cron/webhook/health routes are fine as-is.

### S — quick

**S-1 · Remove the local `supabase/` testing scaffolding** if it's still present and
untracked (leftover from disposable-DB work): `supabase/` should only contain what
the project intends to track. Confirm with opencode before deleting.

**S-2 · Triage the e2e visual snapshots.** `tests/e2e/visual-regression.spec.ts-snapshots/`
is untracked and win32-only. Decide: commit per-platform baselines with a
`snapshotPathTemplate`, or `.gitignore` them, or delete. Coordinate with opencode.

**S-3 · Sweep for stray `console.debug` in hot paths** and replace with the
error tracker where a failure is meaningful (`src/lib/errorTracker.ts`).

### XS — trivial / opportunistic (batch them)

- Dead exports / unused imports the linter can't see (type-only re-exports).
- Typos in comments.
- `aria-label` on any newly-touched icon-only button.
- Consolidate duplicated color/formatting helpers into `lib/`.

---

## 4. NON-GOALS (do not attempt — owned elsewhere)

- **Commits/pushes/deploys/Vercel config/migrations** → opencode. Hand your branch to
  opencode for merge (leave a note in `_STATE/handovers/` per the shared board).
- **Supabase dashboard/DB/RLS/branching** → ChatGPT/Codex + owner. Branching and
  leaked-password protection are **Pro-plan gated (billing)**.
- **Business/legal** (NCMEC, counsel, LA cohort) → owner.
- Changing the migration chain / `0000_baseline.sql` without re-validating on the
  disposable DB (`supabase start` + `supabase db reset`).

## 5. HOW TO HAND OFF

When a branch is green, write `_STATE/handovers/<date>-claude-to-opencode-<topic>.md`
(summary, files, the exact verification you ran, anything you couldn't finish) and
tell opencode. opencode owns the merge + deploy. Keep `main` untouched by you.
