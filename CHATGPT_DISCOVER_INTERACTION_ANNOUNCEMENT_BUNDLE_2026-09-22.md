# Discover Interaction + Announcement Bundle — 2026-09-22

## Live evidence

Authenticated live demo, mobile CSS viewport 339×706, Discover screen.

- Active top card: 339×598 at y=73, `pointer-events:auto`, 31 focusable descendants.
- Queued cards: visible beneath active card (325×574 and 312×550), `aria-hidden` + `inert` verified, but each still has `pointer-events:auto`.
- No `[role="status"]` or `[aria-live]` region exists anywhere in the mounted app shell.
- The app presents profile/photo/prompt/portfolio navigation plus reaction actions, but no programmatic feedback primitive is available for state changes.

## Bundle scope

### A. Establish a single reusable, visually quiet announcement primitive

Add one persistent `role="status" aria-live="polite" aria-atomic="true"` region near the app-shell root. Route intentional interaction results through it:

- profile change after swipe/Pass/Like/Super Like,
- carousel movement (`Portfolio photo 2 of 3` / prompt position),
- successful/failed match-action request,
- filter/search result updates,
- undo / rewind availability.

Do **not** announce decorative card content on initial mount, during animation frames, or for background queued cards. Coalesce rapid events and avoid duplicate messages from nested components.

### B. Make stacked-card interaction containment explicit

The current inert fix prevents focus leakage, but queued cards still accept pointer hit testing. Before an item becomes active, use `pointer-events:none`, then enable pointer input only on promotion. Keep `aria-hidden` and `inert` synchronized from one state predicate so animation and accessibility cannot diverge.

### C. Give every Discover transition an observable contract

Create a single action-state model for `idle → pending → committed | failed → undoable`.

- Disable or ignore duplicate requests while pending.
- Do not reveal/promote the next card until the outgoing-card action is committed or safely rollback-capable.
- Preserve the current profile’s identity in the action result so an undo never affects the profile that merely appeared next.
- On failure, restore the same card and announce a retry-safe error; no silent card loss.
- Respect reduced motion: the state transition and announcement must remain correct when animation duration is zero.

This addresses the original user-reported regression where the next person becomes visible before the prior card completes its swipe outcome.

### D. Acceptance tests

Add component/integration coverage for:

1. Only the active card can receive pointer and keyboard interaction.
2. A Pass/Like/Super Like emits exactly one request and one suitable status message.
3. Rapid double-tap, keyboard activation, and swipe-plus-tap cannot create duplicate reactions or misassociate an undo.
4. The next card does not become semantically active or fully exposed until the outgoing action reaches its defined committed point.
5. Carousel actions announce position once; pagination controls have meaningful names and a minimum 44×44 target.
6. Failed network response leaves user on the original card with a clear retry path.
7. `prefers-reduced-motion` passes the same semantic/state suite.

Run `npx tsc --noEmit`, full Vitest, and the mobile E2E flow before deploy. Keep demo mode enabled.

