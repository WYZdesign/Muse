# OpenCode Handoff — 2026-09-21 (Round 7, updated)

## Commits
- `eec0954` — online badge + 44px mobile a11y targets across Network/Feed/Discover
- `3e1bd20` — Discover queued card pointer-events:none + duplicate portfolio controls removed + Network card tags display-only

## What OpenCode Completed This Session

### 1. Online Badge → Real Presence
- `page.tsx:740`: Added normalization after `setMatches(d.matches)` — maps each match to compute `online` from `target_id.last_seen_at` (5-minute window = online)

### 2. Lightbox Verified Correct
- Close button: `position: absolute, top: 16, right: 16` ✅
- Images: `fill` + `objectFit: "contain"` + `sizes="100vw"` ✅

### 3. NetworkScreen Mobile A11y
- Back icon: `aria-label="Back to menu"`, raised to 44×44
- Search input: `aria-label="Search professionals"`
- Filter strip: gradient overflow affordance via `maskImage` + `aria-label="Filter professionals"`
- All filter buttons: raised to `min-height: 44px, padding: 10px 14px`
- Save button: raised from 34×34 → 44×44
- Card metadata tags (exp, openings, rate, looking, badges, verified): converted to display-only `<span>` — removed `role="button"`, `tabIndex`, `onClick`, `cursor: pointer` from all tags. Card tap opens profile where full details live.

### 4. FeedScreen Mobile A11y
- Back button: `aria-label="Back"`, 44×44
- Composer textarea: `aria-label="Create a post"`
- Emoji button: `aria-label="Add emoji"`, 44×44
- Photo/voice/video controls: 44×44
- Content tabs: `min-height: 44px, padding: 10px 14px`
- Report button: 44×44
- Like/comment/share/save: `height: 44`
- Post/BTS buttons: `min-height: 44px, padding: 12px 0`

### 5. DiscoverScreen Mobile A11y
- Header buttons (Search, Preferences, Map, Boost): 44×44
- Match radial buttons (Rewind, Pass, Super Like, Like, Note): all 44×44
- Queued cards: added `pointerEvents: "none"` to non-top cards (alongside existing `inert` + `aria-hidden`)
- Duplicate portfolio controls removed: removed `card-photo-zone` left/right divs (swipe gestures + dots already handle navigation)
- Card photo dots: wrapped in `<button>` with 44×44 hit targets, `aria-label="Show photo N"`
- Card prompt arrows/like: raised to `min-width: 44px, min-height: 44px`
- Card anchor like: raised to `padding: 10px 14px, min-height: 44px`

### 6. MusesScreen
- Back button: `aria-label="Go back"` ✅
- Name truncation: CSS ✅

## What ChatGPT Should Focus On Next

### From ChatGPT's own audits (still open):
1. **Discover swipe-state regression test** — verify during-swipe: outgoing card opaque until completion, no premature next-card reveal. Test Pass, Like, Super Like, keyboard.
2. **Chat back button** — ChatScreen's back is 42×42, needs 44×44 + aria-label
3. **BTS back button** — BtsScreen's back needs same treatment
4. **All other screens' back buttons** — CommunityScreen, SessionsScreen, SettingsScreen, ProfileScreen, etc.
5. **Nested interactive targets** — Feed post has avatar tap inside card tap; verify no double invocation
6. **Collab brief report button** — line 261: `width: 22, height: 22` — needs 44×44

### Deferred (P1, architectural):
- CSP nonce migration — `unsafe-inline` in script-src is Next.js constraint

## Known State
- Branch: `mutation-observer-fix`
- Latest SHA: `3e1bd20`
- All 6 modified files: muse.css, page.tsx, DiscoverScreen.tsx, FeedScreen.tsx, MusesScreen.tsx, NetworkScreen.tsx
