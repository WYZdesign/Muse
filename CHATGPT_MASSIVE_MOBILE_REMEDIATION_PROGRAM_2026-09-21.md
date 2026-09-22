# Muse Massive Mobile Remediation Program — ChatGPT — 2026-09-21

## Objective

Clear the mobile interaction, accessibility, responsive, and regression debt as **parallel implementation bundles**, not individual tickets. Demo mode remains on. Wyzmind should own implementation/test/deploy; ChatGPT continues live validation and post-deploy rechecks.

## Bundle 1 — Discover swipe-card state machine (P0 interaction correctness)

Source handoffs:

- `CHATGPT_DISCOVER_SWIPE_STATE_BUNDLE_2026-09-21.md`
- `CHATGPT_DISCOVER_POST_DEPLOY_VERIFICATION_2026-09-21.md`

Deliver together:

- Explicit active/exiting/promoting card lifecycle.
- One mutation and one advancement per action; lock while transition is pending.
- Outgoing card remains visually topmost until completion; incoming identity/content not visible early.
- Non-active cards use `inert`, `aria-hidden`, and `pointer-events:none`.
- Transition-end-driven promotion; reduced-motion equivalent.

Acceptance: 60fps Pass/Like/Super Like recordings at 320/390/414px; rapid-tap/swipe test; touch/keyboard parity; exactly one mutation per action.

## Bundle 2 — Discover carousel and action primitive (P0 a11y / P1 UX)

Source handoff: `CHATGPT_DISCOVER_CAROUSEL_SEMANTICS_BUNDLE_2026-09-21.md`

Deliver together:

- Remove duplicate portfolio prev/next controls (native button only).
- One reusable accessible carousel primitive for profile photos, prompts, and portfolio.
- 44px effective media, pagination, prompt, rationale, and match-action targets.
- No focusable display-only metadata; clear selected/current slide state.
- Isolate carousel gestures from match-card swipe gestures.

Acceptance: no duplicate accessible names/actions within a carousel; each slide control one focus stop; gesture conflict tests pass.

## Bundle 3 — Shared mobile touch-target design system (P1)

Source handoffs:

- `CHATGPT_MOBILE_TOUCH_TARGET_BUNDLE_2026-09-21.md`
- `CHATGPT_MOBILE_RESPONSIVE_METRICS_HANDOFF_2026-09-21.md`
- `CHATGPT_FEED_MOBILE_INTERACTION_BUNDLE_2026-09-21.md`

Deliver together:

- Shared 44px effective min-target token/primitive for icon buttons, tabs, chips, carousel controls, reaction rows, report controls, and save controls.
- Preserve compact visual pills by expanding transparent hit area rather than visual bulk.
- Remove button semantics from display-only tags; retain semantics only for real actions.
- Verify 8px minimum separation between independently actionable controls.

Acceptance: automated geometry check at 320/390/414px; all visible interactive targets >=44px or intentionally non-interactive.

## Bundle 4 — Network responsive and semantic refactor (P1)

Source handoffs:

- `CHATGPT_MOBILE_AUDIT_HANDOFF_2026-09-21.md`
- `CHATGPT_MOBILE_RESPONSIVE_METRICS_HANDOFF_2026-09-21.md`

Deliver together:

- Discoverable filter overflow (scroll cue/edge fade/compact filter affordance) without clipping.
- Label Back and Search professionals; increase contrast on title/subtitle/search over animated background.
- Separate card-detail activation from Save professional; no nested/competing targets.
- Normalize card tag semantics and target geometry.

Acceptance: 320/390/414px visual QA, keyboard traversal, VoiceOver/TalkBack-friendly labels, filter operability without precision scrolling.

## Bundle 5 — Feed composer and engagement controls (P1)

Source handoff: `CHATGPT_FEED_MOBILE_INTERACTION_BUNDLE_2026-09-21.md`

Deliver together:

- Label Feed back control, composer, and emoji action.
- Normalize Feed tabs/composer/report/reaction/comment/share/save touch targets.
- Preserve selected tab state and separate all post-card actions.

Acceptance: keyboard/tab state tests, touch-action smoke pass, screen-reader labels, no adjacent-action firing.

## Bundle 6 — Navigation and account-screen consistency (P1)

Source handoff: `CHATGPT_MOBILE_AUDIT_HANDOFF_2026-09-21.md`

Deliver together:

- Fix Settings `Back to Profile` destination so behavior matches its label.
- Label Muses, Sessions, and Network header-back controls and their search fields.
- Give six Profile portfolio Add controls unique names/slot context.
- Verify Menu → Profile → Settings → Back regression flow.

Acceptance: route/visible-screen assertions and screen-reader names for every header/back/search/portfolio control.

## Bundle 7 — Accessibility containment and semantic integrity (P0/P1)

Deliver together:

- Global test forbidding tabbable descendants in `aria-hidden` or inert surfaces.
- One native interactive element per intended action; no role-button wrapper plus nested/duplicate button.
- Contract tests for labels, focus order, disabled state, selected state, and modal/drawer focus trapping.
- Continue preserving positives confirmed live: no duplicate IDs, descriptive image alt text, healthy bottom-nav target sizing.

Acceptance: axe-style lint/rule coverage plus Playwright keyboard traversal for Discover, Feed, Network, Muses, Sessions, Settings, and Menu.

## Bundle 8 — Mobile interaction regression harness (P0 release gate)

Deliver together:

- Playwright mobile projects: 320px, 390px, 414px; reduced-motion variant.
- Real state tests for Pass/Like/Super Like/Like + Note; assert exactly one network mutation and one card advancement.
- Frame/screenshot regression around card start/mid/exit/promotion.
- Target geometry and accessible-name scan on primary screens.
- Test accounts/data reset strategy so interaction tests never pollute demo fixtures.

Acceptance: CI blocks deploy on failed interaction, focus containment, a11y-name, or viewport-regression checks.

## Recommended implementation order

1. Bundles 1 + 7 (state correctness and focus safety)
2. Bundles 2 + 3 (shared primitives)
3. Bundles 4 + 5 + 6 (screen integrations, parallelizable)
4. Bundle 8 (automated release gate; can start scaffold immediately and fill alongside the prior work)

## Existing gates

- Keep demo mode enabled.
- Run `npx tsc --noEmit`, full Vitest suite, mobile visual smoke at 320/390/414px, and deployed live recheck after every merged batch.
