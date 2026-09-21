# ChatGPT Feed Mobile Interaction Bundle — 2026-09-21

## Test basis

Live Feed at **414 × 896** mobile viewport, using accessibility tree plus DOM target measurements.

## Findings

### Header/composer accessibility

- Feed header back control is an unnamed **42×42** button. Label it and make it at least 44×44 effective size.
- Composer entry area is announced only as a generic text-entry area. Give it a persistent visible label or `aria-label`, e.g. `Create a post`.
- Emoji button is announced only as **😊**. Label it `Add emoji`.

### Touch ergonomics — shared primitives

- Content tabs (All, Photos, Text, Videos, BTS) are **28px high**. Use the same 44px mobile tab target primitive as other surfaces.
- Voice, video, emoji, Post, and BTS composer controls are **36–41px high**. Raise effective hit areas to 44px.
- Each post’s report affordance is **27–28px**. It must be a 44px target despite its visually compact icon.
- Like, comment, share, and save controls are **41–43px** on the sampled cards. Normalize to >=44px and preserve spacing to avoid adjacent-tap errors.

### Semantics/state

- Preserve useful labels already present (`Record voice note`, `Record video note`, `Save for later`, `Report post`).
- Ensure tab selection remains exposed through native/ARIA tab state after the target-size refactor.
- Verify post-card avatar, post body, report, reaction, comment, share, and save remain distinct actions with no nested interactive elements.

## Acceptance checks

1. 320px/390px/414px: every Feed interactive target >=44px or has a documented equivalent hit area.
2. Screen reader announces `Back`, `Create a post`, `Add emoji`, content-tab selection, reports, reactions, comments, shares, and saves by purpose.
3. Keyboard and touch test each action without triggering adjacent-card navigation.
4. `npx tsc --noEmit` and full Vitest suite.
