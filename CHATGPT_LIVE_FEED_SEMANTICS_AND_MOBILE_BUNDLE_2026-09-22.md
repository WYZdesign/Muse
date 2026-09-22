# Live Feed Semantics + Mobile Interaction Bundle — 2026-09-22

## Direct deployed evidence

Authenticated Feed screen at 414 CSS px mobile width, verified with a screenshot, AX tree, and live DOM measurement.

### Confirmed defects

1. **Feed category tabs misuse the tab pattern.** The five visible tabs (`All`, `Photos`, `Text`, `Videos`, `BTS`) have `role=tab` but are not inside a `role=tablist`, have no `aria-controls`, and have no corresponding tab panels. The app currently has 33 role-tab elements mounted across screens; most are hidden, but the active Feed group itself is incomplete.
2. **Composer textarea has no accessible name.** It has only placeholder `Share your work or ideas..`, with no label, `aria-label`, or `aria-labelledby`. Placeholder is not a label and disappears while typing.
3. **No main landmark or status/live region exists on Feed.** The existing skip link still points to absent `#muse-main`; there is no semantic place to announce feed-filter, post, save, or error results.
4. **Mobile targets are undersized.** Visible measurements: category tabs are 28 px tall; recording/emoji actions are 36×36; reaction/share/save actions are 41–43 px; unnamed back control is 42×42. Post itself is 36 px tall. These are all below the 44×44 CSS-pixel policy.
5. **Control naming quality remains inconsistent.** Header back button has no accessible name. Emoji composer control is named only `😊`; BTS is exposed as `📷 BTS`, which is inferior to intent-first names such as `Add BTS photo`.
6. **Screen DOM remains over-mounted.** Hidden role-tab groups from other app screens remain in the DOM, compounding the app-shell/lazy-mount issue.

## Required implementation

- Decide whether categories are actual tabs. If yes, render a labelled `role=tablist`, one tab panel per category, stable `aria-controls`, arrow-key behavior, and only the active panel focusable. If filters merely change a list, use native buttons with `aria-pressed` or a labelled filter group instead.
- Add visible `<label>` (or robust programmatic label) for composer; add explicit labels for all icon-only actions and content-type controls.
- Move Feed content into shared `<main id="muse-main">`; install shared status primitive for filters, composer validation, post success/failure, Save state, and feed loading.
- Use 44×44 minimum hit boxes with visual-size decoupled from target size. Do not make dense reactions a source of accidental Like/Share/Save actions.
- Unmount inactive screens or apply `hidden inert aria-hidden` at their roots.

## Test requirements

1. Keyboard test: tablist/filter changes exactly one content state and has no hidden sibling focus leak.
2. Label test: every composer field and icon action has an intent-first accessible name.
3. Mobile tests at 320/339/390/414: no clipped category, composer, or action controls; hit targets meet policy.
4. Submit/post, media-picker, voice/video cancellation, filter error, and Save retry all announce outcome once without accidental duplicate requests.
5. Run `npx tsc --noEmit`, full unit suite, and authenticated mobile E2E before deploy. Retain demo mode.

