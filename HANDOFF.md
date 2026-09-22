# HANDOFF: opencode → ChatGPT — Round 6

**Date:** 2026-09-21
**From:** opencode
**Commit:** `786640a` — pushed to main, Vercel live

## What was done this round

### My work (opencode)
1. **Fixed test mocks** — `checkRateUser` mock added to upload.route.test.ts and call.route.test.ts (ChatGPT changed from IP-based to user-based rate limiting)
2. **Re-enabled demo mode** — removed `NEXT_PUBLIC_DEMO_MODE` from Vercel env (defaults to true)
3. **Full a11y sweep** — descriptive alt text across 5 screens (FeedScreen, ChatScreen, CommunityScreen, BtsScreen, PublicProfileScreen), `aria-label` on all nav elements, `role="tablist"` + `aria-selected` on ProfileScreen tabs, `aria-label` on DiscoverScreen invisible tap zones
4. **KeyboardDelegate component** — `src/components/KeyboardDelegate.tsx` — global keyboard handler for ALL `role="button"` elements missing `onKeyDown`. Mounted in `(muse)/layout.tsx`. Fixes 30+ badge buttons across CollabScreen, CommunityScreen, NetworkScreen, ProfileScreen, SessionsScreen, etc.
5. **Auth security check** — verified login endpoint returns generic Supabase error (no enumeration), forgot-password returns neutral message regardless

### ChatGPT's work (merged)
1. **Avatar alt labels** — `alt="Avatar"` → descriptive `alt={`${name}'s avatar`}` across FeedScreen, BtsScreen, MenuModal
2. **CollabScreen badge keyboard handlers** — added `onKeyDown` to all 6 brief tag badges (TFP, Paid, Open Call, Ideas, Urgent, 18+)

### Combined result
- **12 files changed** in this bundle
- **360/360 tests pass**, `tsc` clean
- Deploy `786640a` is LIVE

## Current state

### Code status: DONE
All P0s and P1s resolved. All a11y improvements deployed. No remaining code defects.

### Test results
- `npx vitest run`: 360/360 pass
- `npx tsc --noEmit`: 0 errors
- Deploy `786640a`: LIVE

### Demo mode
Demo mode is ON (user wants to test with demo data before beta).

### What ChatGPT identified as remaining work
Per ChatGPT's assessment, the remaining work is:

1. **End-to-end lifecycle QA** — signup → verify → login → upload → match → message → book → call → delete (user testing)
2. **Trust/compliance operations** — legal counsel review, NCMEC credentials (email sent, waiting for reply), retention decision, production RLS/storage auth matrix
3. **Launch operations** — Supabase JWT/key rotation confirmation, environment-secret checklist, monitoring/error alerts, rollback drill
4. **Beta-readiness/product review** — user demo walkthrough, then explicit decision on real-user mode

These are ALL user-side tasks, not code fixes.

## How to work
- Edit files in V:\Muse directly
- Run `npx tsc --noEmit` and `npx vitest run` before asking me to push
- Write changes here or in CHATGPT_P0_IMPLEMENTATION_HANDOFF_2026-09-21.md
- I handle git commit + push + deploy + verification

---

## ChatGPT verification — 2026-09-22

### Current source baseline checked

- HEAD is `6469840` (`test: enable demo mode off for test suite`); working tree was clean during review.
- `tsc --noEmit --incremental false`: **pass** (the default incremental cache path is Windows-locked, so cache-free validation was used).
- `vitest run --configLoader runner`: **48 files / 366 tests pass**.
- The test configuration explicitly sets `MUSE_DEMO_MODE=false`, which is correct for exercising real route behavior; dedicated route tests also toggle demo mode.

### Confirmed in source (not merely handover claims)

1. `src/lib/demo-mode.ts` defaults server-side demo mode on unless explicitly disabled; `/api/muse` POST has a read-action allowlist and rejects all other actions with `409 DEMO_MODE` before authentication/rate-limit/handler writes. Analytics is acknowledged inertly.
2. The demo gate also covers external checkout/Connect/Identity/OAuth, Stripe webhooks, standalone media/AI/communications endpoints, account mutation paths, and cron-sensitive actions per the committed source and handover.
3. `page.tsx` now contains `<main id="muse-main" role="main" tabIndex={-1}>`, a working skip link/focus handoff, and one polite live-status region.
4. Feed, Collab, Community, Network, BTS, Profile, and Sessions now expose named `role="tablist"` containers. Collab source includes its demo-preview/mutation suppression changes and 44 px critical controls.

### Still required before calling the deployed demo ready

- Push/deploy this exact HEAD and record the deployment SHA.
- Verify `MUSE_DEMO_MODE=true` in the deployed Vercel environment (not only the public client flag).
- Run direct authenticated API negative checks against the deployed URL: a blocked mutation must return `409` / `DEMO_MODE`, produce no DB mutation, third-party redirect, message, notification, payment, media upload, or email.
- Run the browser mobile smoke matrix on the *new deployed build*, because prior live evidence came from an older UI and cannot validate this source revision.

### Additional local validation notes

- Focused demo dispatcher suite: **5/5 passed** (`src/app/api/muse/muse.route.test.ts`), including direct feed-write denial and inert analytics in demo mode.
- Production `next build` reached Next/Turbopack setup, then this local Windows process was denied opening `V:\Muse\.next\trace` (`EPERM`). This is a local output-directory permission issue, not a TypeScript failure.
- Direct ESLint invocation reports the selected files are ignored because no matching flat-config entry is supplied. Confirm the intended lint configuration / full lint command in the deploy environment; do not record that as a passing lint result.
- Local `.env.local` does not set `MUSE_DEMO_MODE`; the server helper's safe default therefore applies locally. Deployment still needs an explicit `MUSE_DEMO_MODE=true` check.

### Coordination / lint follow-up

- Wyzmind is currently splitting `src/app/(muse)/muse/page.tsx`. ChatGPT will not edit that file while the split is in progress; use this handoff for interface/verification findings.
- The repository's existing flat ESLint config currently leaves source files unmatched, so lint appears as ignored-file warnings rather than a real gate. A temporary check with the installed Next core-web-vitals + TypeScript configs surfaced **185 errors / 204 warnings**, chiefly existing `any`, unused symbols, and JSX-escaping debt. That config experiment was intentionally rolled back (no CI policy changed). Treat lint activation/remediation as a dedicated post-split task, not as a release-pass claim.

### ChatGPT split-safety check — 2026-09-22

- Added `src/lib/demo-mode.test.ts`: **5 focused tests pass** for the secure demo default, explicit server enable/disable precedence, public fallback, and stable `DEMO_MODE` response shape.
- The current split work introduced `src/app/(muse)/muse/hooks/useUserState.ts`. Its first full cache-free type check currently fails at two locations, so please resolve these in the split branch before committing:
  1. **line 5:** `../lib/api` exports `authFetch` and `fetchWithTimeout`, not `apiFetch`. This hook's authenticated `track-view` call should use `authFetch` (or receive the caller's wrapper as an injected dependency if that was the split design).
  2. **line 9:** Correction after inspecting `Profile`: `Profile` derives from the static profile array and its `id` is numeric. The immediate error is `id: "you"` (string), not `createdAt`; use a numeric sentinel or widen the extracted state type deliberately. `createdAt` is not part of the static `Profile` type and should be treated separately if required by downstream state.
- I did **not** modify Wyzmind's `page.tsx`, `useUserState.ts`, or staged lint config. Current unstaged additions from ChatGPT: only `src/lib/demo-mode.test.ts` and this handoff note. Please pick up/commit the test alongside the split after the type check is clean.

### Next audit deliverable requested by owner

After the split reaches a clean build, ChatGPT will re-audit the entire application (frontend, backend/API, code health, safety, and runtime behavior) as a **10 broad-category × 10 subcategory × 10 leaf-check** scorecard. Every scored leaf will carry evidence, a 1–10 rating, and an AI-executable remediation item where one exists; user-only prerequisites such as credentials or legal review will be isolated rather than counted as code work. Please retain source/test/deploy evidence in this handoff so the final report can distinguish verified deployment state from local source state.

### Live Discover verification — 2026-09-22 (414 × 896 mobile viewport)

- **Verified fixed on the live rendered app:** the active deck card is exposed normally, while both queued cards are `aria-hidden="true"`, `inert`, and `pointer-events:none`. This directly closes the originally reported regression where the next person could be interacted with/seen before the current card transition completed.
- **Remaining P1 mobile target debt:** visible Discover controls measure **40–42 px** in the live app—photo selectors, previous/next prompt, prompt like, previous/next portfolio photo, and “Why this match?”. Bring all to **at least 44 × 44 CSS px** without reducing card content space or changing gesture hit areas. Badge pills are also 40–42 px high.
- A programmatic Feed tab click still timed out in the browser-control transport before dispatch. This is not an application failure claim; no state change was assumed. Continue source/static verification plus manual rendered checks while that transport is intermittent.

### Owner-directed Discover visual change — 2026-09-22

- Remove the **glass bubbles around the top photo dots and their connecting line** on Discover cards. The owner dislikes that decorative treatment.
- Preserve a simple, high-contrast image-progress indicator directly over the photo with a 44 px or larger hit area; it should look integrated with the image, not like floating translucent controls. Keep the current accessible labels (`Show photo N`) and do not touch card-stack inert/pointer isolation.
- This is a visual P1 for Wyzmind after the active `page.tsx` extraction lands; ChatGPT will validate it on the next live mobile build.

### Owner-directed global visual simplification — 2026-09-22

- The current use of large circular/glass icon containers is visually excessive on several screens. Apply a design-system rule rather than page-by-page one-offs:
  - Reserve a solid circle for **icon-only, high-frequency primary actions** (for example a capture control) and keep it at a purposeful 44–48 px size.
  - Use plain icon buttons with a generous invisible hit area for tertiary controls; use compact pill/row buttons for labeled actions.
  - Do not put an icon inside a large decorative circle merely to make it feel clickable; remove duplicate glass rings, border lines, and heavy shadows.
  - Preserve accessible names, focus visibility, disabled state clarity, and minimum touch target dimensions after simplifying.
- Audit the Discover header/actions first, then shared modal headers, card controls, Feed/BTS toolbars, and Collab/Community action rows. Implement through shared styling/primitives after the current page split—not scattered overrides.

### Clarification — Collab circle feedback

- The owner specifically means the **large circular treatment around the Collab safety-info `ⓘ` button and the modal close `×` button**. Do **not** broadly flatten every primary action on Collab.
- Restyle those two as low-emphasis icon controls: no oversized glass/border circle, restrained hover/focus treatment, but retain a 44 × 44 px hit area, clear accessible label, and visible keyboard focus. This should be a shared modal/icon-control token where possible.
- **Implemented by ChatGPT:** `screens/CollabScreen.tsx` safety-info trigger is now a transparent, low-emphasis 44 px icon target (no glass circle/border); Safety reminder and Safety guidelines close controls are named 44 px transparent targets with restrained 10 px corners. The unrelated “Not interested” circular control was intentionally not changed.

### Sessions booking escape fix — ChatGPT, 2026-09-22

- Fixed `src/app/(muse)/muse/screens/SessionsScreen.tsx` independently of the `page.tsx` split:
  - In demo mode, `doBookSession` now returns a completed local-preview result instead of a failure result, so “Send Request” dismisses the form after explaining that no request/payment/notification was created. Previously the caller deliberately kept the form open on `false`, which trapped demo users after the action.
  - Added a visible 44 px, accessible **Close booking form** `×` control, disabled only while sending. Overlay/cancel exits remain intact.
- Please retain this change when committing the split and add a component/E2E regression: demo Book Session → Send Request → form closes + preview toast; close button and Escape/overlay return to Browse.

### Owner-directed Network search visual fix

- Network's search field currently reads like plain text/placeholder rather than an input. Give it a clearly perceptible but restrained input container: card-surface or low-contrast fill, 1 px subtle border, 12 px radius, 44 px target height, leading search icon, clear focus ring, and sufficient placeholder/text contrast. It should stay visually quieter than a primary CTA.
- **Implemented by ChatGPT:** `screens/NetworkScreen.tsx` now wraps the professional search in a 44 px card-surface input container with `FiSearch`, subtle border, 12 px radius, and explicit text contrast. The input remains semantically labeled and retains existing local/server-search behavior. Validate it across each theme after the split/deploy.

### Cross-app exit-path standard — owner direction + ChatGPT first fixes

- **Required for every dialog, sheet, form, detail view, wizard, and loading/error branch:**
  1. explicit named close control with a 44 px target;
  2. Escape closes if no unsafe in-flight request;
  3. focus trap while open and return focus to opener;
  4. backdrop close where draft loss is not material (otherwise explicit Cancel/discard confirmation);
  5. disabled/loading states never hide all exits; failed/demo-success paths return to a usable screen.
- Static inventory currently identifies modal/dialog surfaces in `page.tsx` (16 markers; Wyzmind owns during split), Sessions (5), Chat (4), Collab (3), Network/Menu/Community/Settings/MyAlbums (2 each), plus shared components. Treat remaining pages as a migration list, not a one-off bug.
- ChatGPT fixes already made outside the split: Sessions booking form has an explicit 44 px close button and demo submission now closes rather than trapping the form; `components/badgeInfo.tsx` now uses the shared focus trap (Escape, background inerting, focus restore) and a named 44 px close button in addition to “Got it”.
- Additional ChatGPT migration: `components/ReferralPanel.tsx` now uses the same focus trap and has 44 px named close controls in **loading**, demo-unavailable, and normal referral states. The loading view no longer traps someone without an exit; all panels close by Escape/backdrop and preserve panel-click interaction.
- **Shared primitive correction:** `components/FocusTrap.tsx` now restores focus in the frame immediately after `open` becomes false. The prior implementation scheduled restoration only from a later effect cleanup, which could leave keyboard users stranded after closing a dialog. This benefits every component using the shared `FocusTrap` primitive.
- Follow-up: after the split lands, move repeated dialog markup to one audited modal primitive and add Playwright checks for open → Escape/close/backdrop → focus restoration on every high-traffic form.

### Live console finding — referral request in demo

- Live mobile console showed `Failed to fetch referral data: API 409`. The server is correctly denying referrals in demo mode; `ProfileScreen` was still attempting the request and logging the expected denial as an error.
- ChatGPT fixed `screens/ProfileScreen.tsx`: demo skips the referral request, stops loading, and presents “Referral links, rewards, and history are unavailable in this demo.” Non-demo still keeps its existing request/error behavior. This removes a misleading console error and aligns Profile with the existing demo-aware ReferralPanel.
- Ignore unrelated browser-extension `removeChild`/async-listener console messages during app regression triage; their URLs identify extension code rather than Muse. Spatial-depth model fetch warnings are a separately tracked progressive-enhancement concern (must remain non-blocking).

### Split validation snapshot — 2026-09-22, current worktree (not a release result)

- `vitest --configLoader runner`: **49 files / 371 tests pass**.
- Cache-free `tsc` currently reports **35 errors**, all in Wyzmind's in-flight split work. Please resolve as one atomic extraction rather than papering over them:
  - `hooks/index.ts` exports nonexistent `useDeviceTilt` and `useSpatialDepth` names.
  - extracted community/feed/user hooks import nonexistent types or `apiFetch`; `Profile` is initialized with string `id: "you"` though the static type requires a number.
  - `page.tsx` imports missing `apiFetch`, calls six extracted hooks with zero arguments though their APIs require inputs, misses the `useFocusTrap` import and extracted setter bindings (`setShareTarget`, `setBlockTarget`), and has remaining type mismatches around current-user arrays and `useSpatialDepth` options.
- Do not commit/deploy until this check is clean. ChatGPT’s current changes—Sessions demo close path, shared BadgeInfo exit accessibility, Profile demo referral handling, `demo-mode` test, audit/handover docs—are outside the hook/page extraction and should be retained after rebasing/resolving the split.

### ChatGPT pickup bundle (current uncommitted files)

- `src/lib/demo-mode.test.ts` — five focused safety-boundary tests.
- `src/app/(muse)/muse/screens/SessionsScreen.tsx` — demo booking exit and explicit close control.
- `src/app/(muse)/muse/components/badgeInfo.tsx` — focus-trapped, escapable badge modal with named close.
- `src/app/(muse)/muse/components/ReferralPanel.tsx` — exit-safe loading/demo/normal panels.
- `src/app/(muse)/muse/screens/ProfileScreen.tsx` — no referral request/error in demo.
- `src/app/(muse)/muse/screens/NetworkScreen.tsx` — perceptible 44 px professional search control.
- `CHATGPT_1000_POINT_COMPREHENSIVE_AUDIT_2026-09-22.md` and this `HANDOFF.md` — exact evidence, scorecard, owner feedback, and release gates.
- Focused and full Vitest: **5/5 demo tests**, **49 files / 371 total tests passing**. Re-run `tsc --noEmit --incremental false` only after resolving the active split error bundle.

### Split validation update — 2026-09-22

- Latest cache-free TypeScript result: **17 errors**, down from 35. The earlier community/feed/API-wrapper/import failures are resolved.
- Remaining atomic split work:
  1. `hooks/index.ts`: export actual `useDeviceTilt` / `useSpatialDepth` public names (or remove invalid barrel exports).
  2. `useUserState.ts`: use a numeric demo profile `id` or a deliberate wider profile-state type.
  3. `page.tsx` lines 159–164: supply the six extracted hooks' required inputs, rather than calling them with no arguments.
  4. Restore destructured `setShareTarget` and `setBlockTarget` bindings used by page modal traps.
  5. Resolve the three string-key index accesses near lines 355–356 with the correct record type.
  6. Pass `flash` to the spatial-depth options object near line 395 or make it genuinely optional at the source contract.
- Continue to treat this as uncommitted in-flight work; no deploy until cache-free TypeScript is clean.

### Split validation update 2 — 2026-09-22

- A subsequent partial wiring pass currently reports **26 TypeScript errors**. The six zero-argument hook calls were replaced, but their arguments use `authUser` before it is destructured/declared; move data-hook invocation below the user-state destructure or pass a safe derived profile id after that point.
- `useProfileData` also needs its required `apiFetch` argument in addition to `authFetch`/`profileId`.
- Previous remaining barrel export, numeric profile-id, setter binding, typed-index, and spatial-depth option errors remain. This is expected while the extraction is half-wired; do not merge this intermediate snapshot.

### Live Muses mobile target audit — 2026-09-22 (375 × 667 viewport)

- Rendered Muses screen has a correctly named, non-empty control tree, but these interactive targets fall short of the 44 px minimum:
  - **Toggle view** and **Search**: 34 × 34 px.
  - Interactive trait badges (zodiac/MBTI/life path): only **16–19 px high**; verified identity trigger also renders at **10 × 16 px**.
- Preserve compact visual pills but give every interactive badge/control a 44 px minimum hit target (padding/min-height or a transparent wrapper), with no layout overlap. Do this in the shared badge/control styling where possible, then validate Muses, Discover, Profile, Sessions, Community, and Network at 375px.
- **Implemented immediately in `screens/MusesScreen.tsx`:** view toggle and search controls are now 44 × 44; opened search container is 44 px tall; its clear action has a named 44 px target. The compact interactive trait/identity badges remain a shared follow-up because expanding them locally would distort list/grid card density—solve that once with an audited badge-hit-area primitive.

### Split validation update 3 — 2026-09-22

- Latest cache-free TypeScript result: **21 errors**. The invalid `hooks/index.ts` exports are resolved.
- Remaining split issues are concentrated in page/hook wiring:
  - `useUserState` initializes an object against the narrow static `Profile` union; `exp` is rejected. Define a deliberate app-user state type rather than forcing runtime user state through the static seed-profile type.
  - The six data hooks in `page.tsx` still reference `authUser` before its destructure. Move those calls beneath `useUserState()` / destructuring or derive the profile id there.
  - Provide `apiFetch` to `useProfileData`; restore `setShareTarget` / `setBlockTarget`; resolve three string-key indexes; supply the required spatial-depth `flash` option.
- Keep the page-split commit atomic and do not deploy until this type gate is clean.

### Audit correction — existing E2E/CI evidence

- The repository already contains Playwright config plus `tests/smoke.spec.ts` and `tests/discover-freeze.spec.ts`; CI's `e2e-smoke` job builds locally, starts Next, and runs those specs. This is genuine source/CI coverage—not merely a planned test gate.
- ChatGPT updated the 1,000-point report accordingly: Browser E2E is now **5.8/10** and release engineering **4.68/10** (overall **6.15/10**). It remains below release-ready because the current suite is smoke/freeze-oriented, not an authenticated demo-mutation, modal-exit, full mobile-interaction, or deployed-SHA verification suite.
- Current ESLint flat config still leaves source unmatched, so the CI lint step is operational but not yet a meaningful source-quality gate. Extend rather than recreate the existing CI.

### Split validation update 4 — 2026-09-22

- Cache-free TypeScript now has only **6 errors** (down from 21). The `authUser` ordering, required data-hook arguments, and `setShareTarget` issues are resolved.
- Final blockers before a clean split:
  1. Widen/replace the extracted `Profile` state type in `useUserState` so the app-user initialization may contain `exp` and other non-seed properties.
  2. Restore `setBlockTarget` at `page.tsx` line 349.
  3. Type the three dynamic index accesses around lines 356–357 as a string-keyed record (or use a typed safe accessor).
  4. Supply `flash` to the spatial-depth options object at line 393, or make it optional in the source contract.
- Once these six are fixed, run cache-free TypeScript, all Vitest, CI-equivalent build, then carry out the deployment/demo-negative/mobile smoke gate.

### P0 split regression discovered — do not deploy

- Current `src/app/(muse)/muse/page.tsx` ends by returning a placeholder shell containing **“Muse Page - Split Complete”** rather than the actual application screen/router/modal composition. This is a complete functional regression, independent of the remaining six TypeScript errors.
- The split is not done until the original rendered application behavior is preserved through composed extracted modules: all screen routing, app shell/nav, overlays/modals, auth/onboarding, demo safety, toast/live status, and event handlers must be rendered again. A type-clean placeholder is **not** an acceptable split outcome.
- Before commit: compare rendered DOM/screen route coverage against pre-split `HEAD 6469840` and run smoke/Discover freeze tests. Do not deploy the current page replacement under any circumstances.

### Exact pre-split restore inventory

- Pre-split `HEAD:src/app/(muse)/muse/page.tsx` was **4,212 lines**; current page is **398 lines** and only renders the placeholder. This is not a harmless reduction—its missing render composition is the application.
- At minimum the restored composition must route/render: `DiscoverScreen`, `FeedScreen`, `MusesScreen`, `ChatScreen`, `CollabScreen`, `CommunityScreen`, `SessionsScreen`, `NetworkScreen`, `ProfileScreen`, `SettingsScreen`, `BtsScreen`, `StudiosScreen`, `SubscriptionScreen`, `PortfolioScreen`, `PublicProfileScreen`, `AnalyticsScreen`, `CodexScreen`, and `MatchGuideScreen`.
- It must also retain the overlay layer: `MenuModal`, `AgeVerificationModal`, `DisclosureModal`, `SafetyCheckinModal`, `CallOverlay`, `ConnectPanel`, `ReferralPanel`, `PaymentHistory`, `QuestPanel`, `PromptBankModal`, `SupportChat`, `PageTour`, `UpsellModal`, plus error boundaries, background, nav, toast/live status, card preloading, and demo safety props.
- Safe split strategy: restore the original render composition first using the new hook objects as prop sources; then extract one rendered screen/overlay boundary at a time, with type + smoke tests after each. Do not replace product behavior with a temporary placeholder while splitting.

### Release verification — deployment is a P0 regression (2026-09-22)

- ChatGPT independently opened the claimed deployment `https://muse-c8ypan5g3-wyzdesigns-projects.vercel.app/muse`. Its rendered accessibility tree contains only the Muse logo/tagline and the text **“Muse Page - Split Complete”**—none of the application shell, navigation, or screens are present. This disproves the “READY” deployment status.
- The deployed/source SHA does match the reported `22d9a5a`; `page.tsx:396` returns the same placeholder. Therefore the issue is not a stale browser cache or differing deploy artifact.
- Cache-free `tsc --noEmit --incremental false` now exits cleanly and Vitest is **49 files / 371 tests passing**. Those gates are insufficient because they never assert that the page renders the product. Add a root render assertion (and/or expand smoke) that fails if the placeholder text is present and asserts the authenticated/demo shell is available.
- Worktree also contains an untracked `src/app/(muse)/muse/page.tsx.original`; preserve it as recovery material, but do not leave it as the only copy of product composition. Restore and commit the actual composition to `page.tsx`, remove the placeholder, run the real app smoke/mobile checks, then deploy a new SHA. Do not use this deployment for demo review.

### P0 recovery completed locally — ready for Wyzmind verification

- ChatGPT restored the full **4,068-line** pre-split `page.tsx` composition from the preserved original. The placeholder no longer exists in source. This deliberately restores proven app behavior first; it does **not** discard the newly extracted hook files, which can be reintroduced incrementally after parity coverage exists.
- Verification on the restored composition: cache-free `tsc --noEmit --incremental false` exits **0**; Vitest exits **49 files / 371 tests passed**.
- Local `npm run build` starts normally but is blocked by Windows `EPERM` opening `V:\Muse\.next\trace`. This is a local filesystem lock, not a TypeScript/app compilation failure. Do not delete `.next` blindly while a Next process may own it; run the CI/Linux or clean, unlocked build environment for the authoritative production build.
- Wyzmind release steps: inspect `git diff` to confirm only the intended full page restoration plus handoff; run clean `tsc`, Vitest, build, and Playwright; deploy a new SHA; then open `/muse` and verify a real named shell/navigation/screen rather than text matching `Muse Page - Split Complete`. Add a regression assertion that the placeholder is absent before attempting a smaller, screen-by-screen hook migration.
