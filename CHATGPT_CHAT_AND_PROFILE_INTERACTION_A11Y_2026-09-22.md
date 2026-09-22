# Chat and public-profile interaction accessibility follow-up — 2026-09-22

## Local source fixes ready for review

### Chat media reveal

`src/app/(muse)/muse/screens/ChatScreen.tsx`

- Blurred shared images and video notes were exposed as focusable `role="button"` containers but did not respond to a keyboard activation.
- Added Enter and Space activation for both controls, using the exact same reveal state update as pointer activation.
- The controls already have meaningful labels: `Reveal image` and `Reveal video`.

### Public profile disclosures and photo carousel

`src/app/(muse)/muse/screens/PublicProfileScreen.tsx`

- Replaced the 22px interactive identity-verification mark with a native 44px button, preserving its visual footprint with negative margin and adding `About identity verification` as the accessible name.
- Replaced the interactive Online pill with a native button with a 44px minimum height and `About online status` name.
- Replaced all interactive verification and earned-badge pills with native buttons with 44px minimum heights. Native button semantics provide Enter/Space support without custom keyboard code.
- Converted photo-indicator dots to decorative, hidden spans. The existing labelled previous/next photo controls remain the operable carousel controls and support keyboard activation; the tiny dots no longer create inaccessible 7px tab stops.

## Verification performed here

- TypeScript transpile/syntax validation passed for `PublicProfileScreen.tsx`.
- `git diff --check HEAD` reported no whitespace errors (only repository line-ending notices).

## Required before deployment

1. Run the elevated project test and production-build commands in `V:\Muse`; local Windows permissions prevent their execution from this session.
2. Manually verify at narrow mobile width that the hero verification mark does not collide with the name or age, and that all badge pills remain comfortably spaced.
3. In a deployed profile with shared blurred image and video messages, verify pointer, Enter, and Space reveal the media exactly once, while video controls remain usable after reveal.
4. Re-run keyboard-only checks for identity, online, and badge disclosures after deployment.
