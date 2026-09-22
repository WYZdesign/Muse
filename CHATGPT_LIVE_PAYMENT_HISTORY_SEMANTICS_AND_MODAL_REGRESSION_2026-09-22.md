# Live Payment History Semantics and Modal Regression — 2026-09-22

## Evidence

Live Settings → **Payment History** opened read-only. It shows summary metrics
and two view controls: **Received (0)** and **Sent (0)**. The rendered
accessibility tree exposes a heading and Close button but no dialog role,
`aria-modal`, inert background, or main landmark. The two view controls are
plain buttons with no `role=tab`, `aria-selected`, `aria-pressed`, or other
programmatic current-state signal.

No payment, payout, refund, transfer, or filter action was invoked.

## Required remediation

1. Use the shared named, focus-contained modal/drawer primitive for Payment
   History, or make it a semantic full screen with exactly one main landmark;
   do not use a generic overlay for financially sensitive information.
2. Represent Received/Sent as a semantic tablist with labelled tabs and panels,
   `aria-selected`, keyboard arrow/Home/End support, and clear empty/loading/
   error states; alternatively use properly labelled toggle buttons with
   `aria-pressed`.
3. Use a semantic table/list for real payment rows with accessible amount,
   currency, date/time, counterparty-safe description, status, fees, and
   receipt/dispute affordances. Preserve privacy by minimizing counterparties'
   personal data.
4. Ensure server queries enforce account ownership and use source-of-truth
   payment/payout states rather than client-computed totals.

## Acceptance

Keyboard/screen-reader tests identify the active view and every displayed
financial value, keep focus within an overlay if used, and never expose another
account’s records. Integration tests reconcile the summary totals and rows to
authoritative payment-provider events, including pending/refunded/disputed
states.
