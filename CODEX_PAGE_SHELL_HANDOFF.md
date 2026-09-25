# Codex page-shell extraction — Bundle P1

**Status:** PARTIAL (local implementation; not staged, committed, or deployed;
cache-free project gate remains unverified in the Codex runner)

## Scope and ownership

- Initial base revision: `a379058`; current local integration base is
  `b0fb457` (Priority-A E2E-only commit). The current commit changed Wyzmind's
  test files, not this bundle's source manifest; the page bundle still applies
  cleanly but must be gated on `b0fb457` or its successor.
- Codex-owned files:
  - `src/app/(muse)/muse/page.tsx`
  - `src/app/(muse)/muse/page-constants.ts`
  - `src/app/(muse)/muse/page-models.ts`
  - `src/app/(muse)/muse/lib/initials-avatar.ts`
  - `src/app/(muse)/muse/lib/initials-avatar.test.ts`
  - `src/app/(muse)/muse/components/PageSplash.tsx`
  - `src/app/(muse)/muse/components/MatchOverlay.tsx`
  - `src/app/(muse)/muse/components/ReportModal.tsx`
  - `src/app/(muse)/muse/muse.css`
  - `src/app/(muse)/muse/components/DailyLoginModal.tsx`
- Wyzmind-owned concurrent files are excluded, including `tests/e2e/*`, `tests/fixtures/*`, and `tests/helpers/*`.

## Problem evidence

Before this extraction, `page.tsx` was 4,237 lines / 320,762 bytes, with 46 `useState` calls, 41 effects, and 36 callbacks. It already composes extracted screens but remains an oversized client controller. A single rewrite would be unsafe; this bundle starts the required parity-tested extraction with pure contracts and utilities.

## Changes

1. Moved the deterministic, network-free initials SVG fallback into `lib/initials-avatar.ts`.
2. Added direct unit coverage for determinism, initials output, and the empty-name fallback.
3. Moved page-only API/view domain contracts to `page-models.ts`.
4. Moved demo-mode/configuration values and match-animation configuration to `page-constants.ts`.
5. Moved the misplaced role import to the top-level import block.
6. Extracted the hydration splash markup into `components/PageSplash.tsx`.
7. Extracted the match-celebration dialog into `components/MatchOverlay.tsx`,
   retaining its backdrop-close behavior, labelled close action, message flow,
   image fallback, animation configuration, and current user/match avatars.
8. Extracted the report dialog into `components/ReportModal.tsx`, centralizing
   the duplicated pointer/keyboard report mutation while retaining the exact
   request payload, focus-trap attachment, labelled close/back actions, and
   close/reset behavior.
9. Added a ≤340px Discover-wordmark override. Live production evidence at
   320px showed the existing 30px wordmark truncating to `Disc…`, while the
   four header controls were correctly 44px and the document had no overflow.
   The source change scales only that wordmark to 24px at this breakpoint.
10. Extracted the daily-login overlay into `components/DailyLoginModal.tsx`,
    retaining backdrop dismissal, the streak widget, persona-aware copy, and
    the View Quests transition.

No user flow, demo-mode value, API call, mutation, provider, storage, or deployment behavior was intentionally changed.

## Verification record

- Cache-free TypeScript before the match-overlay extraction:

  ```text
  .\\node_modules\\.bin\\tsc.cmd --noEmit --incremental false
  exit 0
  ```

  The foreground Codex runner terminates the post-extraction cache-free
  compiler at roughly 30 seconds without reporting a compiler exit code. A
  project-local background invocation was started after item 8 but had not
  produced an exit file at the latest poll. The project gate is therefore
  **UNVERIFIED after item 8**, not a pass. Wyzmind must run this exact command
  from its normal shell.

- Focused ESLint after all ten source extractions:

  ```text
  .\\node_modules\\.bin\\eslint.cmd page.tsx MatchOverlay.tsx PageSplash.tsx ReportModal.tsx DailyLoginModal.tsx page-constants.ts page-models.ts initials-avatar.ts initials-avatar.test.ts
  exit 0
  ```

  The focused lint command above includes `DailyLoginModal.tsx` and passed
  after item 10. Its direct TypeScript module check exceeded this runner's
  30-second foreground limit, so type safety for item 10 remains covered only
  by the required Wyzmind project typecheck.

- Direct module typecheck after the report-dialog extraction:

  ```text
  .\\node_modules\\.bin\\tsc.cmd --noEmit --jsx preserve --esModuleInterop --skipLibCheck MatchOverlay.tsx PageSplash.tsx ReportModal.tsx
  exit 0
  ```

  This checks the newly extracted component modules only; it is not a
  substitute for the required cache-free project typecheck.

- Whitespace validation:

  ```text
  git diff --check [Codex files]
  exit 0
  ```

- Live production observation before the unintegrated CSS correction:

  ```text
  https://muse.wyzdesign.com/muse @ 390×844:
    document scrollWidth/clientWidth = 390/390
    Discover header height = 68px
    Search, Preferences, Map, Boost = 44×44px each

  https://muse.wyzdesign.com/muse @ 320×568:
    document scrollWidth/clientWidth = 320/320
    Discover header height = 68px
    Search, Preferences, Map, Boost = 44×44px each
    rendered title visibly truncated to `Disc…` (the reproduced defect)
  ```

  The 320px CSS correction is local only and **not yet browser-verified**;
  Wyzmind must check the full `Discover` label at 320px after integration.

- Full Vitest result after the SVG data-URI correction:

  ```text
  .\\node_modules\\.bin\\vitest.cmd run
  Test Files 55 passed (55)
  Tests 425 passed (425)
  exit 0
  ```

Earlier Vite temporary-file permission failures are superseded by this actual
full-suite result. Wyzmind must still rerun the suite on its exact integration
candidate rather than accepting this local result as integration proof.

- Production build attempt on the combined worktree:

  ```text
  npm run build
  ✓ Compiled successfully in 15.7s
  ✓ Completed runAfterProductionCompile in 4.5s
  Running TypeScript ...
  runner foreground limit reached before an exit code
  ```

  This is partial compiler evidence only, not a successful build gate.

- E2E attempt on the combined current worktree:

  ```text
  npm run test:e2e
  Running 1485 tests using 4 workers
  runner foreground limit reached before results
  ```

  This is **UNVERIFIED**, not an E2E pass. Wyzmind should use the Priority-A
  deterministic width matrix to run the affected browser scopes in its normal
  integration shell.

## Wyzmind review / integration actions

1. Review the actual diff, including the new static modules, for client-boundary and behavior parity.
2. Run the targeted avatar test, then full cache-free TypeScript, focused lint, full Vitest, E2E, and build from the exact integration candidate.
3. Do not include generated `_LOGS_dev_*` files or `node_modules_broken_bak/`.
4. If all gates pass, integrate as one bounded architectural commit; Wyzmind alone then performs build/push/deploy/live verification.

## Remaining page-shell work

P2 must be a separate reviewed bundle: extract cohesive controller hooks (auth/bootstrap persistence first), with explicit hook contracts and transition tests. Do not move render-heavy modals or rewrite the entire shell until P2 parity tests exist.
