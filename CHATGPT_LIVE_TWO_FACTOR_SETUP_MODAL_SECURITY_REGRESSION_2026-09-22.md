# Live Two-Factor Setup Modal Security Regression — 2026-09-22

## Evidence

Live Settings → Privacy & Safety → **Two-Factor Authentication** was opened
read-only. The overlay presents explanatory text, **Close Two-Factor
Authentication**, and **Set Up Two-Factor**. Setup was not invoked.

DOM inspection: no `dialog`/`role="dialog"`, no `aria-modal`, no background
`inert`, and no live/status region. Keyboard reproduction:

1. Move to **Set Up Two-Factor**.
2. Press Tab.
3. Focus moves to `VERCEL-LIVE-FEEDBACK`, outside the visible security overlay.

## Impact

This is not merely a generic overlay styling defect. During authentication
enrolment, focus loss can cause a user to lose security context, accidentally
interact with unrelated UI, and have no predictable recovery/return focus.
Any TOTP/recovery-code setup later added to this surface must be protected from
background interaction and must never expose secret material to assistive
technology logs or unrelated regions.

## Required remediation

Adopt the shared accessible modal primitive before shipping or enabling 2FA:

- semantic named modal, `aria-modal="true"`, inert/hidden background;
- focus moves to the modal on open, cycles with Tab/Shift+Tab, supports Close
  and Escape where safe, and restores focus to the settings invoker;
- inline step/status/error announcements scoped to the setup flow;
- test cancel/retry/back navigation and a failure path without persisting a
  partial factor;
- in the actual enrolment implementation, require recent authentication where
  appropriate, show recovery codes once with explicit acknowledgement, never
  log TOTP secrets/recovery codes, and invalidate superseded factors/codes.

## Acceptance

Keyboard-only and screen-reader regression tests must prove that all 2FA setup
states are focus-contained and recoverable; test final/first Tab wrapping,
Close/Escape restoration, failed code validation, cancellation, and completed
enrolment separately. Do not treat a generic modal test as sufficient unless it
exercises the live 2FA route.
