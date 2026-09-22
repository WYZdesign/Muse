# Live Collab Safety, Semantics, and Mobile Bundle — 2026-09-22

## Live deployed evidence

Authenticated Collab screen, mobile 414 CSS px, inspected after successful live navigation.

### Confirmed issues

1. **Brief search input has no accessible name or autocomplete contract.** The text input exposes only placeholder `Describe what you're looking for...`; no label, `aria-label`, `aria-labelledby`, name, or autocomplete.
2. **Filter controls misuse tab semantics.** Visible All / TFP / Paid / Open Call / Concept are `role=tab`, but lack a `role=tablist`, `aria-controls`, and panels. They are 38 px high, below the 44 px target policy.
3. **High-consequence brief actions are undersized.** Every Not interested, Report brief, and Safety info control measures only 22×22 px. Apply/Book/Respond controls are 32–33 px tall. These include actions that create a collaboration, book a service, hide content, or escalate a safety report.
4. **Ten per-card icon controls are completely unnamed.** They measure about 32×33 px at the right edge of brief cards. A screen-reader user cannot determine their purpose.
5. **No main landmark or live/status region exists.** The shared missing `#muse-main` issue continues here; searches, filters, application/book outcomes, reporting, errors, and safety state have no announcement surface.
6. **Custom role button debt is present in Collab too.** The live mounted DOM contains 167 `[role=button]` elements, including tag-like spans. Use native controls for real actions.

## Safety and product requirements

- Apply/Book/Respond must have explicit outcome state, duplicate-request protection, and an accessible confirmation that names the brief and recipient. Do not let a clipped/too-small control create a booking or application by accident.
- Report and Not interested controls need clear accessible names, 44×44 hit boxes, and a safe undo/recovery policy where appropriate. Report must never be nested inside a larger generic card action.
- The 18+ brief must be server-gated before action as well as visually labelled; filter/search results must not leak restricted brief content to ineligible users.
- Render price/timeline, application status, eligibility, and booked state from server-authorized truth; handle stale/closed briefs without exposing an actionable dead end.
- Filter implementation should use either a complete tab pattern or a named native filter group—not partial ARIA tabs.

## Acceptance tests

1. At 320/339/390/414 widths, every control meets 44×44 px hit policy while keeping adequate separation between safety/report/apply/book targets.
2. Search/filter input is labelled; state updates announce once; keyboard arrow/tab paths have no hidden control leaks.
3. Each Apply/Book/Respond request is idempotent, names its target in confirmation/error, and gracefully handles expired/filled/ineligible briefs.
4. Safety report / not-interested calls cannot be triggered through a neighbouring action; include keyboard, touch, retry, and network-failure tests.
5. Verify direct API denial for age/identity/ineligibility conditions and restricted-content query paths.
6. Run `npx tsc --noEmit`, full test suite, and authenticated mobile E2E before deploy. Keep demo mode enabled.

