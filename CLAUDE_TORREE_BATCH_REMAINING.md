# CLAUDE — RECEIVED, READY TO VERIFY + REMAINING TORREÉ ITEMS

> wyzmind shipped a large Torreé batch today across 5 commits (`4d0b445`, `fe3e099`, `fe0f...`, `267b5c2`).
> Everything below is on `main`, tsc clean, 285/285 tests, build compiles. Two parts:
> **(A) Verify what's done**, **(B) execute the remaining items** (not yet touched).

---

## A — SHIPPED by wyzmind (verify visually)

1. **Header page titles +30%** — all screens now 30px (was 24/22), except BTS page. Centered position/height
   standardized like Feed/Muses. Verify titles read larger + consistently centered.
2. **Themes = 8 variants** — 4 dark (lasunset, deepspace, nebula, deepsea — **villa removed**) + 4 light
   (sunrise, daylight, **sky**, **rose**). Sunrise reworked to read distinctly warm-orange; daylight pastel;
   sky = pastel blue/lavender; rose = pastel pink/cream. Light surfaces united via a `:is()` override block so
   nothing renders "broken/dark". Verify each swatch + that both light and dark themes render correctly.
3. **Real per-photo likes** — migration `015_add_photo_likes.sql` (applied to live DB). GET `?type=photo-likes`
   (counts + likedByMe) + POST `toggle-photo-like`, keyed by photo URL so the same image shares one count on
   Discover/portfolio/profile/feed. Discover card's `btn-like` (spark) now likes the **photo** (not the match)
   with a count badge. Verify the spark counter updates + persists.
4. **Discover card location/distance** purple text 14px → 21px.
5. **Feed profile avatar circles +30%** (52→68 composer, 40→52 post, 28→36 reply, 46→60 detail).
6. **Settings title** absolutely centered.
7. **iOS keyboard-zoom fixed** — `.inp` font-size 15→16px (stops Safari auto-zoom) + viewport
   `maximumScale:1, userScalable:false` (stops pinch-zoom/refresh break). Verify typing on mobile is smooth.
8. **Sessions** bookmark + View Profile → borderless icon buttons (FiBookmark / FiEye).

---

## B — REMAINING Torreé items (wyzmind has NOT touched — execute/verify)

1. **All badges tappable → details popup on EVERY page** (except Network cards / anything overlaying an image).
   Badges exist across Discover (zodiac/MBTI/life-path/chinese), Profile, ProfileScreen, etc. Ensure each opens a
   "what this means" popover. (Discover's `badgeInfo`/`whyInfo` already wired for card badges — extend the same.)
2. **Muse expand button: blur only the background behind it** when expanded, in offset rings, fading fast on
   collapse (or blur just the bottom-right corner). Open question — implement the cleaner option.
3. **Collab page:**
   - Filter tablist properly left-aligned to the page edge (currently leaks out the left a bit).
   - "Meet in public places" disclaimer → a tiny "ⓘ" info icon in the **top-left** of each card that opens a
     full popup (close/tap-out) with the complete safety text.
4. **Muses page:**
   - Bubble badges inconsistent on some matches (list view) only. Make them consistent + fit (no wrap/overhang).
   - Tapping the person's profile at the top of an open chat should open the full profile.
   - List-view preview = name, type, location + a last-message preview (when a chat exists).
   - (Collab already done: report flag + inverted X, search bar under tabs, bookmark de-bubbled, title centered.)
5. **Map (Discover map view):** show ALL FD Studio locations + the other advertised studios (currently partial).
   `studios.ts` + `StudiosScreen` have the data; wire every location pin.
6. **Network page:**
   - Color-coordinate filter buttons: sub-filter buttons = same color, different shades of the main filter button
     color, so they group by category.
   - Center the description text under the title; make it more concise.
   - Tapping a profile → overlay: close button in TOP-RIGHT, images full-dimension/fit, add all relevant profile info.
7. **Profile page:** halo thickness/tightness must match the Collab page profile circles (`story-ring` conic style).
8. **Activity ghost 'S' avatars** — profile page Activity + side-panel Notification sub-tabs (all except Unread)
   show a default 'S'/'Muse' avatar instead of real data. Root cause is server `from`/avatar normalization —
   fix the data, not just the fallback.
9. **Muse Pro page:** Apply button too close to the container below it (glow overlaps) + gap between Apply and
   the text input is too wide — tighten.

---

## Notes
- **Merge hygiene:** always `git fetch` + `git pull` first; `main` is at wyzmind's latest commit.
- Screenshot artifacts go in `.shots/` (gitignored).
- Migration `015` already applied to live DB — no action needed.
- Reuse the existing Popover/modal patterns (e.g. `badgeInfo`, `whyInfo`) rather than building new ones.

## The blunt context for the boardroom docs
This batch was pure UI/polish per Torreé. The strategy docs (`MUSE_*.md`) haven't changed. If you're doing a
visual pass, focus on the "verify" list in Part A first, then Part B.
