# App-Shell Lazy-Mount & Inactive-Screen Bundle — ChatGPT — 2026-09-22

## Live evidence

At the active mobile Discover screen, the mounted client DOM contains:

- **3,335** total nodes
- **623** potentially interactive elements
- **86** visible controls
- **537** hidden controls still mounted
- multiple inactive `.screen-el` trees of 94–452 descendants each

Inactive UI is currently visually hidden, but remains mounted in memory/DOM. This increases mobile parse/layout/memory cost, creates duplicated primitive/event surface, and raises the chance of focus or state leakage when a screen/modal transition is incomplete.

## Deliver as one app-shell architecture bundle

1. Lazy-load feature screens by route/state boundary (Discover, Feed, Collab, Community, Muses, BTS, Sessions, Network, Profile, Settings, admin), not only by CSS visibility.
2. Unmount inactive heavy screens by default. Retain only intentional cached state, with an explicit cache policy and invalidation rules.
3. For temporarily retained but inactive surfaces, apply `inert` and `aria-hidden` at the screen root; remove all focusable descendants from keyboard reachability.
4. Do not duplicate persistent app-shell/navigation markup inside cached screens.
5. Defer non-critical visual systems (decorative scenes, depth effects, offscreen media) until the owning screen is active.
6. Preserve visible UI continuity: restore semantic focus, scroll position where appropriate, and form drafts only for explicitly supported flows.

## Performance/reliability gate

- Capture mobile 320/390/414px metrics before/after: DOM node count, active controls, JS heap where available, long tasks, interaction latency, and visual stability.
- Target: inactive screens do not contribute focusable controls and heavy feature trees are not resident until needed.
- Add regression test/assertion for inactive-screen roots: either unmounted or `inert` + `aria-hidden` + no tabbable descendants.
- Verify no loss of drafts/bookings/composer data in flows explicitly designed to retain it.
