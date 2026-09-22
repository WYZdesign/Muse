# Live identity-verification gate enforcement mismatch — 2026-09-22

## Deployed verification

The authenticated app displays a persistent banner: **“Verify your identity to continue.”** Without completing verification, the same session was able to navigate and read Discover, Feed, Collab, Muses, BTS, Network, Sessions, Profile, and Settings.

This creates a trust and safety mismatch: the language represents a full continuation gate, while behavior is a non-blocking reminder.

## Required decision and remediation

Choose one explicit product policy:

1. **Full gate:** block all intended restricted routes/actions server-side and client-side until verification completes; or
2. **Feature gate:** retain app browsing but state the exact restricted actions (for example, NSFW visibility, paid bookings, calling, or initiating contact) in the banner and at every blocked action.

Do not rely on the banner itself as enforcement. All high-risk endpoints must verify the identity/age state server-side.

## Acceptance evidence

1. Two-account matrix proves both UI and direct API denial for each restricted action.
2. Banner and all block messages accurately enumerate affected capabilities.
3. Verification expiry, rejection, retry, and provider outage states are handled without silently opening restricted actions.
4. Product, safety, and legal owners approve the selected enforcement policy before invite beta.
