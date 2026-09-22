# Live chat composer accessibility — 2026-09-22

## Deployed verification

The chat opened from the Collab Book flow exposes:

- an unnamed Back button;
- an unnamed message text field;
- an unnamed send-icon button;
- correctly named voice/video recording buttons.

## Required remediation

Label the controls by intent and conversation context:

- `Back to conversations`;
- `Message Luna Martinez` (or generic `Message` if the conversation heading is reliably associated);
- `Send message to Luna Martinez`.

The send action must be disabled until valid text/media exists, remain discoverable with its disabled reason, and announce send failure/success once. Preserve keyboard Enter/Shift+Enter behavior explicitly and never send while an IME composition is active.

## Acceptance evidence

1. AX snapshot reports distinct names for every composer control.
2. Keyboard test covers text, media, cancellation, send, failure/retry, and focus retention.
3. Demo conversations cannot send to simulated recipients.
