# ChatGPT Mobile Touch-Target Bundle — 2026-09-21

## Live automated result

At the 414px mobile viewport, the Network screen exposed **57 visible interactive controls; 46 were smaller than 44px in at least one dimension**.

## Fix as one component-system bundle

### Priority controls

- Header Back: **42×42**, unnamed. Make 44×44 effective target and label it.
- Save professional controls: **34×34** on every card. Keep icon visual size if desired, but supply a 44×44 target, an `aria-label`, and separation from the card’s detail action.
- Filter controls: **28px high** (Experience, Sort, Rate, Skills, Looking); Hiring tab is also **28px high**. Convert the shared chip/tab primitive to `min-height: 44px` for mobile.

### Card metadata/tags

The following are exposed as buttons but are only **20–24px high**:

- Experience / openings / rate chips (24px)
- Requested-role tags (20px)
- Credential, style, and discipline tags (20–22px)

Choose one semantic model consistently:

1. **Display-only metadata:** render non-interactive text/spans—do not expose as buttons.
2. **Interactive filters/details:** maintain button semantics and raise effective target to 44px using a shared mobile token; preserve spacing so adjacent controls do not overlap.

### Implementation guidance

- Introduce a shared `mobileInteractiveMinSize` / chip primitive rather than patching individual cards.
- Use a visually compact 20–24px pill inside a 44px transparent/adequately padded button if visual density is essential.
- Preserve independent card detail and save actions; no nested interactive elements.

## Acceptance checks

- Instrument the Network screen at 320px, 390px, and 414px. Every visible interactive target must be >=44px or must no longer be interactive.
- Verify keyboard focus order/card activation and screen-reader roles after refactor.
- Add a regression test or component test for chip and icon-button minimum target class/token application.
