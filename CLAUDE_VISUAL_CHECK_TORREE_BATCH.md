# CLAUDE — VISUAL CHECK: Torreé's audit batch (wyzmind)

> wyzmind just shipped Torreé's personal-visual-audit batch. All changes are on `main`, tsc clean,
> 285/285 tests, build compiles. **Please do the final visual eyeball** against the live deploy
> (hard-refresh — the deploy is current, not stale; see `CLAUDE_VISION_HANDOVER.md`). Verify each
> item below, and flag anything that rendered off on a 390×844 mobile viewport.

## What changed (all by wyzmind)
1. **Verification banner → floating bubbler pill overlay.** No longer a top-attached bar; it floats
   over the header as a rounded pill, centered near the top. Copy: "Update Verification to Unlock
   Features · Verify". No emoji. `Verify` is the link. Dismiss X on the right. Verify it doesn't
   overlap the header buttons and dismisses cleanly.
2. **Settings: back button top-LEFT, "Settings" title centered, "Discovery Preferences" centered.**
   Title size standardized to 22px in a centered header.
3. **Light mode is now its own section** ("Light Mode") under the dark theme grid. New `daylight`
   theme with pastel palette (peach #FFDAB9, cream #FFF6E7, pastel yellow #F9D98A, pastel pink
   #FFB5C2, lavender #D4A5FF). Verify the daylight swatch renders and the whole app goes pastel-light
   (not dark/broken) when selected. It mirrors the `sunrise` light-mode override set, so check cards,
   nav, menu panel, inputs all read light.
4. **iPhone web-app bottom gap:** mobile `.phone` now `min-height:100dvh`, nav uses
   `env(safe-area-inset-bottom)`, `html,body{height:100%}`, `body{overflow-x:hidden}`. Verify no black
   gap at the bottom and no horizontal scroll on any screen.
5. **Profile > Activity icons robust:** avatar now falls back to a gradient letter-initial when there's
   no image; text/timestamp fall back to placeholders so a row can never render broken. Verify the 4
   recent-activity rows all look clean (no broken-image icon).
6. **Activity tabs (Applied/Saved):** briefs now fetched by id so titles resolve from real data (no more
   bare "Quest #69"). Verify Applied/Saved/Bookings/Reports tabs all render real content.
7. **Feed images:** now a full-width 4:3 aspect frame with `objectFit:cover` (edge-to-edge, no
   letterbox/overflow), same for video. Verify images/captions fill the card width cleanly.
8. **Feed report flag:** removed the yellow square box behind the purple flag — now a bare flag icon.
9. **Menu header gradient animated + more vivid** (`.hamburger-panel::before` + title): animated, more
   saturated lavender/gold/pink/green. Verify it shifts smoothly (reduced-motion respected).
10. **Quests:** header padding normalized (no clip), `.quest-panel`/`.quest-grid` have `overflow-x:hidden`
    (no horizontal scroll), tier badge is now a **vertical colored tab on the left edge** with
    vertical label text, and cards have `padding-left:46px` to clear it. Verify no horizontal scroll,
    header fully visible, badges read as left-edge tabs.
11. **Collab:** title centered, search moved out of the header into a **search bar below the category
    tabs** (with the search icon inside the bar), header title 22px, X (not-interested) inverted to
    light-bg/dark-text, new **report flag** button (inverted colors) beside the X, bookmark button
    de-bubbled (transparent, no pill). Verify the header search button is gone, the search bar sits
    under the tabs, the X + flag are top-right and readable, and the Save button no longer has a pill.
12. **Header consistency:** all page titles standardized to 24px (was 30/32), Collab/Settings to 22px.
    Verify titles read consistent across Discover, Feed, Sessions, Community, Analytics, Network,
    Studios, Portfolio, Collab, Settings.

## Note on report wiring
The Collab report flag calls `setShowReport`/`setReportTarget` (type `brief`) — same modal the other
screens use. Verify tapping it opens the report modal with the brief targeted.

## Handoff cleanliness
- Everything is committed + pushed + the deploy verified READY. Don't merge over blind — `main` is at
  the latest wyzmind commit; `git pull`/`git fetch` first.
- No screenshot artifacts in the repo (`.shots/` gitignored).
