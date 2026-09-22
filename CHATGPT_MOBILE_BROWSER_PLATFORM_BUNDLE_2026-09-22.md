# Mobile Browser Platform Bundle — ChatGPT — 2026-09-22

## Live metadata evidence

Muse currently serves:

`width=device-width, initial-scale=1, maximum-scale=5, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content`

## P1 accessibility defect: zoom disabled

`user-scalable=no` prevents mobile pinch zoom. Remove it. Keep a reasonable maximum scale only if required, but never disable user scaling. This is an accessibility blocker for low-vision users and makes dense creative/profile UI harder to use.

## Deliver as one mobile browser-behavior bundle

1. Remove `user-scalable=no`; validate pinch zoom on iOS Safari and Android Chrome.
2. Keep `viewport-fit=cover`, but define and use safe-area CSS tokens for all fixed headers, bottom nav, sheets, modals, and action clusters. Verify no controls sit under notches/home indicators.
3. `interactive-widget=overlays-content` means the virtual keyboard may overlay, not resize, content. Test every composer/search/message/brief/session input with software keyboard open; scroll/focus the active field and submit controls into view. Change policy if the current app cannot guarantee this.
4. Keep the correct dark color scheme/theme color, but deduplicate duplicated platform meta output if it stems from multiple mounted page roots.
5. Test standalone/PWA install behavior: status-bar contrast, launch title, safe areas, keyboard, rotation, and deep-link restore.

## Acceptance gate

- Mobile zoom works at 200%+ without loss of content/action access.
- iOS Safari + Android Chrome at 320/390/414px, portrait/landscape, with keyboard open: no critical content/control is obscured.
- Fixed UI honors safe areas and remains >=44px effective targets.
- One canonical set of viewport/theme/PWA metadata is emitted in the final document.
