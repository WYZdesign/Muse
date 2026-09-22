# Platform Semantic Primitives Bundle — ChatGPT — 2026-09-22

## Live mounted-DOM evidence

The current client contains **182 non-native elements with `role="button"`** (DIV, SPAN, IMG) across Discover, Feed, Collab, Community, Sessions, Network, Profile, and related mounted surfaces. Many have `tabindex="0"` but no native keyboard/click semantics, no accessible name, or are used for display-only metadata.

Quantified on the live mounted DOM:

- **182** custom non-native role-button controls; **7** have no usable accessible name.
- **8 of 8** discovered input/textarea/select fields lack an associated programmatic label under the current markup.
- **33** role=tab controls; **29** are not owned by a role=tablist; **33 of 33** lack `aria-controls` / a linked panel relationship.

The same mounted DOM exposes multiple text/file inputs with no `aria-label`, `aria-labelledby`, or programmatic label. Examples include composer, message, brief, Network search, referral, and upload fields.

Multiple tab implementations expose `role="tab"` and `aria-selected`, but often lack a labelled `tablist`, `aria-controls`, and linked tabpanel semantics. Implementations currently vary across Feed, BTS, Collab, Community, Sessions, Network, and Profile.

## Deliver as one platform primitive migration

### 1. Replace custom action shims

- Default to native `<button type="button">` for all actions.
- Use `<a>` only for navigation with a real URL.
- Delete `role="button" tabindex="0"` wrappers when a native descendant exists; never retain both.
- Display-only status, tag, badge, chip, location, type, role, and metadata elements must be non-interactive text—not keyboard stops.
- When a non-native primitive is truly unavoidable, centralize it in one tested component with pointer, Enter, Space, disabled, focus-visible, name, and target-size behavior.

### 2. Form-label contract

- Every text field, textarea, select, and file input gets an associated visible `<label>` or accessible name.
- Placeholder is supplemental hint only, never the sole field label.
- File inputs announce purpose and accepted type/count; record/upload controls announce recording state.
- Add error descriptions with `aria-describedby` and live-region validation updates where appropriate.

### 3. One tab primitive

- One shared tablist/tab/tabpanel component with labelled `tablist`, `aria-selected`, `aria-controls`, tabpanel `aria-labelledby`, roving tab focus, Arrow/Home/End navigation, and keyboard activation policy.
- Refactor every existing variant onto the primitive: Feed, BTS, Collab, Community, Sessions, Network, Profile portfolio.
- Remove role=tab from controls that are actually filters without associated panels; use buttons/checkboxes/chips as appropriate.

### 4. Regression enforcement

- ESLint/custom rule: disallow raw `role="button"` outside the approved primitive; forbid interactive descendants in `aria-hidden`/inert roots.
- Test helper scans visible controls for accessible names and native/approved semantics.
- Run keyboard traversal snapshots across every primary screen and dialog.

## Acceptance gate

1. Custom `role="button"` count is reduced to zero outside explicitly approved primitives, documented by audit.
2. Every input/file control has a unique programmatic label; no placeholder-only field.
3. Every real tab has correct tablist/tab/tabpanel relationship and keyboard behavior.
4. Display-only metadata no longer bloats keyboard traversal.
5. Axe + keyboard regression suite at 320/390/414px passes on Discover, Feed, Collab, Community, Muses, BTS, Sessions, Network, Profile, Settings, Menu, and overlays.
