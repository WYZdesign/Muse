# ChatGPT Discover Swipe-State Bundle — 2026-09-21

## Live root-cause evidence (414px mobile)

The active card has:

- `z-index: 3`, `pointer-events: auto`, `opacity: 1`
- `transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)`

Both queued cards are rendered behind it with:

- `opacity: 1`, `visibility: visible`
- `aria-hidden="true"` **but `pointer-events: auto`**
- z-index 2 / 1 and scaled transforms (0.96 / 0.92)

This makes the next-person content visually available under the outgoing card throughout the transition and leaves inactive cards eligible for pointer input. It directly supports the reported early next-card reveal/race during Like/Pass/Super Like.

## Fix as one state-machine bundle

1. Model card lifecycle explicitly: `active` → `exiting` → `promoting` → `active`.
2. During `exiting`, keep the active card fully opaque/on top until exit is complete. Do not promote the queued card’s visual content early.
3. Set queued/inactive cards to `pointer-events: none`; only the active card may be interactive.
4. Keep `aria-hidden="true"` on queued cards and ensure they cannot receive focus. When promoted, atomically remove `aria-hidden`, restore pointer events, and focus only if the interaction mode requires it.
5. On rapid repeated action input, lock match actions until the active action/transition settles. Prevent double mutation and skipped cards.
6. Prefer transition-end/animation-complete state promotion over a parallel timeout that can drift under a slow device.

## Visual alternatives

- If the stacked-card preview is intentional, keep only a neutral card edge/shadow visible behind the active card; do not expose the next person’s image/name/content until promotion.
- Respect `prefers-reduced-motion`: complete the state promotion without an animation but preserve the same pointer/ARIA ordering.

## Regression tests

1. Record Pass, Like, Super Like at 60fps on 320/390/414px. Next profile content must not appear before outgoing-card completion.
2. Hammer each action during transition: exactly one backend mutation and one card advancement.
3. Test touch, keyboard Enter/Space, and swipe gestures; only one active card receives events.
4. Assert queued cards have `aria-hidden=true`, `pointer-events:none`, and are unfocusable until promotion.
5. Run `npx tsc --noEmit` plus full Vitest suite.

## Confirmed focus-leak defect

Live inspection found both `aria-hidden="true"` queued swipe cards still contain tabbable descendants: prompt navigation/like controls; display-pill buttons; portfolio navigation; portfolio pagination; match rationale; and badges. Some custom `DIV` controls explicitly retain `tabindex="0"`.

`aria-hidden` alone does not remove elements from keyboard focus. This allows keyboard users to tab into off-screen/queued people, creating an interaction path inconsistent with the visible active card.

### Required remediation

- Apply `inert` to every non-active card where browser support allows, with a compatible fallback that removes descendants from the tab order.
- When a card becomes active, remove `inert` and restore only intended interactive descendants.
- Do not rely on `aria-hidden` by itself; retain it as the semantic signal, but pair it with inertness and `pointer-events:none`.
- Add an automated keyboard traversal test proving focus cannot leave the active card into queued cards.
