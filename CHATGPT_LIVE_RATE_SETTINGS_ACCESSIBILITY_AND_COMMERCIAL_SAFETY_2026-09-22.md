# Live Rate Settings Accessibility and Commercial Safety — 2026-09-22

## Evidence

Live Settings → **Rate Settings** opened read-only. It says rates are shown to
clients and pre-fill booking requests. The form includes currency controls,
hourly/half-day/full-day rates, client-facing notes, and Save.

Accessibility/Dom evidence:

- The three amount fields are number steppers with placeholders `150`, `600`,
  and `1100`, but no associated label, ID/name, or ARIA label.
- The client-facing notes input has only placeholder `e.g. Travel billed
  separately`, with no label/ID/name/ARIA label.
- USD/EUR/GBP/CAD/AUD are generic buttons with no selected/pressed state or
  semantic radio/tab grouping.
- The overlay lacks `dialog`/`aria-modal` and does not inert the background.

No value, currency, note, or Save control was changed.

## Impact

Creators using screen readers cannot reliably tell which monetary value they
are entering or which currency is active, even though these values become
client-visible and pre-fill commercial booking requests. Placeholder-only rate
guidance is especially unsafe once users enter a number.

## Required remediation

1. Give every rate a visible `<label for>` (e.g., **Hourly rate**) and an
   accessible currency association—either include the currency in the field
   label/description or use `aria-describedby` tied to an active currency
   status.
2. Implement currency as a labelled radio group or correctly selected tab/list
   control; announce changes and clarify whether existing amounts are
   converted, retained, or cleared. Do not silently reinterpret money.
3. Label the notes field persistently and disclose that it is client-visible;
   enforce length/content limits with accessible validation.
4. Validate currency/amount precision, min/max, and server authorization on
   the server. Use decimal-safe monetary representation, never floating-point
   client values as authoritative booking prices.
5. Reuse the focus-contained accessible modal primitive or a semantic full
   screen. On save, announce success/failure and re-fetch the authoritative
   values.

## Acceptance

Keyboard/screen-reader tests identify each rate, active currency, notes
visibility, validation error, and save result. Integration tests prove that a
creator can only change their own rates and that a booking snapshots the
server-authoritative amount/currency rather than mutable UI state.
