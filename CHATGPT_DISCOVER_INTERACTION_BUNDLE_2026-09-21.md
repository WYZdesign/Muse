# ChatGPT Discover Interaction Bundle — 2026-09-21

## Test basis

Live mobile viewport: **414 × 896**. Accessibility tree, DOM geometry, and visual review of Discover.

## Swipe-stack observation

- At rest, the active `swipe-card top-card` is isolated at z-index 3 and fills the active interaction region; no next profile is visibly bleeding through the resting card. This is good.
- Regression-test the **during-swipe** state specifically: outgoing card must remain opaque/on top until its exit threshold/completion; incoming card should start behind it and only become interactive/visible according to the intended animation. Test Pass, Like, Super Like, and keyboard activation.

## Shared mobile target/accessibility fixes

### Header and core match actions

- Search, Discovery Preferences, Map View, and Boost are **34×34**. Increase effective target to 44×44.
- Rewind, Pass, and Like + Note are **42×42**; Super Like is **37×37**. Normalize the full match-action cluster to 44×44 effective targets, preserving clear separation.

### Card media controls

- Previous/next portfolio controls are **31–34px**.
- Portfolio pagination dots are exposed as `Show portfolio photo N` buttons at only **6×6px**. Keep their small visual dot but wrap each in a 44×44 hit target; ensure labels and current-slide state are preserved.
- `Why this match?` is **18–20px**. Expand its hit area and retain its accessible label.
- Prompt previous/next buttons are **16–24px** and prompt-like is **15–21px**. Use a shared carousel-control target pattern; `Like this prompt` must have a 44px effective target.
- Current-photo like is only **32px** tall. Expand it to 44px.

### Semantic cleanup

- Creative-style, personality, zodiac, MBTI, life-path, relationship, and badge pills are currently exposed as 20–24px buttons. Decide per primitive:
  - display-only: non-interactive text/badge; or
  - interactive: 44px target plus explicit action/meaning.
- Avoid presenting non-action metadata as a focusable button. This reduces a very long, low-value keyboard traversal on each profile.

## Interaction acceptance suite

1. At 320/390/414px, test Pass, Like, Super Like, Rewind, Like + Note via touch and keyboard.
2. Capture animation frames: only outgoing profile visible on top until completion; no premature next-card reveal or early pointer-event handoff.
3. Every intended action has >=44px effective target; display metadata is not focusable.
4. Portfolio/prompt carousel controls, pagination, and like controls announce their target and selected/current state.
5. Verify no double invocation under fast taps/swipes and that an action remains disabled while its card transition is in flight.
