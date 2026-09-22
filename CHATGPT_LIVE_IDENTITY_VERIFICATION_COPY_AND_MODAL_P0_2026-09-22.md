# Live Identity Verification Copy and Modal P0 — 2026-09-22

## Evidence

Live Settings status says: **Identity Verification — Expired — paid features
locked. Tap to verify**.

Opening it (without starting verification) displays:

- **Age Verification Required**
- “Paid bookings require government ID + selfie verification (18+ only). This
  is a **one-time check** via Stripe Identity. Secure, encrypted, and never
  shared with other members.”
- **Verify Now** and **Not now**
- “Your documents are encrypted and **never stored on Muse servers**. You can
  verify or skip at any time. Paid bookings require it.”

DOM inspection found no dialog role, `aria-modal`, background inertness, or
live/status region. With focus on **Not now**, Tab moves to external
`VERCEL-LIVE-FEEDBACK`, outside the visible verification prompt. No Stripe
flow, document upload, selfie, or verification action was initiated.

## P0 — Verification contract is contradictory and unverified

“Expired” and “one-time check” describe incompatible lifecycle expectations.
If re-verification/expiry can occur, the UI must clearly state when, why,
whether access is immediately affected, what data is required, and what
appeal/support path exists. If it is genuinely one-time, the expired state is
misleading or unsupported.

The absolute statements about encryption and document storage are privacy
claims that must be demonstrated from the deployed Stripe Identity integration,
server data model, webhook/logging pipeline, error telemetry, backups, and
subprocessors—not assumed from UI copy. “Never shared with other members” does
not itself explain sharing with Stripe, authorized staff, legal authorities, or
service providers.

## Required remediation before any production verification gate

1. Product/privacy/legal owners define and publish the exact lifecycle:
   eligibility, expiry/reverification trigger, feature gates, retention,
   failure/retry/appeal, and human support escalation.
2. Reconcile all client/server states and copy to that contract; server-side
   enforcement must match it. Do not let client visibility substitute for an
   authorization decision.
3. Verify data flow end-to-end and revise privacy language to precisely match
   what Muse receives/stores (for example verification status/reference), what
   Stripe processes, who can access it, and how long it is retained.
4. Make this a fully accessible named modal: focus-contained, inert background,
   Escape/Not-now close behavior, focus restoration, and status/error
   announcements. Identity prompts must never trap users or let focus drift to
   unrelated surfaces.
5. Obtain counsel/privacy review and security signoff before asserting the
   current privacy guarantees in open beta.

## Acceptance gate

Automated/server tests cover expired, valid, pending, failed, retried,
unsupported-region/device, and appeal cases. Live keyboard tests prove the
prompt’s focus containment and accessible labels. A deployment review provides
authoritative evidence for every privacy statement; otherwise replace it with
accurate, bounded language.
