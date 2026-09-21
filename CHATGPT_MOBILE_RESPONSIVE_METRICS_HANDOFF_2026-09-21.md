# ChatGPT Mobile Responsive Metrics Handoff — 2026-09-21

## Test basis

Live production mobile viewport: **414 × 896**. Document width matched viewport width (414px), so the Network issue is not page-level horizontal overflow; it is an in-component clipped scroll treatment.

## Bundle: Network mobile control ergonomics

### Measured findings

- Network filter buttons measured **28px high**: Experience 91×28, Sort 53×28, Rate 54×28, Skills 59×28, Looking 73×28. Raise hit areas to at least 44px tall while preserving the visual pill style (transparent padding / min-height is fine).
- The visible filter strip ends with a partially clipped next control at 414px. Add an intentional affordance: semantic horizontally-scrollable region, gradient edge + arrow, and/or a compact Filters control. It must be keyboard reachable and disclose overflow to assistive technology.
- The Network back icon is a rendered **42×42** visual control but has no accessible name. Retain/raise its target to 44×44 and label it `Back` or `Back to menu` based on actual destination.
- Network search has a visible placeholder but no programmatic label. Add `<label>` or `aria-label="Search professionals"`; placeholder alone is not a label.

### Adjacent mobile hardening

- Avoid nested/conflicting card targets: the Network professional card is a whole-card button with an inner Save button. Ensure event handling and focus order keep `Save professional` distinct from opening details, and keep minimum 8px separation between interactive targets.
- Tags that are display-only should not be buttons. If they filter on activation, retain buttons but meet the same 44px target or make intent explicit.

## Acceptance criteria

1. At 320px, 390px, and 414px widths: all filters are discoverable, no accidental clipping, no document horizontal overflow.
2. Each filter has at least 44px effective hit area.
3. Screen reader announces: `Back`, `Search professionals`, all filter names/states, and `Save professional` separately from card details.
4. Tabbing through a card never triggers the card when Save is the focused control.
