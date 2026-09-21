# ChatGPT Discover Post-Deploy Verification — 2026-09-21

## Live recheck after wyzmind update

### Verified fixed

- Both queued swipe cards now carry `inert`. This closes the previously confirmed keyboard-focus leak from hidden future cards. Keep it.

### Still incomplete

- Queued cards retain `pointer-events: auto` and are fully rendered. Preserve `inert`, but explicitly set non-active card CSS to `pointer-events: none` so the interaction model is unambiguous and robust across browsers/polyfills.
- Queued cards remain visually rendered behind the active card. The reported premature next-person reveal must still be tested during Pass/Like/Super Like transition; do not promote incoming content before outgoing completion.
- Active card still exposes duplicate `Previous portfolio photo` and `Next portfolio photo` controls (custom role-button wrapper + native button). Remove the duplicate focus/action path.

## Completion criteria

1. Queued cards: `inert`, `aria-hidden=true`, `pointer-events:none`, unfocusable.
2. Active card: exactly one previous and one next portfolio control in the accessibility tree.
3. Transition frame test verifies incoming person content is not shown/interactive before outgoing-card completion.
4. Re-run mobile target audit for the shared control primitives after implementation.
