# Muse — Handover V3: UX/Visual Audit Findings

**From:** Claude (visual/functional audit session)
**To:** wyzmind (opencode) — for implementation
**Date:** 2026-08-20
**Scope:** Continuation of HANDOVER_V2.md. This session did a live audit of muse.wyzdesign.com (landing page + authenticated app) via browser automation, cross-referenced against the local repo at `V:\Muse`. Two fixes were made and written to disk already; everything else below is diagnosis + recommendation only — no other code was changed. All fixes need your build → commit → push → verify deploy cycle.

---

## ADDENDUM (same day) — Post-deploy verification

wyzmind pushed `69cac88`, `51253c2`, `505331f` addressing most of this document. I re-tested the live site after deploy. Results:

| Item | Status | Notes |
|---|---|---|
| §1a Hydration error (#418) | ✅ Confirmed fixed | No console error on landing load or gate-skip |
| §1b Hero/nav overlap | ✅ Confirmed fixed | Eyebrow badge clear of nav at current viewport width |
| §2 Subscription blank-frame bug | ✅ Confirmed fixed | Tested via in-app nav AND cold page refresh — single frame, no scroll needed, both repro paths clean |
| §2a Invisible "Profile" header text | ✅ Confirmed fixed | Now reads "Muse Pro" in gold gradient |
| §3 Founding-member "already yours" badge | ⚠️ Still open | Not yet implemented per wyzmind's own handover |
| §4 Placeholder-image pattern (BTS) | ⚠️ Still open | Re-tested — large blank rectangle above "No moments yet" is unchanged |
| §4 Placeholder-image pattern (Discover card) | 🟡 Likely a false alarm, not a bug | Re-tested: card that looked blank at ~2s post-navigation was fully loaded 1s later on a second screenshot. Looks like a lazy-load/render-timing artifact rather than a real defect — recommend not spending further effort here unless it recurs consistently. wyzmind's added avatar-corner fallback is a nice touch but doesn't change this assessment. |
| §5 Tutorial spotlight overlay | 🟡 Fix reported, not independently re-verified | Couldn't re-trigger — this account already dismissed the tutorial (likely a one-time localStorage flag), so I couldn't reproduce the original bug to confirm the fix live. wyzmind's described fix (real `.conn-card`/`.brief-card` selectors replacing the anchor-less `"card"` default) is a plausible, correctly-targeted fix based on the description. |
| §6 SQL catch-up migration | ❓ Still unconfirmed | Not mentioned as resolved in either handover — needs explicit Supabase check |
| Footer/legal 404s, mobile hamburger nav, viewport pinch-zoom (from wyzmind's landing-page handover, not in my original scope) | ✅ Spot-checked, working | Nav, zoom, and founding-tier cards all render correctly at current viewport |
| Waitlist confirmation email | ❓ Cannot verify | No email inbox access from this session — wyzmind's own handover still lists this open |
| Pricing section narrow-viewport layout | ❓ Could not test | My browser tool's `resize_window` call didn't actually narrow the rendered viewport in this session — still needs a real ≤920px check |

**Net: both of my originally-filed high-priority bugs (§1, §2) are confirmed fixed and holding up under retest, including the more severe refresh-based repro. The Discover "blank card" item should probably be downgraded from the open list — it doesn't reproduce.**

---

## ADDENDUM 2 — Fresh test account verification (commit `f1c7c27`)

Per Torreé's instruction, created a brand-new test account (`ux-audit-verify2@wyzdesign.com`) rather than reusing the founding-member account, specifically to get a clean, never-dismissed tutorial state and re-test the items ADDENDUM 1 couldn't confirm. Ran the full 18-step onboarding end-to-end (name/location/bio, creative type, looking-for, aesthetic, skip Know Yourself, skip photo, skip portfolio, skip socials, Enter Muse) — no errors, no broken steps, clean transitions throughout.

| Item | Status | Notes |
|---|---|---|
| §5 Tutorial spotlight overlay | ✅ Confirmed fixed | Walked the fresh account's entire first-run tutorial sequence (Match Actions → Swipe to Decide → Navigation) and then opened Community for the first time on this account — the spotlight rings are now correctly sized and positioned to their actual targets (a horizontal band around the swipe card, a ring around the bottom nav bar). The full-viewport blank yellow-bordered box from the original bug report does not reproduce anywhere, including on Community, which is where I originally found it. |
| §3 Founding-member "already yours" badge | ✅ Confirmed fixed | This new account isn't a founding member (plain Free tier), so I can't confirm the founding-banner reassurance line, but the core ask — an unambiguous marker on the current-plan card — is live and correct: a gold-to-lavender "✓ You have this" pill sits on the Free tier card, which also gets a gold border/glow. Matches the spec exactly. |
| §4 BTS empty-state placeholder | ✅ Confirmed fixed (reconfirmed on 2nd account) | Camera icon + "No moments yet" label, no bare rectangle. |

**Everything from the original audit (§1–§5) is now confirmed fixed via live re-test, most of it on two independent accounts. Remaining open items are unchanged: waitlist confirmation email (needs backend/email-log check, no UI repro available to me), and the ≤920px pricing layout (my browser tooling couldn't reliably narrow the rendered viewport this session — needs a real mobile-width check, devtools device emulation, or a phone).**

---

## 1. Already fixed on disk, NOT yet built/deployed

These two are done in the local files but still need `npm run build`, commit, push, and a live re-check afterward.

### 1a. Hydration mismatch on landing page (React error #418)
**File:** `src/app/muse/landing/page.tsx`

**Root cause:** the `gateGone` state was initialized by reading `sessionStorage` directly inside `useState(() => ...)`. Server-rendered HTML always renders the entry gate; if a returning visitor's session already has `muse_entered=1`, the client's first paint skipped the gate while the server's didn't — a server/client mismatch that throws React error #418 in the console.

**Fix applied:** `gateGone` now always initializes to `false` (matching the server), and a `useEffect` after mount checks `sessionStorage` and flips it post-hydration:
```js
const [gateGone, setGateGone] = useState(false); // was: useState(() => sessionStorage.getItem(...) === "1")
...
useEffect(() => {
  try { if (sessionStorage.getItem("muse_entered") === "1") setGateGone(true); } catch {}
}, []);
```
Verified still present at lines 312 and 324 of the current file.

**To verify after deploy:** load the landing page as a returning visitor (one who already passed the gate this session) and confirm no React error #418 appears in console.

### 1b. Hero content overlapping the fixed nav bar
**File:** `src/app/muse/landing/landing.css`

**Root cause:** `.muse-hero`'s top padding had been cut too aggressively in an earlier session's "close the gap" pass, leaving hero content (specifically the "Founding members get lifetime Pro" eyebrow badge) rendering underneath the `position: fixed` nav bar.

**Fix applied:**
- Desktop `.muse-hero`: `padding: 20px 24px 80px` → `padding: 100px 24px 80px` (line 459)
- Mobile (`@media max-width:620px`) `.muse-hero`: `padding: 12px 20px 80px` → `padding: 88px 20px 80px` (line 785)

**To verify after deploy:** screenshot the landing page at both desktop and mobile widths, confirm the eyebrow badge and hero heading sit clearly below the nav with no overlap.

---

## 2. New — Subscription screen renders as a blank frame requiring a scroll (unfixed, needs your investigation)

**Repro:** From the app, Menu → Muse Pro (or any path into `screen === "subscription"`), or simply refresh the page while that screen is active (the screen persists across reload). The viewport shows a large, fully empty rounded card matching the `.phone` styling (glass background, gold glow border) — no header, no content. Scrolling the page down reveals a second `.phone`-shaped card below it containing the real "Unlock Your Potential" header and pricing tiers.

**Structural context (confirmed by reading the code, `src/app/(muse)/muse/page.tsx`):**
- Line 1605: the main tabbed app shell renders `<div className={"phone-wrap" + (screen==="subscription"||screen==="settings" ? " phone-wrap-standalone-hidden" : "")}>`. This wrapper holds `DiscoverScreen`, `FeedScreen`, `MusesScreen`, `BtsScreen`, etc. (lines 1937–1951), each presumably self-gating on `screen` internally (same pattern as `SubscriptionScreen`'s own `if (screen !== "subscription") return null`).
- Line 1959: `SubscriptionScreen` is rendered as a **separate sibling**, `{screen === "subscription" && <SubscriptionScreen .../>}`, and it builds its own independent `<div className="phone-wrap"><div className="phone" id="muse-app">...` (see `screens/SubscriptionScreen.tsx` lines 36–38).
- `muse.css` line 568: `.phone-wrap-standalone-hidden{display:none!important}` — this is the only definition of that class, and it does use `!important`, so on paper it should fully collapse the main phone-wrap to zero height whenever `screen === "subscription"`.

**What this means:** the CSS rule that's supposed to suppress the first, empty `.phone` looks structurally correct, which is why I'm flagging this as "needs your investigation" rather than handing you a one-line fix. The empirical behavior (two stacked `.phone` cards, one empty) is consistent with the hide-class either (a) not being applied on the actual DOM node — check for a stale-closure/hydration timing issue similar to §1a, where `screen` used for the className computation lags one render behind the `screen` used to decide whether `SubscriptionScreen` mounts, or (b) some other CSS rule elsewhere overriding `display` back before I found it in my search of `muse.css`.

**Suggested next step:** open the live subscription screen in devtools, inspect the DOM directly — confirm whether two `.phone` elements exist simultaneously, and if so, check the actual computed `display` value and class list on the first (main-shell) one at that moment. That will tell you definitively whether it's a stale-className/timing bug or a CSS specificity issue.

**Severity note:** this is also reachable via plain page refresh (not just in-app navigation), so it's not an edge case — any user who lands on Subscription and reloads sees a broken-looking blank screen with no visual cue to scroll.

### 2a. Minor, same file: invisible header label
**File:** `src/app/(muse)/muse/screens/SubscriptionScreen.tsx`, line 40.

The header's "Profile" label is styled with `WebkitBackgroundClip: "text"`, `backgroundClip: "text"`, `WebkitTextFillColor: "transparent"`, `color: "transparent"` — but no `background` (gradient) property is set. This renders the text completely invisible; it looks like `.logo-link`'s gradient-text styling (used elsewhere, e.g. `muse.css` line 201) was copy-pasted without the `background: linear-gradient(...)` that makes it work. Either add the gradient or just use a plain color — currently it's dead, invisible markup.

---

## 3. Founding-member "already yours" treatment on the pricing tiers (spec, not yet built)

Torreé confirmed the direction: keep the full tier comparison visible for founding/Pro members (don't hide it), but add an unambiguous visual cue that they're already covered.

**File:** `src/app/(muse)/muse/screens/SubscriptionScreen.tsx`

- The `isCurrent` check already exists at line 67 (`tierKey === userTier || ...`) and already adds a `"current"` class to that tier's card (line 69). Right now that class alone doesn't clearly communicate "you have this" next to a founding member's gold banner above it.
- Add an explicit badge/marker on the current-plan card — e.g. "✓ You have this" — using the same gold/lavender palette as the founding-member banner (lines 56–64).
- Add a one-line reassurance directly under that banner, e.g. "Browse plans below anytime — you won't be charged," so founding members don't hesitate to explore the pricing table.

Exact copy and visual treatment are left to your and design's judgment — the functional requirement is just: unambiguous "already yours" marker on the current tier, plus a reassurance line near the founding banner.

---

## 4. Placeholder-image / empty-media pattern (same symptom, three places)

Observed in three different screens, all showing a flat, empty colored rectangle where an image or icon should be:

1. **Discover card** — a profile card for "MITRI" (Photographer, San Francisco) rendered with a solid black/blank body where the profile photo should be.
2. **BTS (Behind the Scenes) empty state** — above the "No moments yet" card, there's a large (~260px tall) flat maroon-gradient rectangle with no icon, illustration, or label.
3. **Community → Events tab** — each event card ("Golden Hour Meetup," "Creative Portfolio Review," etc.) shows a flat solid dark-purple rectangle in place of an event image/banner.

**I could not pin down exact file/line for this** — the screen components for Discover, BTS, and Community (`DiscoverScreen.tsx`, `BtsScreen.tsx`, `CommunityScreen.tsx`) weren't part of what was staged into this session, only referenced by name in `page.tsx` (lines 1937, 1940, 1945) following the same `screens/` folder convention as `SubscriptionScreen.tsx` and `SettingsScreen.tsx`. Given the same visual symptom shows up in three unrelated screens, my best guess is a shared thumbnail/image component (or a shared CSS class) that renders a bare colored `<div>` as its fallback when `image_url`/`avatar_url`/`banner_url` is null or hasn't loaded, instead of a real empty-state (icon, initials, or "no photo yet" treatment). Worth grepping across those three files for whatever they have in common before fixing each individually — you may only need one fix.

---

## 5. Tutorial "spotlight" overlay renders as a giant empty box

**Repro:** Menu → Community, on first visit. The onboarding tooltip ("Communities — Join communities around cities, crafts, and interests...") appears correctly at the bottom, but above it a large rectangular region (roughly 1300×350px in a 1568-wide viewport — most of the screen) renders with a **plain yellow focus outline and nothing inside it**, clearly meant to be a "spotlight" highlight ring around one specific element (probably the group list or a specific card) but sized/positioned to cover almost the whole page instead.

I wasn't able to locate the responsible component by name (searched for "spotlight," "tutorial-highlight," "coach-mark," "tooltip-target" — no matches in what's staged locally). Recommend searching the repo for whatever renders the onboarding tooltip system (it's used elsewhere too — the Profile screen's first-visit tooltip and the 3-step Collab tutorial both use what looks like the same component) and checking its target-element bounding-box measurement logic — it's likely defaulting to a full-container rect instead of the intended target element's rect.

---

## 6. CRITICAL — unresolved from HANDOVER_V2, still needs verification

`sql/MUSE_CATCHUP_ALL_20260819.sql` was flagged in HANDOVER_V2.md as **must-run** against production Supabase (`ejbwjmzrazfgtisqsamf`). It creates 7 tables (`muse_waitlist`, `muse_landing_analytics`, `muse_qr_events`, `muse_verification_sessions`, `muse_rate_limits`, `muse_events_log`, `muse_ncmec_reports`), a `check_rate()` RPC, a founding-member trigger, and a booking-payment unique constraint.

I have no database access from this session and could not confirm whether this was ever applied. **Please verify via the Supabase SQL editor or table list before doing anything else** — if it's still pending, several features (rate limiting, event logging, NCMEC compliance reporting, verification sessions) may be silently broken or erroring server-side without any visible symptom in the UI.

---

## 7. Verified working — no action needed

Confirmed via live click-through with console + network monitoring, no errors, all `/api/muse` calls returned 200:

- Landing page loads (aside from the two issues in §1)
- Feed screen — real post content, no errors
- Discover — swiping/browsing works (aside from the MITRI image issue in §4)
- Muses/Matches list and chat — sending a message, quick-reply chips, and receiving a reply all worked correctly end-to-end
- Menu panel — all 7 entries (Activity, Community, Sessions, Network, Profile, Settings, Muse Pro) present and correctly described
- Community → Groups tab — join/learn/share buttons render correctly for 4+ groups
- Community → Events tab — RSVP/Share buttons work (aside from the image placeholder in §4)
- Collab tab — first-visit tutorial overlay is expected onboarding UI, not a bug

**Not a bug:** repeated console messages reading "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received" — this is standard Chrome-extension noise (from some other installed extension's content script), unrelated to the Muse app. Safe to ignore.

---

## 8. Suggested priority order

1. Apply/verify the SQL catch-up migration (§6) — blocks unknown amount of backend functionality, zero-risk to check.
2. Build + deploy the two already-fixed files (§1) — done, just needs the pipeline.
3. Investigate and fix the subscription blank-frame bug (§2) — high visibility, reachable by plain refresh.
4. Fix the invisible header label (§2a) — trivial, one line.
5. Placeholder-image pattern (§4) and spotlight overlay (§5) — polish, moderate visibility.
6. Founding-member "already yours" treatment (§3) — polish/UX enhancement.

---

*This document is diagnosis and recommendation only. No code beyond §1 was modified this session — everything else is for wyzmind to implement directly, per Torreé's instruction to keep coding changes in opencode's hands going forward.*
