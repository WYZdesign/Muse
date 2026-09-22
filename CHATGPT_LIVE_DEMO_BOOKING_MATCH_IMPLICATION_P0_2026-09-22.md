# P0: demo paid-brief booking implies a real reciprocal match — 2026-09-22

## Deployed verification

On authenticated Collab, activating `Book` for the paid **Album Artwork Collection** brief opened a direct chat whose visible message states:

> “You matched with Luna Martinez”

The flow does not disclose that Luna/brief/match may be simulated, nor does it show a real booking request, host confirmation, or eligibility state before presenting a reciprocal relationship as fact.

## Why this blocks demo trust

In a creative marketplace, a reciprocal match, contact, and booking intent are material user expectations. Demo inventory may be useful, but it must not simulate a real person receiving a message or a genuine match/booking path.

## Required remediation

While `NEXT_PUBLIC_DEMO_MODE=true`:

1. Label demo cards, briefs, chats, match states, and counts clearly and persistently.
2. Replace `You matched`/recipient-implying copy with an explicit preview message.
3. Disable sending, booking, payment, contact, and notification side effects for simulated entities.
4. Keep analytics separately tagged so demo interactions never count as liquidity, matches, leads, or bookings.

When demo mode is disabled:

1. Derive match and booking state from server-authorized data only.
2. Require a real request/acceptance lifecycle, idempotency, eligibility checks, and user-visible status.

## Acceptance evidence

1. Demo-mode E2E proves no simulated flow can send a message, charge, create a booking, or state a reciprocal match.
2. Production-mode two-account E2E proves Book opens a real, authorized request flow—not an inferred chat match.
3. Analytics test proves demo flags are excluded from beta metrics.
