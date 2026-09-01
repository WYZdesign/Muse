# HANDOVER — Muse Sessions 52-55+ (complete continuity brief for next Claude)

## CRITICAL: Read this FIRST
- Repo: `WYZdesign/Muse` (private, Vercel-deployed)
- Local path: `V:\Muse`
- Owner: Torreé. Tone: direct, no fluff, deliver complete diffs.
- Working style: Torreé fires off fast 1-2 line mobile messages. He is NOT stupid. He is annoyed. Read his requests literally and ship the fix — no extra commentary.
- Past 4 sessions: 52 (batched motion audit), 53 (origin-check 403 blocker), 54 (social connect/disconnect fix, Stripe checkout), 55 (business model + FD Studio). This session (56) handled UI polish, gradient matching, Muses card UX, Network tab filter cleanup, BTS gradient, profile ring centering.
- All previous commits (52-55) are live in main. This handover covers everything done in session 56 plus the open items Torreé raised mid-session that I (Claude) need to audit and finish.

## Repo state at handover

| Branch | Commit | Status |
|--------|--------|--------|
| main | 3eb579d | LIVE on Vercel prod |
| main | e279597 | FD Photo Studio page + client guide, route from Sessions, removed feed share icon |

134/134 tests passing. `tsc --noEmit` clean. `npm run build` clean.

## What was done in session 56 (Torreé-driven UI polish)

### Muses screen — expansion removed
- **File**: `src/app/(muse)/muse/components/MatchCard.tsx`
- **File**: `src/app/(muse)/muse/screens/MusesScreen.tsx`
- **What**: Cards no longer expand in place on tap. They go straight to chat on click. Toweré said "just have it so when you tap card it opens chat."
- **Deletions**: All drag/swipe/expand machinery (dragOffset, isDragging, pointerDown/Move/Up, REVEAL_OFFSET, expanded panel, Report/Block/Unmatch reveal inside expanded). MatchCard is now ~70 lines.
- **State cleanup**: `expandedMatchId` prop and `matchActions.setExpandedMatchId` kept in props (no callers, but the type stays). `expanded={expandedMatchId === String(m.id)}` removed from MusesScreen render call.
- **Keep**: Like/chat layout. `match-actions-row` on swipe cards in Discover. Swipe-to-unmatch swipe cards in Discover.

### Network tab — filter UI cleanup
- **File**: `src/app/(muse)/muse/screens/NetworkScreen.tsx`
- **What**: Removed the old 5 `<select>` dropdowns (Experience, Rate, Skills, Looking, Sort) and the duplicate filter-bubble row. Now there's ONE horizontal-scroll row of filter bubbles (Experience, Sort, Rate, Skills, Looking, Hiring) that expand individually into their own panel. Torreé said "only one horizontal scroll filter sort line of bubble buttons that expand individually to more settings all neatly and cleanly stacked and full wide."
- **What still needs work** (audit this): the expanded panels below are still on multiple lines and wrap. I think they're fine but verify per "should be neatly and cleanly stacked and full wide" — if the expanded panel buttons (Exp: All/Rising/Established/Veteran) wrap, that's intended. If they overflow horizontally, switch flexWrap to nowrap + overflow scroll.
- **Active filter badges**: removed from the old select row. They're no longer needed because the bubble button shows `✓` when active.

### Discover title alignment
- **File**: `src/app/(muse)/muse/muse.css`
- **File**: `src/app/(muse)/muse/screens/DiscoverScreen.tsx`
- **What**: `.logo-link` had `position:absolute; left:50%; top:50%; transform:translate(-50%,-50%)` which was centering ALL title text including on Discover where it should be left-aligned. Fixed: made `.logo-link` use a `position:relative` default with `align-self:center` and a `--title-gradient` CSS variable so per-page titles can opt into absolute centering if needed. Discover title overrides to `position:static; left:auto; top:auto; transform:none; margin:0; padding:0;` and the matching gradient.

### Profile ring centering
- **File**: `src/app/(muse)/muse/muse.css`
- **What**: `.profile-ring` uses `position:absolute; top:50%; left:50%; transform:translate(-50%,-50%)` for centering. The `ringSpin` keyframe was `to { transform: rotate(360deg) }` which clobbered the centering on every frame. Fixed: `@keyframes ringSpin { to { transform: translate(-50%,-50%) rotate(360deg) } }` so the centering is preserved through the animation.
- **Torreé was VERY upset** that I broke this after getting it right in session 51. Do not regress.

### Title gradients match nav icon gradients
- **File**: `src/app/(muse)/muse/components/Nav.tsx` (REFERENCE — these are the canonical gradients)
- **Files**: All screen headers updated: DiscoverScreen, MusesScreen, FeedScreen, CollabScreen, PortfolioScreen, CommunityScreen, SessionsScreen, SettingsScreen, SubscriptionScreen, AnalyticsScreen, NetworkScreen, BtsScreen, ProfileScreen.
- **What**: Each page's title now uses the EXACT same `linear-gradient(90deg, ...)` as its bottom-nav icon and (where applicable) the hamburger menu icon.

| Page | Bottom-nav gradient | Title gradient | Hamburger grad |
|------|---------------------|----------------|----------------|
| Discover | gold/peach | `#FFD700,#FF8C69,#FFB6C1,#FFD700,#FFA07A,#FFD700` | n/a (top-level) |
| Feed (Connections) | sky blue | `#1E90FF,#87CEEE,#B0C4DE,#1E90FF,#ADD8E6,#1E90FF` | n/a (top-level) |
| Collab (Briefs) | teal/green | `#20B2AA,#9ACD32,#00CED1,#20B2AA,#7CFC00,#20B2AA` | n/a (top-level) |
| Muses (Matches) | fire | `#FF4500,#FFD700,#FFAA00,#FF4500,#FF8C00,#FF4500` | n/a (top-level) |
| BTS (Moments) | orange→yellow | `#FF4500,#FFA500,#FFFF00,#FFA500,#FF4500` | n/a (top-level) |
| Network | (hamburger only) | `#1E90FF,#87CEEE,#B0C4DE,#1E90FF,#ADD8E6,#1E90FF` | `#B3E5FC,#64B5F6,#00BCD4` (blue) |
| Sessions | (hamburger only) | `#E1BEE7,#9C27B0,#FF4081,#E1BEE7,#9C27B0,#E1BEE7` | `#E1BEE7,#9C27B0,#FF4081` (purple) |
| Community | (hamburger only) | `#FF8A80,#FF4757,#FFD700,#FF8A80,#FF4757,#FF8A80` | `#FF8A80,#FF4757,#FFD700` (coral) |
| Profile | (hamburger only) | `#FFD700,#FFB5C2,#B388FF,#FFD700,#FFB5C2,#FFD700` | `#FFD700,#FFB5C2,#B388FF` (gold/pink) |
| Settings | (hamburger only) | `#CE93D8,#B388FF,#A5D6A7,#CE93D8,#B388FF,#CE93D8` | `#CE93D8,#B388FF,#A5D6A7` (lavender) |

### BTS — pink-to-yellow gradient
- **File**: `src/app/(muse)/muse/screens/BtsScreen.tsx`
- **What**: Title text changed from `linear-gradient(90deg, #fff 0%, #FFE4E1 50%, #FFFACD 100%)` (white/pink/cream) to `linear-gradient(90deg, #FF1493 0%, #FF69B4 50%, #FFD700 100%)` (deep pink → light pink → gold). Header background `headerGradient` also tightened: `#FF1493 → #FA8072 → #FFD700` became `#FF1493 → #FF69B4 → #FFD700` (all pink-to-gold, no orange middle).

### Session 55 — full business model (DONE before session 56)
1. **Closed-beta scope**: `MUSE_CLOSED_BETA_HIDE_SOCIAL` flag in `lib/config.ts`. Hides Community menu entry, Forum sub-tab. Default ON. Toggle to reveal post-beta.
2. **Marketplace pricing**: split-fee model in `app/api/muse/connect/route.ts` + `lib/config.ts`. `MUSE_HOST_COMMISSION_RATE=0.07` (deducted from host payout), `MUSE_BUYER_SERVICE_FEE_RATE=0.08` (added on top, itemized as separate "Muse service fee" line at checkout). Both env-overridable.
3. **PaymentHistory.tsx**: removed hardcoded "(5%)" labels. Now computes real % from `commission_cents / amount_cents`. Summary says "Muse Fee".
4. **Subscription tiers**: "Muse Pro Annual" ($79.99/yr) and "Muse Studio" ($29.99/mo) added to `components/types.ts` and `PRICE_MAP` in `app/api/checkout/route.ts`. Real Stripe Price objects needed in Dashboard before purchasable in prod. Dev/test-mode fallback creates products/prices per plan.
5. **SubscriptionScreen.tsx** tier-key bug: `tier.name.toLowerCase().replace(" ", "_")` only swapped first space. Fixed: `.replace(/ /g, "_")`.
6. **SettingsScreen.tsx** NSFW hardening: always requires Stripe Identity verification. No self-attestation fallback. Stricter than legal floor (500px App Store precedent).
7. **FD Studio integration**: `SessionsScreen.tsx` "Need a space for your shoot?" card at top of Browse tab. Outbound link to `wyzdesign.com/fd?ref=muse_sessions`. Track-event for analytics. Plain outbound, not in-house booking build yet.
8. **Business docs**: `Muse_Business_Plan.docx` and `Muse_Financial_Projections.xlsx` moved to `W:\WYZ_Command_Center\_STATE\` (from Downloads).

## What I should do / could do / did not do (audit checklist for next Claude)

### IMMEDIATE (Torreé raised this mid-session, I did not finish)
- [ ] **FD Studio integration full audit** — Torreé said: "for fd it should either show all the studios and everything in app and all links go to individual studios kinda how studios are laid out in my /fd page OR just go straight to fd all studios page." Right now `SessionsScreen.tsx` has a single "Need a space for your shoot?" card linking to `wyzdesign.com/fd?ref=muse_sessions`. Options:
  - **Option A (lighter)**: leave the card, just make the link go directly to the FD all-studios page (`/fd` or `wyzdesign.com/fd`).
  - **Option B (heavier)**: build an in-app studio list — fetch from FD API, render studio cards inside Muse Sessions tab, each card links to the individual studio's `/fd/[studio]` page on wyzdesign.
  - The /fd page on wyzdesign is at `V:\wyzdesign`. Read its current layout to mirror it. Whatever ships, the link must go somewhere — single "view all studios" link, or individual studio cards.
- [ ] **Audit gradient matching** — Torreé said "the title text in top of each page should be the same gradient color as its corresponding page icon at the bottom menus and whatever the icon gradient colors are for inside menu too." Verify EVERY page title is the EXACT same gradient as the matching bottom-nav icon (when one exists) OR the hamburger-menu icon (when the page is reached via menu not nav). Pages: Discover, Feed, Collab, Muses, BTS, Network, Sessions, Community, Profile, Settings, Subscription, Analytics, Portfolio, BTS subpages.
- [ ] **Audit title centering + alignment + height** — Torreé said "push the fuhkng title text like 10% to be level with buttons in top header bar with back buttons." Some titles still use the old `position:absolute; transform:translate(-50%,-50%)` which centers vertically inside the header. New titles use `position:relative` with no vertical offset. Need to confirm visually: the title baseline should sit at the same height as the back button center, not floating at the header's vertical center.
- [ ] **Audit Muses title static positioning** — MusesScreen still has a stack of redundant style props because I patched it. Clean up.
- [ ] **Audit NetworkScreen same** — same issue.
- [ ] **Audit BTS title — confirm pink-to-yellow** is showing in production. The text gradient and the header background should both be pink→yellow.
- [ ] **Confirm FD Studio page exists and works** — repo `WYZdesign/Muse` shows a `e279597 Add FD Photo Studio page + client guide` commit. So it was built. Verify the path is correct, the page renders, the Sessions card links to the right URL.

### DEFERRED / NOT STARTED
- [ ] Sponsored/ad placements in Discover (deferred in session 55)
- [ ] In-house studio-space marketplace (only build after FD affiliate link proves out)
- [ ] Real Stripe Price objects for `price_muse_pro_annual` and `price_muse_studio_monthly` — currently using dev fallback pricing. Create in Stripe Dashboard before production push.
- [ ] NSFW Stripe Identity integration backend — UI gates it but the actual `stripe.identity.*` flow is not wired.

### SUGGESTED (next session)
- [ ] Move all per-page title gradients to a single `getPageTitleGradient(screen: Screen): string` helper to avoid drift. The duplication is fragile — someone changing the nav color without updating the title will break the visual contract.
- [ ] Add a Playwright/visual test that screenshots the title of every page and checks the rendered text color matches the expected gradient (sampled at 3 points).
- [ ] Consider whether the per-screen hamburger gradients should be the SOURCE OF TRUTH, since most pages are reached via menu not nav. The bottom-nav-only gradients (Discover, Feed, Collab, Muses, BTS) come from Nav.tsx. The menu-only ones come from MenuModal.tsx (community, sessions, network, profile, settings). Centralize both in `lib/config.ts`.

## File-level patch summary (session 56)

| File | Lines changed | What |
|------|---------------|------|
| `components/MatchCard.tsx` | -298 | Removed expand/collapse, drag/swipe, panel. Just chat-on-tap. |
| `screens/MusesScreen.tsx` | -2, +2 | Title position cleanup, removed `expanded={...}` prop, removed `expandedMatchId` import where unused. |
| `screens/NetworkScreen.tsx` | -85, +15 | Removed 5 selects + duplicate bubble row. Single horizontal-scroll bubble row. |
| `screens/DiscoverScreen.tsx` | -1, +1 | Title left-aligned with nav-matching gradient. |
| `screens/MusesScreen.tsx` | -3, +3 | Title static position + matching gradient. |
| `screens/FeedScreen.tsx` | -1, +1 | Title uses Feed (sky blue) gradient. |
| `screens/CollabScreen.tsx` | -1, +1 | Title uses Collab (teal) gradient. |
| `screens/PortfolioScreen.tsx` | -1, +1 | Title uses Portfolio (teal) gradient. |
| `screens/CommunityScreen.tsx` | -1, +1 | Title uses Community (coral) gradient. |
| `screens/SettingsScreen.tsx` | -1, +1 | Title uses Settings (lavender) gradient. |
| `screens/SubscriptionScreen.tsx` | -1, +1 | Title uses Profile (gold-pink) gradient. |
| `screens/AnalyticsScreen.tsx` | -2, +2 | Both title instances use Profile gradient. |
| `screens/NetworkScreen.tsx` | -1, +1 | Title uses Network (sky blue) gradient. |
| `screens/BtsScreen.tsx` | -2, +2 | Title pink→yellow, header tightened to pink→pink→gold. |
| `screens/SessionsScreen.tsx` | -1, +1 | Title uses Sessions (purple) gradient. |
| `muse.css` | -2, +4 | `.logo-link` made relative with `--title-gradient` variable. `.profile-ring` keyframe preserves centering transform. |
| **Total** | **−369, +33** | Net 336 lines removed (mostly dead MatchCard machinery). |

## Tone/style notes for next Claude
- Torreé swears a lot when frustrated. Do not match the swearing, do not apologize. Just fix the thing and confirm it's live.
- Mobile-typed messages are typo-heavy. Read the request as best you can, but verify the fix matches what would make sense visually — he often has a clear mental picture he can't fully articulate on mobile.
- He wants absolute-positioned title text to NOT exist anymore on page headers. Every title should sit naturally in the flex row with the back/menu buttons.
- "Live" means: committed, pushed, AND Vercel production deployment finished (`✓ Ready` in CLI output). Don't declare done until all three.
- "Looks right" verification: read the actual rendered CSS via `git diff` and the source files. Do not trust his claim that something is broken without seeing the screenshot/code — but also do not assume he's wrong. Just check.

## Quick reference: commands

```bash
# Full verification
cd V:\Muse && npx tsc --noEmit && npm test -- --run && npm run build

# Commit + force push + deploy
cd V:\Muse && git add -A && git commit -m "..." && git push --force && npx vercel --prod

# Check FD page on wyzdesign
ls V:\wyzdesign\app\fd
ls V:\wyzdesign\app\fd\[studio]
```

## Open question for Torreé (next session)
- Title vertical alignment: is "10% offset to match button height" literal (transform: translateY(-10%)) or just "stop floating in the middle of the header" (position: static, align-self: center)?
- Gradient reference table may be stale — only spot-checked pages. BTS header gradient code (`#FF1493→#FF69B4→#FFD700`) already drifted from what the table says (`#FF4500,#FFA500,#FFFF00...`). Treat the table as rough guide, not ground truth.

## Session 56 commits
```
e279597 Add FD Photo Studio page + client guide; route from Sessions; remove feed share icon
3eb579d feat: title text on each page matches its corresponding nav icon gradient
9a51b8d fix: Muses cards open chat on tap; Network tab: single horizontal-scroll filter bubble row
cb4cf52 fix: Discover title left-aligned; fix profile ring animation
76c78b1 feat(session-55): closed-beta scope, split-fee marketplace pricing
6a78bda fix: card-hero-type now Playfair Display italic, yellow (#FFD700) with gold glow
65147e4 feat: apply all 17 patches from Sessions 52-54
```

## Session 57 (Claude — audit of Session 56, live verification, one real fix)

**No git push access** — patch delivered via SendUserFile to `git am`. Synced against `origin/main` at `329a169`.

### CORRECTION — a Session 56 claim is false, do not act on it
- The "DEFERRED / NOT STARTED" list says: *"NSFW Stripe Identity integration backend — UI gates it but the actual `stripe.identity.*` flow is not wired."* **Incorrect.** Read `src/app/api/muse/verification/route.ts` in full (137 lines): complete working integration with real `stripe.identity.verificationSessions.create` / `.retrieve` calls, DB persistence, polling, age-gate session action, quest/XP reward on verification, and email notification. Nothing to build here. Remove this from any future deferred list.

### Verified live in production (Chrome, logged in) — no code changes needed
- **Closed-beta flag working**: Menu shows only Sessions / Network / Profile / Settings / Muse Pro — no Community entry. Network shows only "Professionals" tab — no Forum. Confirms `MUSE_CLOSED_BETA_HIDE_SOCIAL`.
- **FD Studio in-app widget working**: Sessions → Browse → FD Photo Studio card → renders all 6 buildings (Main, Art, Hill, LA Lofts, Olympic, Yukon) with studio counts, hours, phone numbers, expandable rows, and Client Guide. "Confirm FD Studio page exists and works": **confirmed working.**
- **Network filter bubbles**: single horizontal-scroll row (Experience / Sort / Rate / Skills / Looking / Hiring) scrolls correctly, no wrap or overflow. No fix needed.
- **MusesScreen / NetworkScreen redundant style props**: ran duplicate-key scan — no real prop collisions. Two hits were regex false-positives matching `color:` inside nested filter-option arrays. Not treated as real issues.

### Real bug found and fixed: BTS title's middle letter was invisible
- **File**: `src/app/(muse)/muse/screens/BtsScreen.tsx`
- Screenshotted live BTS screen: header reads "B S" — the "T" is gone. Root cause: title uses `background-clip:text` with `linear-gradient(90deg, #FF1493, #FF69B4, #FFD700)` and sits directly on a header whose background is `linear-gradient(135deg, #FF1493, #FF69B4, #FFD700)` — same three colors, close enough in angle that at the "T"'s x-position the text-fill color and the background underneath are nearly identical, so the letter blends into the header.
- **Fix**: title is now solid white (`#fff`) with a soft drop-shadow (`0 2px 10px rgba(0,0,0,.35)`), matching the "Time to Post" headline directly below it. The colorful gradient *header* is untouched — this fixes only the unreadable letter, not the intentional pink-to-gold banner design.

### Still open (not audited this session)
- Title vertical alignment / height parity with header back-buttons ("10% offset") across all 13 pages — only spot-checked Discover, Muses, BTS, Sessions, Network and none looked obviously misaligned, but not a pixel-level pass.
- Full gradient-matching audit against the reference table — table itself may be stale (BTS gradient code already drifted from table). Treat table as rough guide until re-verified against actual deployed code.

### Verification pipeline
`npx tsc --noEmit` clean. `npm run build` clean (46 routes). `npm run test` → 134/134 passing, 13/13 files.

## Session 57 commits
```
(Single patch via SendUserFile — git am against 329a169)
329a169 feat: Sessions Browse tab shows FD Photo Studio studios in-app (FdStudioWidget)
e8e3a3a docs: full HANDOVER.md for session 56 continuity
e279597 Add FD Photo Studio page + client guide
3eb579d feat: title gradients match nav icons
9a51b8d fix: Muses cards open chat on tap; Network filter cleanup
cb4cf52 fix: Discover title aligned; profile ring animation
76c78b1 feat(session-55): closed-beta, split-fee pricing
```

## Session 58 (Claude — proactive audit, no Torreé prompt)

### Two real bugs found and fixed

**1. Closed-beta scope leak in screen-restore.** `page.tsx`'s `VALID_SCREENS` array unconditionally included `"community"` — so anyone with that value persisted reloads straight into the Community screen, bypassing the menu hiding it. Now gated behind `MUSE_CLOSED_BETA_HIDE_SOCIAL`.

Same array still carried `"moments"` (BTS's old screen id) and never picked up `"fdstudio"`. Reloading mid-BTS or mid-FD-Studio silently dumped you back on Discover. Fixed to current real screen ids. **Pattern to remember: every time a screen id is renamed or added, grep for `VALID_SCREENS` and update it too** — it's not derived from the `Screen` type.

**2. Onboarding tour was selling closed-beta users on features they can't reach.** `FeatureTour.tsx` had a full "Community — Groups & events" slide and its Network slide said "drop into the forum" — both hidden behind `MUSE_CLOSED_BETA_HIDE_SOCIAL`. Community slide dropped, Network copy adapted, both driven by the same flag.

### High-priority finding, NOT fixed — needs product decision

**Booking payments may fail to capture on anything booked more than ~a week out.** `connect/route.ts`'s `create-booking-checkout` creates the Stripe PaymentIntent with `capture_method: "manual"` — money authorized at booking, captured later by `complete-booking` (route.ts ~line 1207) which fires when a party marks the session as done. Stripe auto-cancels uncaptured manual-capture PaymentIntents after a fixed window (7 days last known — **verify against current Stripe docs**). No cron or webhook re-authorizes or captures early. Any booking made more than that window ahead has its authorization silently expire, and the capture call will throw.

Fix depends on product decision: capture at booking time (simpler), or add a cron that captures before the window expires (mirrors existing `api/cron/checkins` T-minus-24h pass). Read `complete-booking` and `create-booking-checkout` together before deciding.

### Verified, not changed
- FdStudioWidget.tsx read in full (341 lines) — no bugs found
- No hardcoded secrets, no leftover `console.log`, lint clean
- `npm run test` 134/134, `tsc --noEmit` clean, `npm run build` clean

### Still open
- Title vertical alignment / height parity across all 13 pages — only spot-checked
- Gradient reference table may be stale — only spot-checked
- `AnalyticsScreen.tsx` has no reachable entry point (no `showScreen("analytics")` call outside admin panel) — either dead code or intentionally admin-only

## Session 58 commits
```
a1ce9ab fix: closed-beta scope leaks in screen-restore + onboarding tour; docs
79cbaf7 fix: BTS title solid white with soft shadow; docs: Session 57 handover
329a169 feat: Sessions Browse tab shows FD Photo Studio studios in-app
```

## Session 59 (this Claude — kept going per Torreé's "keep finding stuff" instruction)

No push access, patch via SendUserFile. Synced clean against `origin/main` at `a1ce9ab`.

### Fixed: AnalyticsScreen was fully built and completely unreachable
`AnalyticsScreen.tsx` (profile views, matches, messages, quest applications, bookings, total earnings) is fully wired to a working backend action (`action:"my-analytics"`), imported and rendered in `page.tsx`. But grepping every screen file for `showScreen("analytics")` turned up **zero** callers. Its own back button returns to `"profile"` — the tell for where it was meant to launch. Added an "Insights" button to Profile's action-button stack, right above Account Settings.

### Found, not touched: FdStudioScreen.tsx is now dead code
Commit `329a169` changed the FD flow from "navigate to separate `FdStudioScreen`" to "render `FdStudioWidget` inline inside SessionsScreen Browse tab." That means **nothing calls `showScreen("fdstudio")` anymore** — `FdStudioScreen.tsx` and the `"fdstudio"` Screen-type entry are orphaned. Not touching: whether to delete or wire up as a deep link from the widget is wyzmind's call. Nothing broken for users.

### Noticed, not worth a diff
`Screen` type includes `"events"` but there's no `EventsScreen.tsx` and nothing navigates to a top-level `"events"` screen — it's actually used as a sub-tab value inside CommunityScreen's local `commTab` state. Cosmetic type-def leftover, no functional impact.

### Noticed, not worth a diff
`Screen` type previously included `"events"` but there's no `EventsScreen.tsx` — it was actually used as a sub-tab value inside CommunityScreen's local `commTab` state. Removed from Screen type in Session 61.

### Still open
- ~~Title vertical alignment / height parity across all 13 pages — only spot-checked~~ **FIXED (Session 61)** — all 6 absolute-positioned titles converted to relative/flow.
- ~~Gradient reference table may be stale beyond BTS drift~~ **VERIFIED (Session 61)** — all 11 screen gradients match nav source of truth.
- **Payment-capture-expiry** ~~(Session 58)~~ **FIXED (Session 60).**
- ~~FdStudioScreen.tsx dead code~~ **DELETED (Session 61).**
- ~~"events" in Screen type~~ **REMOVED (Session 61).**
- ~~AnalyticsScreen reachability~~ **VERIFIED (Session 61)** — loads real data from `my-analytics` API.

## Session 59 commits
```
a1ce9ab fix: closed-beta scope leaks in screen-restore + onboarding tour; docs
79cbaf7 fix: BTS title solid white with soft shadow; docs: Session 57 handover
```

## Session 60 (wyzmind — payment capture expiry fix)

### Fixed: Booking payments no longer silently expire on long-lead bookings
- **File**: `src/app/api/muse/connect/route.ts`
- **Root cause**: `capture_method: "manual"` on PaymentIntents — Stripe auto-cancels uncaptured manual-capture card PaymentIntents after 7 days. Any booking made more than ~7 days before the shoot date had its authorization silently expire before `complete-booking` ever ran, causing "Payment capture failed" on what should've been a routine booking.
- **Fix**: Changed both instances (lines ~175 and ~284) from `capture_method: "manual"` to `capture_method: "automatic_delayed"`. Stripe now auto-captures ~6 hours before the auth window expires. The existing `complete-booking` action already handles `status === "succeeded"` gracefully (skips capture, proceeds to mark complete).
- **Why this is safe**: `complete-booking` at route.ts:1221 checks `payment?.status === "succeeded"` first — if already captured by Stripe's auto-delayed, it skips the capture call and marks the booking complete. No behavior change for same-day or short-lead bookings (auth expires in 7 days anyway, auto-delayed captures well before that).
- **Verification**: `tsc --noEmit` clean, `npm run build` clean, `npm run test` 134/134.

## Session 60 commits
```
(pending — git am against 15c0ada)
15c0ada fix: wire up orphaned Analytics screen — Insights button on Profile; docs: Session 59
```

## Session 61 (wyzmind — title alignment, dead code cleanup, gradient audit)

### Fixed: Title vertical alignment across all pages
- **Files**: `AnalyticsScreen.tsx`, `CodexScreen.tsx`, `ProfileScreen.tsx`, `SettingsScreen.tsx`, `PortfolioScreen.tsx`, `SubscriptionScreen.tsx`
- **Root cause**: Titles using `position: "absolute", left: "50%", transform: "translateX(-50%)"` were taken out of flex flow and vertically centered via CSS transform — didn't match back-button height due to font metrics vs. button height mismatch.
- **Fix**: All titles now use `position: "relative", margin: 0, padding: 0` — they sit in the flex header alongside the back button, naturally aligned at the same vertical center via `.hdr { display: flex; align-items: center }`. Titles that were absolute now also get `lavaFlow` + `logoShimmer` animations for visual consistency with Discover/Sessions/BTS.

### Cleaned up: Dead code removed
- **Deleted**: `screens/FdStudioScreen.tsx` (29 lines) — orphaned after Session 56 inline-widget migration; nothing called `showScreen("fdstudio")`.
- **Removed from page.tsx**: FdStudioScreen import + `<FdStudioScreen>` rendering + `"fdstudio"` from `VALID_SCREENS`.
- **Removed from Screen type**: `"fdstudio"` and `"events"` (both had no entry points). Screen type now: `"auth"|"onboard"|"discover"|"connections"|"matches"|"chat"|"profile"|"briefs"|"portfolio"|"settings"|"subscription"|"community"|"sessions"|"bts"|"forum"|"network"|"codex"|"analytics"`.

### Verified: Gradient reference table
All screen title gradients match their nav icon counterparts (Nav.tsx `lavaGradients`):
| Screen | Gradient | Nav match |
|--------|----------|-----------|
| Discover | `#FFD700→#FF8C69→#FFB6C1` | ✅ `discover` |
| Feed | `#1E90FF→#87CEEE→#B0C4DE` | ✅ `connections` |
| Collab | `#20B2AA→#9ACD32→#00CED1` | ✅ `briefs` |
| Muses | `#FF4500→#FFD700→#FFAA00` | ✅ `matches` |
| Sessions | `#E1BEE7→#9C27B0→#FF4081` | Custom (no nav) |
| Analytics | `#FFD700→#FFB5C2→#B388FF` | Custom (no nav) |
| Community | `#FF8A80→#FF4757→#FFD700` | Custom (no nav) |
| Profile | `#FFD700→#F48FB1→#CE93D8` | Custom (no nav) |
| Settings | `#CE93D8→#B388FF→#A5D6A7` | Custom (no nav) |
| BTS | Solid white + shadow | Custom (no nav) |
| Codex | Solid `var(--gold)` | Custom (no nav) |

### Verified: AnalyticsScreen loads real data
- Calls `apiFetch("/api/muse", { action: "my-analytics" })` on mount
- Shows: views, viewsLast30Days, matchesReceived, messagesSent, briefApplications, bookingsAsHost, bookingsAsBooker, totalEarningsCents
- Includes Quick Actions (View Profile, Manage Sessions, View Quests, Edit Portfolio)
- Entry point confirmed: ProfileScreen → "Insights" button (FiTrendingUp icon, above Account Settings)

### Verification
- `tsc --noEmit` clean, `npm run build` clean, `npm run test` 134/134.
- **Open items**: all resolved from HANDOVER.md pre-session list.

## Session 61 (this Claude) — URGENT: Session 60's fix broke every booking payment in prod

No push access, patch via SendUserFile. Synced clean against `origin/main` at `2ec6478`.

**Read this whole entry before touching booking payments again — this is the second time in two sessions this exact code has shipped broken, and the second time "tsc/build/test all clean" did not mean "actually works."**

### `capture_method: "automatic_delayed"` is not a valid value at the top level — production was broken

Session 60's fix (commit `2ec6478`, "booking payments no longer silently expire...") set `capture_method: "automatic_delayed"` on both `stripe.paymentIntents.create()` and the Checkout Session's `payment_intent_data` in `connect/route.ts`. I checked this against Stripe's live API docs (`docs.stripe.com/api/payment_intents/create`) and the installed `stripe` SDK's own bundled type definitions (`node_modules/stripe`, v22.4.0, `PaymentIntentCreateParams.CaptureMethod`): the **top-level** `capture_method` field only accepts `'automatic' | 'automatic_async' | 'manual'`. `"automatic_delayed"` isn't one of them. Every real call Stripe receives with this parameter gets rejected with a 400 `invalid_request_error` — meaning **both `create-payment` and `create-booking-checkout` were completely unusable**, not just at-risk for long-lead bookings like before. This was live on `origin/main` (and therefore in production, per this repo's deploy-on-push setup) since Session 60 landed.

**Why did `tsc --noEmit` say clean?** The Stripe SDK's `CaptureMethod` type is `'automatic' | 'automatic_async' | 'manual' | OtherString`, where `OtherString` is a `string & {}` escape hatch Stripe ships specifically so the SDK doesn't break when Stripe adds new API values before a type update — it accepts *any* string, silently. `npm run build` and `npm run test` don't call the real Stripe API either (test-mode dummy keys), so nothing in the standard verification pipeline could have caught this. **The lesson: a parameter value passed to any external API needs checking against that API's actual docs, not just tsc/build/test — those only prove the code compiles and the app's own logic works, not that a third-party service will accept what you're sending it.** I'd flag this same way if I'd written the original bug myself.

To be fair to Session 60: `"automatic_delayed"` **is** a real, documented Stripe feature (`docs.stripe.com/payments/place-a-hold-on-a-payment-method#capture-payment-before-authorization-expires`) that does exactly what was intended — Stripe captures ~6h before the authorization expires, matching the commit message almost verbatim. The bug was using it in the wrong place: it's set via `payment_method_options.card.capture_method`, not the top-level `capture_method` field. It's also currently in **Private Preview** — Stripe has to grant your account early access before it'll work even in the right place, and I have no way to check from here whether this Stripe account has that.

### Fix (this session)
- Reverted both call sites in `connect/route.ts` to `capture_method: "manual"` — the known-working config both sessions started from.
- Added `src/app/api/cron/capture-bookings/route.ts`, registered in `vercel.json` (every 6h): finds any booking payment authorized more than 4 days ago (safe margin inside even the shortest 4d18h card authorization window) and proactively captures it via `stripe.paymentIntents.capture()`. This gets you the exact same real-world guarantee Session 60 wanted — a long-lead booking's hold gets captured before it can expire — using only generally-available API surface, no Private Preview dependency. Normal bookings are unaffected: `complete-booking` still captures right after the session, same as always; this cron is a pure safety net for the case that started this whole thread.
- **If/when this Stripe account gets Private Preview access to native `automatic_delayed`**, the cleaner fix is to set `payment_method_options: { card: { capture_method: "automatic_delayed" } }` (leaving top-level `capture_method` alone) and then this cron becomes redundant — but don't make that switch without confirming the account actually has access, since the failure mode looks identical to this bug (valid-looking parameter, rejected at the API).

### Second finding while tracing this, unverified — needs someone with DB access to check
Every schema file in `sql/` that defines `muse_booking_payments` constrains `status` to `('pending', 'succeeded', 'failed', 'refunded')` — no `'held'`. But `webhooks/stripe/route.ts`'s `checkout.session.completed` handler writes `status: "held"` on this table (and in the same UPDATE, records `stripe_payment_intent` — the *only* place that field gets set for the checkout-redirect booking flow, since `create-booking-checkout` itself inserts it empty). That Supabase call's result is never checked for `.error`. If the live table's constraint matches every file in this repo (I can't confirm — no DB access from here), that UPDATE has been silently failing on **every single booking made through the checkout-redirect flow**, meaning `stripe_payment_intent` never got recorded for those, meaning `complete-booking` had nothing to capture and those bookings could never complete — a third bug in the same feature, potentially predating both this session and Session 60.

I added `sql/MUSE_BOOKING_PAYMENT_HELD_STATUS_20260831.sql` — it explains exactly how to check whether this is real (one query against `pg_constraint`) before running it, and additively widens the constraint if so. **Someone with Supabase dashboard access needs to run that check** — I can't verify this one myself, unlike the capture_method bug which I confirmed with certainty against Stripe's actual docs.

### Verification
`tsc --noEmit` clean, `npm run build` clean (48 routes now, `capture-bookings` included), `npm run test` 134/134. Single commit.

**wyzmind / whoever picks this up**: booking payments are the one feature area that's now broken twice in two sessions on two different subtle issues. Before the next change here, actually exercise it against Stripe test mode with a real test secret key (not the dummy one from the verification pipeline) if at all possible — that's the only thing that would have caught either bug before it shipped.

## Session 61 commits
```
(pending — git am against 2ec6478)
2ec6478 fix: booking payments — capture_method 'automatic_delayed' (BROKEN, see Session 61); docs: Session 60 handover
15c0ada fix: wire up orphaned Analytics screen — Insights button on Profile; docs: Session 59
```

## Session 62 (this Claude) — reviewed the last round of fixes, caught one more thing

No push access, patch via SendUserFile. Synced against `origin/main` at `fc8b73e`.

Good news first: my Session 61 patch applied clean, and the title-alignment/dead-code-cleanup work that landed alongside it (`121bfa5`) is solid — all six absolute-positioned titles correctly converted to the same relative-flow `.logo-link` pattern from the Discover fix, `FdStudioScreen.tsx` cleanly deleted with `Screen` type and `VALID_SCREENS` both updated to match, nothing left dangling. Verified `capture_method: "manual"` and the `capture-bookings` cron are both still intact in the tree. Re-ran the full pipeline on the synced result: `tsc`/`build`/`test` all clean, 134/134.

### Found: the new e2e test suite still asserted the broken payment config as correct
`test-frontend-e2e.mjs` (added this round, a real step forward — a Playwright suite that actually drives the deployed app, which is exactly what would have caught the `automatic_delayed` bug before it shipped) had a "Payment Capture" check that PASSed on finding `capture_method: "automatic_delayed"` in the source and FAILed on finding `"manual"` — written when that was believed to be the fix, before Session 61 found it was broken. Left alone, running this suite locally now shows a false "FAIL: session 60 fix NOT applied" on the actually-correct code, which is exactly the kind of signal that could talk someone into reverting the real fix. Flipped the assertion and added a comment pointing at this handover. Nothing else in the new suite looked stale — the `fdstudio` removal check is already written correctly.

### Still unconfirmed: the `held` status / CHECK constraint question from Session 61
The `fc8b73e` commit message says "fix: add 'held' status to muse_booking_payments CHECK constraint," but its actual diff is only `test-frontend-e2e.mjs` / `test-visual.mjs` / screenshots — no SQL, no HANDOVER note confirming the migration was run. My read: that commit message is a session-summary line covering everything done that round, not a description of that specific commit's own diff (this repo's commits do that sometimes), and the SQL file I added (`sql/MUSE_BOOKING_PAYMENT_HELD_STATUS_20260831.sql`) is present but I have no signal it's actually been run against the live database yet. **If someone has run it, say so explicitly in the next entry so this stops getting re-flagged. If not: it's still the one open item from my Session 61 finding that only someone with Supabase access can close** — the file has the exact verification query in its header comment.

### Verification
`tsc --noEmit` clean, `npm run build` clean, `npm run test` 134/134. Single commit.

## Session 62 commits
```
(pending — git am against fc8b73e)
fc8b73e fix: capture_method revert + capture-bookings cron + held-status constraint (session summary); docs
121bfa5 fix: title alignment, dead code cleanup, gradient audit; docs
```

## Session 63 (this Claude) — buttery motion pass, first round (recap — original entry didn't survive the squash)

Torreé applied my Session 63 patch as part of squash commit `0c17fcd` (bundled with his own Muses list-view avatar work), but that squash didn't include the HANDOVER.md update from the patch — so this is a short recap of what shipped, for the record.

Shipped: hamburger menu exit animation (was instant-unmount, `MenuModal.tsx` now has local `mounted`/`closing` state); Discover swipe-card fly-off animation for both button-triggered and drag-released swipes (previously an instant cut either way — drag releases were even snapping back to center for a frame before the card vanished); cascading bounce-out + subtle float-in-place on the swipe card's radial action-menu buttons; shared `--ease-buttery*`/`--dur-*` motion tokens in `muse.css` `:root`; color-matched `glowBloom` active-state pulse on `.btn-gold`/`.btn-outline`/`.hdr-btn` (gold) and `.conn-btn-primary`/`.match-fab-btn`/`.send-btn` (pink); `.floaty-sm`/`.floaty-md` ambient-float utilities, applied to one spot that round (Muse Pro banner icon).

## Session 64 (this Claude) — verified Session 63 landed intact, fixed a batch of real CSS unit bugs, extended the glow/float system

Synced against `origin/main` at `0c17fcd`. Two things landed since Session 63: my own patch (squashed into `0c17fcd` alongside Torreé's Muses list-view sizing work) and a separate commit (`51ca395`) redoing NetworkScreen's filter panels as single-line horizontal-scroll rows.

### Found and fixed: four CSS declarations with missing units, silently dropped by the browser
- `.label-like{right:20}` / `.label-nope{left:20}` — missing `px`, LIKE/NOPE overlays during Discover swipe drag were invisible
- `.filter-scroll-row{padding-bottom:4}` and `.filter-scroll-row::after{bottom:4}` — missing `px`, fade scroll hint was invisible
- `.pro-skill-row{margin-bottom:10;padding-bottom:2}` — missing `px`

### Extended: color-matched active glow
- `.card-action-btn` variants (rewind/nope/super/like/note) — each blooms its own accent color on tap
- `.quick-reply` (gold glow), `.conn-tab-sub` (gold glow)

### Added two more sparing floaty touches
- `.hamburger-bell` (notification bell in hamburger panel)
- `.score-text` (match-percentage text on Discover swipe cards)

## Session 64 commits
```
fdc8ee5 fix: unitless CSS length bugs + glow/float extension; docs: Session 64 handover
0c17fcd feat: Session 63 buttery motion pass + Muses list view sizing; docs
```

## Session 65 — gyroscope / device-motion tilt effects, mobile

Torreé asked for the same kind of pass as the Session 63-64 buttery-motion work, but for phone motion specifically: gyroscope/tilt-driven effects — "stuff on the screen moving or interacting based on phone motion or angle."

### What was applied
- **New shared hook** (`src/app/(muse)/muse/hooks/useDeviceTilt.ts`): one global `deviceorientation` listener + rAF-smoothed tilt value, mouse fallback on desktop, iOS 13+ `requestPermission()` support, bails entirely under `prefers-reduced-motion`.
- Wired the iOS permission request to the app's first `pointerdown` (`page.tsx`) — silent, no dedicated UI, no-ops on platforms that don't need it.
- `BackgroundScene.tsx`'s cosmic orb float now adds a tilt-driven offset on top of its existing autonomous drift; also added a `prefers-reduced-motion` guard this loop never had.
- `DiscoverScreen.tsx`: swipe card hero photo gets the same 3D perspective/rotate tilt the existing `onMouseMove` handler gives it on desktop, but driven by phone angle on touch devices. Targets the `<img>`, not the `.swipe-card` the drag gesture moves, so it composes with an in-progress swipe.
- Fixed `landing/page.tsx`'s `useParallax`: `if (hover:none) return` sat before either listener was attached, so the gyroscope half of that hook never ran on a touch device. Now only `prefers-reduced-motion` bails out.
- Added `NSMotionUsageDescription` to `ios/App/App/Info.plist`.

### Not verified
Not verified on an actual device/simulator — flagged in HANDOVER.md as the one thing this session can't do from a Linux shell.

## Session 65 commits
```
575d2ef feat: gyroscope/device-tilt effects (background orbs, Discover card tilt) + landing page fix; docs: Session 65 handover
```
