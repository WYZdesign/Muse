# Live notification item semantics and synchronization — 2026-09-22

## Deployed verification

The notification center was first observed with a 17-unread menu badge but an empty `0 unread` view. A later live refresh populated 17 unread quest notifications. This demonstrates stale/late synchronization rather than a stable coherent initial state.

In the populated state, each notification is exposed as generic containers containing only a `Q` marker, `Muse Quest`, a timestamp, and `Swipe to remove`. The actual notification message/target is not exposed as meaningful accessible content or a labelled interactive item. Removal is gesture-only.

## Required remediation

1. Load and reconcile the authoritative notification list before rendering an unread count, or expose an explicit loading/retry state rather than a contradictory empty state.
2. Make each notification a semantic labelled link/button when it opens a destination, with a name such as `Muse Quest: <message>, received <time>`.
3. Provide a separate accessible `Remove notification <summary>` control or keyboard-complete menu; retain swipe only as an optional shortcut.
4. Include notification type, meaningful message, timestamp, read state, and destination context in the accessible tree.

## Acceptance evidence

1. First render, refetch, offline retry, and cross-tab events cannot produce a nonzero unread badge with an empty unqualified list.
2. Screen-reader/keyboard tests can read, open, mark read, and remove each notification without gestures.
3. Tab order does not contain inert generic containers pretending to be interactive cards.
4. Test demo fixtures do not generate duplicate/meaningless quest notifications.
