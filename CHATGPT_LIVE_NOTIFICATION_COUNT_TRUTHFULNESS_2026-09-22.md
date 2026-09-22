# Live notification-count truthfulness mismatch — 2026-09-22

## Deployed verification

On the authenticated Muses screen, the Menu button and notifications entry announce **17 unread notifications**. Opening the notification center shows **0 unread** and **“No notifications yet.”**

A subsequent live refresh populated 17 notifications, confirming a client synchronization/loading defect rather than a deliberately zero-count center.

## Required remediation

Use one canonical notification-count source for the nav badge, menu row, and notification center. In demo mode, either seed coherent fixtures across all three surfaces or visibly label the counter/content as simulated. Do not show alarming unread counts with an empty center.

## Acceptance evidence

1. Initial unread count matches the rendered filtered notification list.
2. Mark-read, mark-all-read, incoming notification, retry, and cross-tab update tests keep every counter synchronized.
3. Empty state always renders zero badge/count.
4. Demo fixtures have internally consistent timestamps/counts and cannot be mistaken for real pending safety/account actions.

## Filter semantics

The notification type and read-state controls are exposed as generic buttons with no announced current selection (`aria-pressed`, `aria-selected`, or complete tab/filter-group state). Represent the active filter programmatically and announce the resulting count once after a filter change.
