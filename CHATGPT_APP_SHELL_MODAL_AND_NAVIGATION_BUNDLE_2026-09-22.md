# App Shell, Modal, and Navigation Bundle — 2026-09-22

## Live mobile evidence

Authenticated production-demo DOM, mobile CSS viewport 339×735.

- The document body is locked (`overflow:hidden`, document scroll height = viewport height), so each screen must own scroll/focus behavior correctly.
- There are **12** mounted `Main navigation` landmarks with six actions each. One is visually visible; the other 11 are CSS-hidden but are not inside `[aria-hidden]` or `[inert]` containers.
- Eight mounted inputs (text, textarea, two file, and other text fields) are visually hidden but have no `name`, `autocomplete`, or `aria-label` attributes in the live DOM.
- A full-viewport `.phone` layer is mounted at z-index 100 and contains onboarding/completion content (`You're All Set! Ready to find your creative connections? Have a referral code?`). It has no dialog semantics, accessible name, or modal isolation. The primary navigation is mounted at the same z-index.
- No live dialog or alertdialog is present in the screen, despite the app having overlay-style content layers.

## Required remediation program

### 1. App-shell lifecycle

Do not mount all screen instances and their navigation/content trees concurrently. Either unmount inactive screens or make the entire inactive screen root `hidden inert aria-hidden="true"` from the same state predicate. Use one active-screen source of truth. This prevents ghost landmarks, stale form controls, duplicate IDs/events, and avoidable mobile memory/render cost.

### 2. Overlay primitive

Build one accessible `Modal`/`Sheet` primitive and migrate onboarding, daily login, confirmation, search, and action overlays to it.

- `role="dialog"`, `aria-modal="true"`, and a programmatic accessible name.
- Focus initial element on open; trap focus; restore focus on close.
- Make the app content outside the modal inert while it is open.
- Handle Escape only where dismissal is valid; always provide a visible, named close/later action.
- Respect `prefers-reduced-motion`; avoid scroll jumping with the body lock.
- Ensure overlay z-index tokens establish a deterministic stack above navigation rather than sharing its z-index.

Use a nonmodal region/status primitive for content that is informational rather than a blocking dialog.

### 3. Form-control contract

Hidden/off-screen inputs should be unmounted until their owning screen/overlay opens, except for deliberately active native file inputs used by an associated visible label/button. Every real user field needs stable `id`, `name`, label, correct `autocomplete`, validation association, and error/status exposure. File inputs need a visible/accessible trigger and the server-side media policy documented in the existing media handover.

### 4. Mobile document policy carry-over

This bundle depends on the existing live findings:

- Fix the missing `#muse-main` target/`<main>` landmark.
- Change authenticated `/muse` from `robots: index, follow` to noindex.
- Remove `user-scalable=no` so pinch zoom is available.

## Regression gates

1. On every primary route, only one visible navigation landmark and one main landmark exist in both DOM and AX tree.
2. Switching routes leaves no inactive form control, modal control, or duplicate nav focusable/announced.
3. Opening every overlay produces one named modal, confines focus, hides/inerts background, and restores focus on close.
4. Run this at 320/339/390/414 widths with VoiceOver/TalkBack-style keyboard/switch traversal plus reduced-motion.
5. Execute `npx tsc --noEmit`, full test suite, and mobile E2E before deployment; retain demo mode.

