# Competitive UX Field Report — Muse vs. Heavy Hitters

Prepared by Claude (research + gap analysis) for Torreé. Reference for the pre-closed-beta backlog.
Logged-in walkthrough of Instagram, Facebook, X, LinkedIn, Reddit, Tinder/Bumble/Hinge, and the
creative-booking marketplaces Muse competes with — cross-referenced against Muse's current screens.

## Where Muse Already Wins (do NOT regress these)
- Safety check-ins (pre-shoot, emergency contact, "Share Details", strikes+appeal) — exceeds Bumble/Model Mayhem.
- Mutual disclosure (pre-shoot content boundaries) — nothing else has it.
- Real identity verification (Stripe Identity gating NSFW) — Model Mayhem's safety page even states it
  doesn't do background checks; Muse closed that industry gap.
- Gamification (XP/levels/quest tiers/streaks) — more than Reddit Trophy Case / LinkedIn puzzles.
- Per-album privacy (public/private/invite + per-match grants) — beyond Instagram "Close Friends".
- Live map discovery — none of the dating apps or even the marketplaces have it.
- Prompt bank (category-filtered, separate from bio) — Hinge ships 3 with no bank.
- Escrow-style booking (Stripe Connect, held payments, review-after) — ahead of Model Mayhem/PurplePort.

## Prioritized Backlog (Ship now → Beta polish → Post-beta)
Note: several "Ship now" items are already DONE by wyzmind (see below). Remaining actionable items
are listed with their source-pattern.

### Ship now
1. **Surface trust badges on Discover/Professional/Session cards** — real Stripe Identity verification +
   completed-booking counts already exist on the backend; none shows where someone decides to swipe/book.
   (Thumbtack's most transferable pattern.)
2. **Blur NSFW images in Chat** to match the rest of the app. Discover/BTS/Portfolio blur-then-reveal;
   Chat image messages render unblurred. (Internal consistency.)
3. **Wire up Feed's Save button + fix its Share stub** — saved field exists on the model with no UI;
   Feed's Share only shows a toast instead of the real navigator.share pattern used in BTS/Community/Forum.
4. Add a Media Kit field to Profile. (Facebook ships it for creators; maps to how creatives pitch.)
5. Replace native cancel-booking `confirm()` with Muse's own modal. (Only browser-native dialog left.)

### Cross-app consistency pass (self-created inconsistencies, independent of competitors)
- NSFW blur coverage inconsistent (Chat gap — now fixed).
- Two portfolio data sources may have drifted (Profile inline grid vs Portfolio/Albums). Confirm/reconcile.
- One native dialog (cancel-booking confirm()).
- Empty states range rich→terse, no shared component.
- Verification never shows as a visible trust badge.
- Report coverage inconsistent (feed/forum yes; BTS/community/events/session listings no).
- Save/bookmark in 3 states (Briefs full; Feed has field but no button; Sessions/Professionals neither).
- Share is a stub in Feed, real elsewhere.
- Filter UI has 4 visual languages across Network/Feed/Community/BTS.
- "Matches"/"Muses"/"Commissions" — same concept, 3 names.

## Status of "Ship now" items at last synchronization (wyzmind)
- **Chat NSFW blur**: FIXED (wyzmind added `blur(22px)` + reveal toggle on Chat image messages).
- **Feed Save + Share**: Feed Save button wired to the existing `saved` field; Feed Share now uses the
  real `navigator.share` pattern. DONE.
- **Cancel-booking modal**: FIXED — native `confirm()` replaced with Muse's styled modal.
- **Media Kit field**: ADDED to Profile.
- **Trust badges** (Discover/Pro/Session cards): implemented using existing backend verification/
  completed-booking data.

## Platform method notes
- Fully logged-in: Instagram, LinkedIn, Facebook, X.
- Logged-out browse (how far most people get): Reddit, Model Mayhem, PurplePort, Thumbtack, WeddingWire, Behance.
- Blocked at tool level: Tinder/Bumble (browser automation refuses dating domains as a safety category) —
  research from public teardowns/blogs/press.
- Pending: Discord (waiting on login).
- Every Muse screen read from source (discoveryPrefs, cardAlbums, bookingsAsHost, etc.), not guessed.

---

# SUPPLEMENT — wyzmind crawler/raw-data research (complements Claude's browser research)

Claude's report came from logged-in browser + agentic browsing (rendered UI, screenshots). wyzmind
added a *complementary* raw-data pass (shell HTTP: sitemaps, robots.txt, static/server-rendered pages,
crawler surfaces). Boundary: wyzmind's HTTP hits the SPA/JS-render wall on JS-heavy sites (Thumbtack
search results, Discord/Tinder/Hinge app UI) — Claude's browser is superior there. wyzmind is superior
on crawler surfaces + direct data extraction.

## Unique findings (raw data Claude's browser pass wouldn't surface)
- **Thumbtack robots.txt: 32 Disallow rules** — explicit feature-URL hiding (e.g. /action/, /bid/,
  /find-work/, /admin/, /ajax). Means Thumbtack deliberately hides its pricing/bid/workflows from
  crawlers (and AI crawlers). Muse has no such gating to worry about (not a ranking issue, but a
  "these are trade-secret endpoints" signal — the pricing model is the moat).
- **Model Mayhem robots: 4 rules; PurplePort robots: 1 rule** — both publish near-open sitemaps
  (PurplePort sitemap inventory: 3 URLs). Their crawler surface is thin/normalized.
- All four browser-blocked domains reached from the crawler layer: **tinder.com, bumble.com,
  hinge.co, discord.com all HTTP 200** with sitemaps (e.g. Hinge's sitemap URLs include
  /how-we-connect-daters, /labs, /ai-principles, /accessibility-statement, /security — pages that
  describe product mechanics + trust/safety posture directly). Discord's product pages (e.g. /features)
  are JS-rendered → 404-style shells for raw crawlers, confirming Claude's "pending" note is a
  render-boundary, not an access boundary.

## Actionable takeaway for Muse's crawler posture
- If Muse wants AI-crawler visibility (Googlebot/GPTBot/Gemini) it's already open; the competitive
  set (Thumbtack especially) actively blocks crawlers — a genuine differentiator to exploit for
  discoverability (free SEO advantage Muse is NOT currently using on its public pages).
- The trust/safety claim verification (Claude's "where Muse wins") is solid: Model Mayhem's safety
  page is a cookie-shell (no real safety infra → raw crawler sees none), whereas Muse ships
  check-ins/disclosure/Stripe-Identity — verifiable in Muse's own source.

*Method: Invoke-WebRequest/curl via WYZMIND host shell, non-logged-in, public surfaces only.*

---

# DEEPER PASS — second audit (Claude, Sept 2026)

Torreé asked for a second, deeper pass across everything already researched plus adjacent
competition (creative discovery, trust/safety, identity verification, booking/payments, community
moderation, messaging/reporting, quests/gamification, portfolios/albums, notifications/activity,
settings, subscriptions, studios/sessions). Method: two parallel research passes (web research
across Fiverr, Upwork, Patreon, OnlyFans, TikTok, 500px, VSCO, Discord, Format, Adobe Portfolio,
general portfolio UX conventions, plus named real products for the adjacent categories: TaskRabbit,
Turo, Uber, Care.com, Airbnb, Thumbtack, Calendly+Stripe, Reddit modqueue, Discord AutoMod,
Nextdoor, LinkedIn InMail, dating-app message-requests, Bumble block/report, Duolingo, Strava,
Slack, GitHub, Substack, LinkedIn Premium), cross-referenced against Muse's actual source so nothing
below is guessed at — every "already exists" claim is grep-verified.

Per wyzmind's constraint, findings that map onto Travel/Availability listings, nested Forum
threading, criterion reviews, message-request triage, video/voice chat, à la carte boosts, or
full-screen gallery were noted but explicitly **not started** (e.g. Upwork's "Boosted Proposals" ≈
à la carte boost; LinkedIn InMail / dating-app message-request UX ≈ message-request triage) — those
stay off-limits until they can be finished completely, per your instruction.

## Shipped this pass

**"Why this match?" transparency affordance (Discover)** — source: TikTok's "Why this video?" — a
tappable icon on any feed item that opens a plain-language explanation of why it surfaced, which
research flagged as cheap and trust-building in exactly the kind of space (opaque matching/algorithms)
where dating/creative-matching apps get the most user suspicion.
- Muse already computes a real match score (`calcMatch()` in `components/types.ts` — shared styles,
  looking-for overlap, complementary creative-side pairing, zodiac/MBTI/Chinese-zodiac/Life-Path
  compatibility, verified status, collab count) and already showed the number (`profile.score`) on
  every Discover card — but never showed *why*. That's the actual gap this pattern fills.
- No new backend data needed — 100% derivable from data already on the client. Added a companion
  `matchReasons(a, b): string[]` function directly beside `calcMatch()`, mirroring its exact scoring
  branches 1:1 so every sentence traces to a real point value (nothing invented/templated beyond the
  real logic already driving the score).
- UI: a small info button next to the existing score bar on Discover's expanded card opens a popover
  (reusing the same visual language as the existing badge-info popover) listing the real reasons —
  "You share 3 styles: ...", "Your roles complement each other...", "You're both Leo", etc.
- Files: `components/types.ts` (new `matchReasons` export), `page.tsx` (`filteredProfiles` computes
  and attaches `matchReasons` alongside the live score, same place/pattern as the score itself),
  `screens/DiscoverScreen.tsx` (info button + popover).

## Shipped this pass (follow-up) — identity re-verification expiry

Torreé's call: re-verify every 3-6 months. Picked 150 days (~5 months, the middle of that window) as
`AGE_VERIFICATION_VALID_DAYS`, defined once in `lib/muse-actions/shared.ts` alongside a new
`isAgeVerificationCurrent(row)` helper that only returns true when `age_verified` is true AND
`age_verified_at` is within that window. A verified row with a missing/unparseable timestamp is
treated as expired, not grandfathered in — the safer default for an identity gate is to ask again,
not assume (this can only ever happen defensively; the one write site always sets both fields
together).

Swapped every server-side `if (row.age_verified)` gate to `isAgeVerificationCurrent(row)` — same
call sites, same behavior when current, but now they also correctly re-lock once stale:
- `get.ts` — the real NSFW visibility gate (profiles + photos list).
- `sessions.ts` (`sessionBook`) — paid session booking.
- `connect/route.ts` (`create-payment`) — marketplace payments.
- `verification/route.ts` (`create-age-gate-session`) — "already verified, skip the flow" check.

Client-side (`page.tsx`), the existing `ageVerified` boolean that already gates the
AgeVerificationModal before paid disclosures now also checks the same window before trusting a
cached "verified" flag from the server payload — so a stale verification naturally re-triggers the
*existing* re-verification modal with zero new UI, rather than needing a new banner/prompt built
from scratch. Server-side checks remain the actual enforcement either way (client state was already
documented as cosmetic, not a control).

New test coverage: `shared.test.ts` (`isAgeVerificationCurrent`) — never-verified, missing timestamp,
unparseable timestamp, fresh, just-inside-window, just-outside-window, and a policy-bounds check that
the constant itself stays inside Torreé's stated 3-6 month range. tsc clean, 240/240 tests passing
(233 previous + 7 new).

## Research findings not pursued (either out of scope per your constraints, or no small safe slice found)

- Upwork "Boosted Proposals" / LinkedIn Premium profile-boost mechanics → maps to à la carte boosts (forbidden this round).
- LinkedIn InMail / dating-app message-request separation (Hinge/Bumble triage inbox) → maps to message-request triage (forbidden this round).
- Discord AutoMod / Reddit modqueue-style automated pre-screening → maps to community moderation but the smallest honest version (a real moderation-action queue with audit trail) is not a one-sitting slice; flagging for a future dedicated pass rather than shipping a half version.
- Duolingo/Strava streak-and-badge gamification patterns → Muse's Quests system already covers this ground (tiers, rewards, filters) reasonably well; no clear small addition beyond what already shipped in the previous batch (one-line quest cards, filter-row fix).
- Calendly+Stripe combined booking/payment confirmation UX, Airbnb-style host/guest dual confirmation → overlaps booking/escrow, which is explicitly protected ("never weaken booking escrow") and not a small slice — flagging for a dedicated review rather than touching it here.
- Substack/Patreon tiered-subscription messaging (what a subscriber tier unlocks, shown inline) → Muse's subscription/tier model exists but a full audit of where tier benefits are (or aren't) surfaced in-app is a bigger investigation than fits in this batch; noting as a candidate for the next pass.
