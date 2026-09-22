# P0 — Verification Gate / Onboarding Overlay Must Be a Real Modal

## Live evidence

On the authenticated production-demo mobile route on 2026-09-22, the user-facing page context displayed `Verify your identity to continue` / `Verify Now`. The concurrently mounted full-screen `.phone` layer is 414×896 at z-index 100 and contains onboarding/identity-gate copy, but has:

- no `role="dialog"` or `role="alertdialog"`,
- no `aria-modal`, accessible name, or accessible description,
- no dialog element in the document at all,
- no live/status region,
- no background inerting/focus containment.

While the gate was present, **80+** background focusables remained mounted, including Discover reactions, photo/prompt controls, portfolio actions, and bottom navigation. The navigation shares the overlay's z-index (100), making stacking dependent on DOM/order rather than a modal contract.

## Why P0

This is an identity/age/verification boundary. A visually covered control surface is not an enforced interaction boundary for keyboard, assistive technology, automation, or future styling changes. Users can encounter controls that appear actionable behind a gate; if handlers are not independently server-authorized, the feature boundary can be bypassed. Even with server protection, this is a severe accessibility and trust failure.

## Required implementation

1. Model verification state server-side and authorize each gated API/action server-side; client overlay is defense in depth, never the enforcement layer.
2. Implement the gate with the shared modal primitive:
   - `role="dialog" aria-modal="true"`, programmatic label and description;
   - initial focus on the explicit primary action or a clearly named non-destructive Later/close action, according to policy;
   - trap focus; restore it predictably when a legitimately dismissible overlay closes;
   - inert + `aria-hidden` all app content and navigation behind it;
   - a z-index token strictly above app/navigation content;
   - Escape behavior only when deferral is allowed.
3. If verification is mandatory to continue, do not expose contradictory onboarding copy such as `You're All Set!`; show why verification is required, what data is used, privacy/retention links, and an accessible support path.
4. If demo mode intentionally allows deferral, label that status unambiguously and ensure restricted server routes remain protected. Preserve demo mode as requested; do not silently turn it off.
5. Publish completion/failure messages through one polite status region without moving focus unexpectedly after an external verification return.

## Required test matrix

- Keyboard and screen-reader traversal cannot reach a Discover action or navigation while the mandatory gate is open.
- Direct client invocation and direct API requests for each gated action are denied server-side when verification is incomplete.
- No focusable background content appears in AX tree while modal gate is open.
- Test verify success, user cancellation, provider error, refresh/re-entry, expired verification, and demo-mode deferral.
- Test 320/339/390/414 widths, safe-area insets, virtual keyboard, reduced motion, and no-JS/server route behavior.
- Run `npx tsc --noEmit`, full tests, and authenticated mobile E2E before deployment.

