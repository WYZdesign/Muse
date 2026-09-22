# ChatGPT Mobile Overlay & Modal Bundle — 2026-09-21

## Live evidence

The login-streak welcome overlay is a full-viewport fixed layer (`.daily-login-overlay`, 414×896, z-index 950) but is exposed as `role="presentation"` with no dialog semantics, accessible name, or modal state.

Its actions measure:

- `View Quests`: 290×41
- `Later`: 290×36

Visual review also shows `Later` rendered as low-contrast text against the dark card. It reads as disabled even though it is the only dismiss path; make the dismissal affordance visibly actionable and meet contrast/touch-target requirements.

The verification banner also reappears after reload; it should be reviewed as a separate persistent/dismissal policy decision, not accidentally stacked with onboarding.

## Deliver as one overlay primitive refactor

1. Replace presentation-only full-screen overlays with a shared modal/drawer primitive:
   - `role="dialog"`, `aria-modal="true"`, accessible heading/name, and descriptive content.
   - Move focus into the modal when it opens; trap focus; return focus to the invoking control on close.
   - Make background app content inert while modal is active.
   - Escape close only when dismissal is safe; offer a visible labelled close/dismiss action.
2. Normalize all modal CTA/button targets to >=44px effective height.
   - Treat a deferred/dismiss option as a real secondary button, not faint body text. Meet WCAG text contrast and preserve a clear pressed/focus state.
3. Honor `prefers-reduced-motion` for entrance/exit; prevent motion from blocking input.
4. Define overlay priority so identity/safety prompts, login/onboarding, blocking confirmations, and errors cannot create competing layers or unreachable actions.
5. Persist `Later` only according to product policy; never silently suppress an action-required safety prompt.

## Regression matrix

- Keyboard-only: focus begins in modal, loops within it, Escape behavior matches policy, focus returns on dismissal.
- Screen reader: announces modal title, purpose, streak content, and both actions in a coherent order.
- Mobile 320/390/414px: no clipped content; CTAs >=44px; bottom nav/background not interactive behind modal.
- Reload/login: validate intended behavior of welcome and verification prompts individually and when both are eligible.
- Test nested-error/modal conflict and reduced-motion mode.
