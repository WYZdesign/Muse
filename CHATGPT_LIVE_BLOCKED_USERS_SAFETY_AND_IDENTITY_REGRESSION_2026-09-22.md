# Live Blocked Users Safety and Identity Regression — 2026-09-22

## Evidence

Live Settings → Privacy & Safety → **Blocked Users** was opened read-only. The
screen says one account is blocked, but its only identifying content is a raw
UUID-like internal identifier (`ac9421e4-…`); it provides no display name,
avatar, profile-safe identifier, date blocked, context/reason, or accessible
description. The only per-record action is **Unblock**. No unblock action was
invoked.

## Impact — P1 safety/usability

Users cannot make an informed decision about reversing a protective boundary
when the target is represented only by an implementation identifier. This can
lead to accidental or mistaken unblocking, especially for people managing
harassment or prior safety incidents. It also exposes an internal stable ID in
the consumer UI without a user benefit.

The overlay also follows the known broken pattern: no visible semantic dialog
role in the accessibility tree, requiring the shared modal fix already tracked
for legal/security overlays.

## Required remediation

1. Render a safe, server-authorized blocked-profile summary: display name,
   profile image with meaningful alt/fallback, relevant craft/handle only if
   appropriate, and date blocked. Do not expose raw database IDs.
2. Provide an explanatory empty state and distinguish deleted/deactivated
   accounts without making their identity recoverable.
3. Require an explicit, named confirmation before unblocking (e.g., “Unblock
   [display name]?”), explain restored visibility/contact implications, and
   make cancel the safe default.
4. Preserve safety history/audit trail server-side; prevent stale or spoofed
   client data from targeting another account.
5. Use the accessible focus-contained modal primitive and return focus to the
   **Blocked Users** invoker on close.

## Acceptance

With one or more blocks, keyboard/screen-reader users can identify each target
without seeing internal IDs, understand the consequences of unblocking, cancel
safely, and cannot complete unblocking accidentally. Add a server authorization
test proving a user can only read/mutate their own block relationships.
