# Corner-system audit — 2026-10-02

## Scope and method

Reviewed the current `origin/main` UI architecture and the active split source on
the documentation review branch. This complements the signed-in browser review
recorded in `VISUAL_AUDIT_2026-10-02.md`; no user data, account settings,
messages, booking, payment, upload, or verification action was triggered to
open stateful overlays.

The audit covered the shared modal/sheet primitives plus the independently
styled overlays and lightbox components. Circular avatars, status dots, pills,
and media thumbnails are intentionally excluded from the surface-radius
recommendation.

## Finding: daily login

`DailyLoginModal.tsx` uses `.daily-login-card`, currently `border-radius:20px`
in `muse.css` (line 1254). Its buttons are 12px. The card is polished, but it
looks marginally squarer than the product's other centered, high-attention
surfaces: view-profile, age verification, and upsell all use 24px. The observed
signed-in daily-login prompt is the same component.

**Recommendation (P2):** change only `.daily-login-card` from **20px to 24px**.
Keep the two full-width actions at 12px: that contrast makes the panel feel
soft while retaining clean, tactile controls.

## Consistency result

The principal overlay family is already close to a usable system:

| Surface | Current implementation | Assessment |
| --- | --- | --- |
| Shared full-screen modal body | `.modal-body` shared primitive | Correct role; use it as the principal shell token owner. |
| View profile | inline `borderRadius:24` | Matches recommended centered-surface radius. |
| Upsell | inline `borderRadius:24` | Matches recommended centered-surface radius. |
| Age verification | inline `borderRadius:24` | Matches recommended centered-surface radius. |
| Daily login | CSS `20px` | Increase to 24px for the requested softer feel. |
| Referral panel | inline `20px` | Keep functionally safe; align to 24px during token migration. |
| Quest panel / premium popup | CSS `16px` | Visibly denser than the product's other elevated panels; make 20px if retained as floating panels. |
| Bottom sheets | e.g. `.intent-modal` `20px 20px 0 0` | Correct shape, but use 24px 24px 0 0 to match the new surface family. |
| Photo lightbox | intentionally edge-to-edge black canvas | Correct exception; its circular controls are consistent. |

## Proposed semantic scale

Use named CSS custom properties rather than forcing every component to the same
number:

```css
--radius-control: 12px;
--radius-media: 16px;
--radius-card: 20px;
--radius-surface: 24px;
--radius-sheet: 24px 24px 0 0;
--radius-pill: 999px;
```

Use `--radius-surface` for centered dialogs and floating panels. Use
`--radius-sheet` only for surfaces attached to the bottom edge. Keep 12px for
buttons and form controls, 16px for images/media wells, and 20px for ordinary
cards. This preserves intentional hierarchy instead of making the interface
uniformly round.

## Implementation handoff to wyzmind

1. Add the five semantic properties near the existing theme variables in
   `src/app/(muse)/muse/muse.css`.
2. Change `.daily-login-card` to `var(--radius-surface)` (24px).
3. Migrate the shared `.modal-panel`, `.modal-body`, quest panel, premium popup,
   and bottom-sheet selectors first. Then replace inline modal values in
   `ViewProfileModal.tsx`, `UpsellModal.tsx`, `AgeVerificationModal.tsx`, and
   `ReferralPanel.tsx` with the same variables or a shared surface class.
4. Preserve intentional exceptions: circular controls, pills, square-corner
   full-bleed lightbox canvas, and small media thumbnails.
5. Visually re-check the daily login, profile, edit profile, report, quests,
   photo lightbox, age verification, referral, and payment/upgrade overlays at
   390px and 1440px after the change.

## Guardrail

Do not do a blind global replacement of all `border-radius` values. The source
contains purposefully distinct values for controls, cards, pill tags, circular
buttons, media, and edge-attached sheets. Tokenizing by semantic role will
improve consistency without flattening the visual language.
