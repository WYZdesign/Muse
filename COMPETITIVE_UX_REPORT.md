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
