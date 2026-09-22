# Live Discover Regression Bundle — 2026-09-22

## Evidence source

Authenticated production-like demo at `https://muse.wyzdesign.com/muse`, inspected in the Chrome mobile viewport on 2026-09-22. This is a live DOM/AX audit, not a source-only finding.

## Confirmed regressions / remaining P0-P1 work

### 1. The skip link target is absent (P1 accessibility)

- The document exposes `Skip to main content` pointing to `#muse-main`.
- `document.getElementById('muse-main')` is currently `null`; there is no `<main>` landmark in the live Discover DOM.
- Consequence: keyboard/switch users are offered a skip link that does not reach a target or identify the primary content.

**Remediation**: Render exactly one persistent `<main id="muse-main" tabIndex={-1}>` for the active screen; move focus to it on skip-link activation when SPA routing requires it. Add an integration assertion that `href="#muse-main"` resolves to a visible main element on every primary screen.

### 2. Discover header and micro-actions are still below mobile target size (P1)

Current viewport was 339×706 CSS pixels. Visible interactive controls measured from live layout:

- Search, Discovery Preferences, Map View and Boost: **34×34 px** each.
- Previous/next prompt: **17×24 px**; Like this prompt: **21×16 px**.
- Previous/next portfolio photo: **34×34 px**.
- Why this match?: **20×20 px**.
- Metadata chips (Creative Style, personality, badges): **22–24 px** high.

This is a direct tap/reachability issue, not merely a visual polish concern. Increase hit areas to 44×44 CSS px minimum while preserving the current compact visual icon/chip using an inner glyph/container. Ensure adjacent targets remain separated enough to avoid accidental reactions or carousel movement.

### 3. Portfolio carousel still has duplicate action controls (P1)

The active DANIELLE card exposes two separate `Previous portfolio photo` controls and two separate `Next portfolio photo` controls in the accessibility tree. The active visible buttons are 34×34; queued cards retain their own controls.

**Remediation**: retain one native previous and one native next control for the active carousel only. Remove duplicate custom-role wrappers, or make them noninteractive/presentational. Give the carousel an accessible name and announce slide position through a polite status only after explicit user navigation.

### 4. Queued Discover cards are correctly inert, but remain hit-testable (P2 hardening)

Good change verified: the two queued cards now have `aria-hidden="true"` and `inert`, so their 23/22 tabbable descendants no longer leak into keyboard focus.

They still render at `opacity: 1` and `pointer-events: auto` beneath the top card. Set queued cards to `pointer-events: none` until promoted to eliminate future overlap/click-through regressions, while keeping the animation transition intentional.

### 5. Custom-role button debt remains high (P1 platform primitive)

The live mounted DOM currently contains **182** `[role="button"]` elements. This matches the broader semantic-primitives handoff; this screen proves the migration has not yet landed comprehensively.

**Remediation**: migrate actual actions to `<button type="button">`, reserve role-button only for genuinely unavoidable widgets, and add an automated DOM budget/test that detects unlabelled or non-keyboard-operable custom actions.

## Acceptance checks

1. At 320, 339, 390, and 414 CSS px widths, all deliberately tappable Discover controls have a 44×44 px target (or documented, tested equivalent invisible hit area).
2. `#muse-main` exists and is the sole primary-content landmark; keyboard activation of the skip link puts focus there.
3. One previous and one next portfolio action exist per active card; each advances exactly one item once.
4. Queued cards are `inert`, `aria-hidden`, and `pointer-events:none` before promotion.
5. Run `npx tsc --noEmit`, the full test suite, and mobile Playwright/Cypress checks before deploy. Keep demo mode enabled.

