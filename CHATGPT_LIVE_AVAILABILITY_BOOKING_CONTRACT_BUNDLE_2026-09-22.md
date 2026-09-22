# Live Availability & Booking Contract Bundle — 2026-09-22

## Evidence

Live Settings → **Availability Calendar** opened read-only. It says this
drives the creator’s Discover badge and booking requests. Fields include:

- three status choices (Available, Busy, Not accepting);
- Booking lead time (number value `3`);
- Away/travel dates, Typical budget range, and client-facing note.

The number and three text inputs all have no `id`, `name`, associated label, or
ARIA label. They depend only on visible adjacent text/placeholders. The screen
is a non-semantic overlay (no dialog/modal isolation). No availability value or
Save action was used.

## P1 — Client-facing availability data lacks a safe structured contract

Free-text travel dates (`e.g. Oct 1–15`) and budgets (`e.g. $500–$2,000`) are
ambiguous, locale-dependent, difficult to validate, and can conflict with lead
time/status. Because this data drives discovery and booking requests, users can
receive misleading availability or quote expectations.

## Required remediation

1. Give persistent programmatic labels to every control, with an explicit
   fieldset/radio group for availability status and correctly exposed selected
   state.
2. Use structured, time-zone-aware date ranges (including multiple ranges and
   overlap validation) rather than only free text. If explanatory text remains,
   separate it from authoritative availability.
3. Model budget as structured currency + min/max amounts or make it clearly
   non-binding explanatory text. Never parse free-form client copy into a
   transaction price.
4. Define precedence among Not accepting, Busy, travel ranges, lead time,
   booking duration, and existing confirmed bookings; enforce it server-side
   when a booking is requested.
5. Show a client-facing preview and announce save/conflict/error state. Use the
   shared accessible modal/full-screen primitive, focus containment, and focus
   restoration.

## Acceptance

Keyboard/screen-reader users can identify current status and each input. Tests
cover overlapping travel dates, lead-time boundaries, time zones, status
changes, concurrent bookings, and clients seeing the same server-authoritative
availability used to accept/reject a booking.
