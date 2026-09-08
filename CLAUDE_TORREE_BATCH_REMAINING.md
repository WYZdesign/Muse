# CLAUDE — RECEIVED, READY TO VERIFY + REMAINING TORREÉ ITEMS

> wyzmind shipped a large Torreé batch across 6 commits (`4d0b445`, `fe3e099`, `267b5c2`, `00b9748` + more).
> Everything is on `main`, tsc clean, 285/285 tests, build compiles, prod READY. Two parts:
> **(A) Verify what's done**, **(B) execute the remaining items** (not yet touched).

---

## A — SHIPPED by wyzmind (verify visually)

1. **Header page titles +30%** — all screens 30px (was 24/22), except BTS. Centered like Feed/Muses.
2. **Themes = 8 variants** — 4 dark (lasunset, deepspace, nebula, deepsea — **villa removed**) + 4 light
   (sunrise, daylight, **sky**, **rose**). Sunrise reworked warm-orange; daylight pastel; sky blue/lavender;
   rose pink/cream. Light surfaces united via `:is()` override block — nothing renders "broken/dark".
3. **Real per-photo likes** — migration 015 (applied live DB, verified). GET `?type=photo-likes` + POST
   `toggle-photo-like`, keyed by photo URL. Discover card spark likes the **photo** with a count; same image
   shares one count across Discover/portfolio/profile/feed. Verified live: HTTP 200 `{"counts":{...}}`.
4. **Discover card distance/location** purple text 14→21px.
5. **Feed profile avatar circles +30%** (52→68, 40→52, 28→36, 46→60).
6. **Settings title** absolutely centered.
7. **iOS keyboard-zoom fixed** — `.inp` 15→16px + viewport `maximumScale:1, userScalable:false`.
8. **Sessions** bookmark + View Profile → borderless icon buttons (FiBookmark / FiEye).
9. **Activity ghost avatars fixed** — system notifications now get type-aware labels (Muse Quest/Rewards/
   Safety/Boost/Pro) + themed `_systemAvatar` letter instead of generic "Muse"/"M"/blank "S". Fixed in both
   `feedbackGetNotifications` (POST) and GET `?type=notifications` (Profile Activity merge). Verified live.

---

## B — REMAINING Torreé items (NOT yet touched)

1. **All badges tappable → details popup on EVERY page** (except Network cards / image-overlays). Discover
   card badges already wired via `badgeInfo`/`whyInfo` — extend the same popover pattern to Profile badges,
   ProfileScreen badges, and anywhere else badges render.
2. **Muse expand button: blur only the background behind it** when expanded (offset rings; fade fast on
   collapse). Open question — implement the cleaner option (bottom-right corner blur is the simpler one).
3. **Collab page:** filter tablist properly left-aligned (leaks left); "Meet in public" → tiny "ⓘ" info icon
   top-left of each card opening a full popup (close/tap-out).
4. **Muses page:** consistent bubble badges (no wrap/overhang); tapping person's profile at top of open chat →
   full profile; list preview = name/type/location + last-message preview.
5. **Map (Discover map view):** show all FD Studio locations + other advertised studios.
6. **Network page:** color-coordinate filter buttons (sub = shades of main); center + condense description;
   profile overlay → close top-right, images full-dimension, all relevant info.
7. **Profile page:** halo thickness/tightness match Collab profile circles (`.story-ring` conic).
8. **Muse Pro page:** Apply button too close to container below (glow overlaps); gap to text input too wide.

---

## Notes
- **Merge hygiene:** `git fetch` + `git pull` first; `main` is at wyzmind's latest commit.
- Screenshot artifacts → `.shots/` (gitignored).
- Migration 015 already applied — no action needed.
- Reuse existing Popover/modal patterns (`badgeInfo`, `whyInfo`) instead of building new ones.
