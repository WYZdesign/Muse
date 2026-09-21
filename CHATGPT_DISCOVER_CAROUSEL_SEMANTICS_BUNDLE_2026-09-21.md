# ChatGPT Discover Carousel & Semantics Bundle — 2026-09-21

## Live active-card audit (414px)

The active Discover card exposes 31 visible controls; **25 are below 44px**. All sampled profile/portfolio images have descriptive alt text and the active card has no unnamed visible controls—preserve those positives.

## Critical: duplicated portfolio controls

The active card exposes duplicate accessible actions for portfolio navigation:

- a custom `DIV role="button" tabindex="0"` labelled `Previous portfolio photo` / `Next portfolio photo`; and
- a native `BUTTON` with the same respective accessible name.

This duplicates focus stops and risks duplicate invocation/event handling. Use **one native button per action**. Remove the custom role/tabindex shim, or make its visual wrapper non-interactive.

Portfolio pagination is also custom `DIV role="button" tabindex="0"` controls with 6×6px geometry. Convert each to a native button (or a single well-tested accessible primitive) with a 44×44 effective hit area and selected/current-slide semantics.

## Carousel primitive bundle

Apply one reusable mobile carousel primitive to profile photos, prompts, and portfolio:

- Native `<button>` controls; no duplicate wrappers.
- 44×44 effective target for previous, next, and like controls.
- `aria-label` includes target/context (e.g. `Show portfolio photo 2`).
- Current slide exposed with `aria-current` / selected-state semantics; inactive dots retain clear labels.
- Disable/hide previous/next correctly at boundaries where applicable.
- Keyboard Left/Right support only when focus is in the relevant carousel; Enter/Space activates buttons.
- Prevent gestures/swipes in the card carousel from leaking to Discover’s match-card swipe handler.

## Metadata and micro-control cleanup

- Prompt previous/next: **17×24px**; prompt like: **21×16px**.
- Profile-photo like: **54×32px**.
- Portfolio arrows: **34×34px**; rationale control: **20×20px**.
- Match actions: Rewind/Pass **41×41px**, Super Like **37×37px**, Like + Note **43×43px**.
- Style/personality/relationship/badge pills: **22–24px high** buttons. Convert display-only pills to non-interactive content; interactive pills must use the shared 44px target primitive.

## Acceptance suite

1. One focus stop per carousel action; no duplicated names in the same carousel.
2. Run keyboard traversal through an active card and assert all intended controls are reachable once, in visual order.
3. At 320/390/414px, every actionable control >=44px; display-only metadata is not focusable.
4. Use touch gesture tests to ensure carousel interactions cannot accidentally submit a Discover Pass/Like.
5. Preserve descriptive image alt text and test `aria-current` as photos change.
