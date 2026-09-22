# Document Landmarks & Navigation Semantics Bundle — ChatGPT — 2026-09-22

## Live evidence

- `html[lang="en"]` is present — preserve it.
- A `Skip to main content` link points to `#muse-main`.
- No native/ARIA `main` landmark is currently mounted.
- No `h1` or other semantic heading elements are mounted in the live client DOM.
- The app shell currently mounts **12 duplicate `Main navigation` landmarks**, consistent with inactive screens retaining full navigation trees.
- No live-region/status primitive is currently present for async actions, transitions, or notifications.

## Deliver together

1. Wrap the active screen content in exactly one `<main id="muse-main">` (or equivalent `role="main"`). The skip link must focus/scroll there reliably after route/screen changes.
2. Provide one visible/semantic page `h1` per active primary screen; preserve visual design with styling, not by removing heading semantics.
3. Use a logical heading hierarchy for major sections (profile details, portfolio, feed composer, filters, settings groups, etc.).
4. Render exactly one primary navigation landmark. Cached/inactive screens must unmount their nav or be inert/aria-hidden and excluded from the landmark tree.
5. Add a shared polite status/live-region primitive for non-blocking state changes (feed load/filter, swipe completion, upload progress/result, save, booking request) and assertive alerts only for urgent errors/safety events.

## Acceptance gate

- One `main`, one active-screen `h1`, one Main navigation landmark.
- Skip link moves focus to the current main region after every screen transition.
- Heading outline is coherent on all primary screens and dialogs.
- Screen reader smoke test announces non-blocking action results without stealing focus.
