# Live Bug Report Form Accessibility — 2026-09-22

## Evidence

Live Settings → **Report a Bug** was opened with Enter and inspected without
typing, attaching media, or submitting.

The accessibility tree exposes:

- a collapsed popup button whose only accessible value is `UI / Visual Issue`,
  with no programmatic label explaining it is the bug category;
- four unnamed editable controls (two text areas and two text fields);
- a disabled **Submit Bug** button and **Cancel** button.

Rendered DOM inspection confirms the category `<select>` and the visible bug
form controls have no `id`, associated `<label>`, `name`, or `aria-label`.
The only field hints are placeholders:

- `What happened?*`
- `Steps to reproduce (optional)`
- `Expected behavior`
- `Actual behavior`

Placeholders are not durable accessible labels and disappear as users enter
text. This breaks the platform’s earlier claimed input-label remediation on a
real support workflow.

## Required remediation

1. Use a semantic `<form aria-labelledby="bug-report-title">` with a visible
   H2/H3.
2. Give the category select an explicit `<label for>` such as **Issue
   category**, and give each field a persistent visible/programmatic label.
3. Mark the required description with `required` and convey it with
   `aria-required`; describe validation errors with `aria-describedby` and a
   scoped live region.
4. Give every attachment input a visible label and accepted types/size
   guidance if attachments are supported; do not rely on visual icons.
5. Preserve entered values after client validation failure and announce the
   submission result once—without exposing sensitive diagnostic data in the
   UI.

## Acceptance test

Using only a keyboard and screen reader, a tester can identify category,
description, reproduction steps, expected behavior, actual behavior,
attachment controls, required state, errors, and submit/cancel purpose before
entering any data. Unit/integration coverage must assert label association and
validation announcement.
