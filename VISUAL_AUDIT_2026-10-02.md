# Production visual audit — 2026-10-02

Scope: authenticated, non-mutating visual and accessibility review of `https://muse.wyzdesign.com/muse` using the user-owned Codex sidebar browser. No messages, bookings, payments, profile edits, uploads, settings changes, or account actions were submitted.

## Coverage

| Surface | Viewports checked | Result |
| --- | --- | --- |
| Discovery | 320, 375, 390, 768, 1440 | Loads, no document-level horizontal overflow; card, photo controls and bottom navigation visible. |
| Feed | 390 | Composer, filters, posts and navigation visible. Recording controls correctly communicate their unavailable/moderation state. |
| Collab | 390 | Search, category controls, brief cards, safety/report affordances and booking entry points visible. |
| Muses | 390 | Match list, tabs, inbox count and navigation visible. |
| BTS | 390 | Moment CTA, story rail, filters, feed and report actions visible. Camera/upload flow intentionally not invoked. |
| Menu | 390, 1440 | Sheet opens and closes; source confirms `role=dialog`, `aria-modal=true`, focus-trap and Escape support. |
| Profile | 390 | Profile summary, privacy switch, portfolio slots and account actions visible. No profile data changed. |
| Settings | 390 | Preferences, privacy, safety, billing and legal routes are visible; no switches/sliders were changed. |
| Sessions | 390 | Browse, bookings, requests, listing and details affordances visible. No booking or payment initiated. |
| Network | 390, 1440 | Search, filters, professional cards and save affordances visible. |

## Evidence

- `/api/health` returned HTTP 200 with `status: ok` in a real browser session.
- At 320, 375, 390, 768 and 1440 pixels on Discovery, `scrollWidth` equalled `clientWidth`.
- Network at 390 and 1440 also had no document-level horizontal overflow.
- Keyboard Tab from the Network page reached the visible Back control. Menu source includes a focus trap and modal semantics; the accessibility tree retaining background nodes is not by itself evidence that focus escapes the modal.
- The live browser returned no page errors during this pass.
- One warning was recorded: `muse:spatial-depth` segmentation fetch failed, with an explicit fallback path for blocked fetches. The page remained usable. Validate this against a normal non-ad-blocked Chrome profile before launch, but do not report it as a production breakage yet.

## Findings

1. **P2 — clipped visual labels on narrow mobile.** At 390, Discovery's top-left title renders as `Disco…`. On the Collab and BTS category rails, the final category is visibly partial. The underlying controls remain accessible, but the visible truncation weakens scanability. Reproduce at 390px on the Discover, Collab and BTS screens.
2. **P2 — desktop legibility needs a human design acceptance pass.** The desktop layout intentionally places the phone canvas over a blurred, animated backdrop. CSS inspection confirms the phone content itself is not filtered, but the combined backdrop/transparent-surface effect makes screenshots look soft at 1440. Decide whether that depth treatment is the intended brand presentation on large screens; this is not a confirmed rendering bug.
3. **P3 — input hint truncation.** Network's long search hint is clipped at 390px. It does not affect entry or accessibility, but a shorter placeholder would read more intentionally.

## Artifacts

Viewport captures are stored outside the repository at:
`C:\Users\torre\.codex\visualizations\2026\10\02\01a0fe2a-6a32-7f43-8430-c2aa89044ad6\muse-visual-audit-2026-10-02`

They include Discover at five widths and authenticated mobile captures for Feed, Collab, Muses, BTS, Menu, Profile, Settings, Sessions and Network, plus desktop Network. Treat them as dated visual evidence, not approval of untested authenticated actions.

## Not covered

Onboarding, account creation, password reset, OAuth, identity verification, uploads, payments, booking confirmation, messaging, account deletion and privileged admin flows were not run because they mutate data, transmit user information, or require a dedicated staging environment. They remain launch-readiness checks rather than visual-audit evidence.
