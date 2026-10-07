# Visual Design Audit — 5,000 Points (50 categories × 10 checks × 10 points)

**Audit date:** 2026-10-07 (v2 — restructured at Torreé's request to match the denser 50×10×10 format Codex independently used, rather than the original 25×4×50 structure).
**Evidence baseline:** branch `claude/restore-pending-fixes` at `dddf658` (built on `origin/main` at `63f9d71`); production site `https://muse.wyzdesign.com`.
**Method:** 50 categories, 10 checks each, 10 points per check = 5,000 points. A check earns 10 only when it's actually verified (code citation, or — where noted — Codex's live-browser evidence); an unverified or partially-verified check earns partial credit with the gap stated, never a guessed full score.

## Confiding in the other agents' work (per Torreé's instruction)

This version pulls in two outside sources rather than working in isolation:

1. **Codex's own parallel `MUSES_VISUAL_BACKEND_5000_POINT_AUDIT_2026-10-07.md`** (on `codex/visual-backend-audit-20261007`, live-browser-tested against production) — independently landed at 3,240/5,000 (64.8%), within 2.6 points of this document's prior version (3,370/5,000, 67.4%). Where Codex's live evidence covers something this document couldn't (motion, zoom, keyboard, console health, a live demo-mode/UI-contract gap), that's cited directly and credited, not re-derived blind.
2. **Two fresh subagent research passes** run specifically to close gaps neither audit had covered yet (Sessions, Network/search, Chat, Notifications, Entitlements, Onboarding, Referral/quest, public marketing pages). These found **3 new confirmed bugs** (2 already fixed this round, 1 flagged as a bigger design decision) and **3 new trust/accuracy gaps** (not yet fixed, documented below).
3. **Codex's cross-agent conference handoff** (`AGENT_CONFERENCE_HANDOFF_2026-10-07.md`) assigns this document's exact role ("Visual-audit owner... run a complete live matrix") — this document does the code-level half of that; the live-device-matrix half is explicitly flagged as not done here (no reliable screenshot capability this round) and routed to whoever runs it live, per that handoff.

## Executive score

**Current score: 3,306 / 5,000 (66.1%)** — close to the prior version's 3,370 (and to Codex's independent 3,240), despite this pass finding and fixing 2 more real bugs, because the denser 50-category structure also exposes real, newly-documented findings (the pricing-page oversell, the Network/search schema mismatch, the onboarding silent-success gap) that the coarser 25-domain version hadn't isolated as their own line items yet. More granularity surfaced more to fix, not less.

| # | Category | Pts/100 | Evidence |
|---:|---|---:|---|
| 1 | Color token adoption | 55 | ~35 tokens defined; 337 raw hex literals vs 815 `var()` references across `screens/*.tsx` — roughly 1 hardcoded color per 2.4 token uses. |
| 2 | Theming (light/dark correctness) | 60 | 12 real themes (6 dark/6 light), working toggle; hardcoded literals from #1 don't participate, so some text goes wrong-contrast under light themes (`DiscoverScreen.tsx:458/661/787`, `CodexScreen.tsx:115/184/204`). |
| 3 | Typography scale & hierarchy | 65 | Clean Inter/Playfair Display split; no defined scale, ~30 distinct font-sizes incl. odd half-pixel steps; `.card-hero-name`/`.profile-name` have no truncation guard. |
| 4 | Color contrast & legibility | 55 | No dedicated contrast test baseline; 2 previously-documented issues (daily-streak "Later" button, Network subtitle) still open, not re-derived here. |
| 5 | Spacing & radius scale | 58 | No shared tokens; 7 distinct card border-radius values for conceptually similar containers. |
| 6 | Button/control styling consistency | 60 | No shared padding scale (8 distinct patterns sampled); native-button migration ~80% done (see #21). |
| 7 | Modal/overlay consistency | 50 | 3 different header/close patterns in the same `modals/` directory (`SelfDiscoveryModal`, `ShareProfileSheet`, `EditProfileModal` each diverge). |
| 8 | Badge/chip/pill consistency | 85 | **Improved this round** — `NetworkScreen.tsx`'s duplicated pro-badge logic (2 different golds for the same "Pro" badge) consolidated into `buildProfessionalBadges()` (commit `2d3783c`). `CollabScreen`/`CommunityScreen` pill duplication is a separate, still-open instance. |
| 9 | Avatar sizing consistency | 53 | 9 distinct hardcoded avatar sizes for the same semantic role, no shared scale. |
| 10 | Image alt text & fallback | 88 | **Improved this round** — `CollabScreen.tsx`'s missing `onError` fallback fixed (commit `2d3783c`). Generic alt text (`alt="Avatar"`/`"Photo"`) still recurs in a few spots. |
| 11 | Loading/skeleton states | 48 | Shared `ScreenSkeleton` exists but used by exactly one screen; `SessionsScreen`/`BtsScreen` have no loading UI at all. |
| 12 | Empty states | 73 | `EmptyState` well-adopted on primary screens; several secondary screens (saved quests, bookings, payment history) bypass it with plain text. |
| 13 | Error/toast states | 88 | Single shared toast mechanism, no raw `error.message` ever shown to a user. |
| 14 | Responsive breakpoints | 55 | 4+ distinct small-screen cutoffs (340/360/390px) with no shared constants; a ~375px device can land between two and get neither adjustment. |
| 15 | Safe-area/notch handling | 58 | Applied to nav/hamburger/chat-header; Discover's match FAB and modal headers aren't inset-aware; a documented `.phone`/`.chat-header` double-padding conflict exists. |
| 16 | Viewport units (100vh/dvh) | 75 | `muse.css` itself always pairs `100vh` with `100dvh`; 11 other page-level files use bare `100vh`, two of which (`post/[id]`, `profile/[id]`) are public deep-links. |
| 17 | Touch target sizing | 58 | Primary controls mostly ≥44px; a few icon-only secondary controls (22×22 photo-delete "×") are well under it. |
| 18 | Horizontal scroll / fixed-width risk | 90 | Clean — scroll rows correctly use `nowrap`/`flex-shrink:0`; containers use `max-width`/`%`, not rigid px. |
| 19 | Image loading / CLS (`sizes` prop) | 93 | Clean — every `fill`-mode `<Image>` found has a correctly-scaled `sizes` prop. |
| 20 | Capacitor/native platform visuals | 65 | Static config is correct (status bar/keyboard/splash); no iOS-vs-Android CSS branching beyond that. |
| 21 | Native-control a11y migration | 83 | ~26 elements converted across 3 rounds, verified no content/name regression; 12 files' remaining `role="button"` instances are each a documented deliberate deferral, not an oversight. |
| 22 | Keyboard navigation | 55 | *(Codex live evidence, credited)* Named controls strong; Codex flags an end-to-end keyboard pass as still pending — not independently re-verified here. |
| 23 | Screen-reader semantics | 72 | *(Codex live evidence, credited)* Landmarks/tabs/dialogs/aria-labels observed live; matches this document's own component-level aria-name findings. |
| 24 | Motion & reduced-motion | 45 | *(Codex live evidence, credited — not exercised in this document's own pass)* `prefers-reduced-motion` behavior not independently verified either way. |
| 25 | Text zoom | 40 | *(Codex live evidence, credited — not exercised in this document's own pass)* Not independently verified. |
| 26 | Demo-mode truthfulness | 35 | *(Codex live evidence, credited)* Production runs demo mode but several UI actions still fire real backend calls that surface as console-visible 409s/401s instead of being disabled or labeled "available to founding beta members." Real trust gap, not cosmetic. |
| 27 | API/UI error contract & console health | 30 | *(Codex live evidence, credited)* Same root cause as #26 — expected demo-mode rejections surface as console errors/warnings during ordinary navigation rather than a handled UI state. |
| 28 | Performance/network hygiene | 45 | *(Codex live evidence, credited)* Repeated unused `<Image>` preloads observed live; not independently re-verified in code this round. |
| 29 | Data realism (demo persona/fixtures) | 80 | Demo persona (`DEMO_USER`) is detailed and internally consistent (bio, stats, badges, albums); clearly labeled as a demo session per Codex's live check too. |
| 30 | Closed-beta onboarding clarity | 55 | Tutorials are strong and consistent (see #23); the invite/waitlist path's user-facing clarity about what's demo vs. live is still an open product decision (see GTM strategy doc's conference-decision questions). |
| 31 | Trust/legal/support clarity | 60 | Legal links (`terms`/`privacy`/`safety`) exist and are reachable; **pricing-page accuracy has 2 new confirmed issues, see #48.** |
| 32 | Release/documentation evidence discipline | 85 | This engagement's own `DELIVERY_STATUS.md`/`HANDOVER.md` discipline (confirmed-SHA verification before trusting any claim) is unusually strong for a multi-agent project; Codex's conference handoff independently flags this as still needing tightening ("handoffs conflict/stale" at the time it was written) — scored down slightly for that. |
| 33 | Discover screen visual↔backend correctness | 90 | **Confirmed-bug-then-fixed**: verified checkmark/online dot (commit `5abd049`, documented in v1 of this doc). Clean otherwise. |
| 34 | Feed screen visual↔backend correctness | 92 | Clean — checked post/comment counts, author avatar, report placement. |
| 35 | Collab/Briefs visual↔backend correctness | 90 | Clean — applicant counts verified real (`muse_brief_applications(count)`, correctly unwrapped by `normalizers.ts`). |
| 36 | Community visual↔backend correctness | 90 | Clean — member counts verified real and kept current on join/leave. |
| 37 | Muses/Matches visual↔backend correctness | 92 | Clean. |
| 38 | Profile/Settings visual↔backend correctness | 85 | Clean on the fields sampled; not an exhaustive settings-field sweep. |
| 39 | Sessions/booking visual↔backend correctness | 95 | **New confirmed bug, found and fixed this round** (commit `dddf658`): `muse_sessions` has no `name` column — it's the host's name, title is the session's. Every real session's card headline, booking toast, aria-label, and modal title showed the session's own title a second time instead of the host's name (masked by a `??` fallback instead of surfacing blank). Host name now joined in, same pattern as #33. Regression test added. |
| 40 | Network/Professionals directory visual↔backend correctness | 40 | **New confirmed bug, NOT fixed — flagged for a design decision.** The professional search box (`NetworkScreen.tsx`, 2+ chars) hits `searchAll`'s `users` branch, which returns raw `muse_profiles` rows (`avatar`, no `exp`/`openings`) into a UI built for `muse_professionals` rows (`img`, `exp`, `openings`, `rate`, `skills`) — these are two separate tables with disjoint schemas and no adapter between them. Every search result renders a broken photo and literal `undefined` Experience/Openings stats. This isn't a one-line fix like #33/#39 — it needs a decision on whether search should query `muse_professionals` directly or map fields, so it's documented rather than patched blind. |
| 41 | Chat/messaging visual↔backend correctness | 95 | **New confirmed bug, found and fixed this round** (commit `dddf658`): a voice/video note received live via Supabase realtime rendered as a blank bubble — the realtime relay forwarded only `img`, dropping `kind`/`mediaUrl`/`mediaType`/`durationMs`/`transcript` that the DB row actually carries (the reload path already mapped these correctly, which is why it only broke live). Fixed with a 4th "extras" argument threaded through; 2 regression tests added. |
| 42 | Notifications visual↔backend correctness | 95 | Clean — bell badge count, activity feed items, and profile-viewers all verified real and correctly joined; the one `|| 0` present is a safe default on a repeatedly-polled value whose failures preserve the prior count, not a stale-masking default on a one-shot fetch. |
| 43 | Search visual↔backend correctness | 40 | Same root cause as #40 (professional search) — cross-referenced here under its own category since "search" and "Network directory" are functionally two different user entry points to the same broken handler. |
| 44 | Entitlement-gated visuals (Pro/paywall) correctness | 80 | Tier/verified/boost flags are genuinely server-selected and never client-writable (`profile.ts`'s allowlist explicitly excludes `tier`/`verified`/`boost_expires_at`) — confirmed clean. **Scored down from a would-be 95** because the *marketing claims* about what Pro unlocks don't match this backend reality — see #48. |
| 45 | Onboarding flow visual↔backend correctness | 55 | **New finding, NOT fixed.** All 3 backend calls onboarding's final step makes (profile save, referral apply, portfolio album creation) genuinely exist and work — but the "Welcome to Muses!" success toast and screen transition fire unconditionally regardless of whether any of them actually succeeded. A user whose session expired mid-onboarding sees a cheerful welcome with none of their referral code, portfolio photos, or profile edits actually saved, and no retry affordance. UX/trust gap, not a missing endpoint. |
| 46 | Referral & quest visual↔backend correctness | 65 | **Mixed.** Referral stats, quest XP/level, and the login-streak *number* are all genuinely server-synced (confirmed, including a previously-documented fix that moved the streak off a client-only guess). **But** the weekly-login day *pips* shown right next to that same streak number are derived purely from `localStorage`, never cross-checked against the server — a real signal and a fake one sitting visibly side by side in the same widget. Clearing site data, a second device, or a PWA reinstall desyncs the pips from the (correct) streak number next to them. |
| 47 | Admin/moderation panel visual correctness | 60 | Not freshly re-verified this round; carried forward from this engagement's existing a11y/focus-trap fixes to `ModerationPanel`/`PaymentHistory` (tab semantics, roving tabindex already confirmed done per `DELIVERY_STATUS.md`). |
| 48 | Public/unauthenticated marketing pages correctness | 35 | **New finding, NOT fixed — the most consequential one in this round.** The public pricing page (`/muse/pricing`) lists "Advanced search filters," "Portfolio analytics," and a 5/week free-tier connection cap as Pro-exclusive/Pro-lifted. Backend reality: Portfolio Analytics (`AnalyticsScreen.tsx`) has **zero** tier checks anywhere — any free user already has it in full. Search filters are likewise ungated anywhere in `DiscoverScreen.tsx`. And `connect.ts`'s rate limit is a flat per-IP cap with **no tier branch at all** — the stated free-tier "5/week" limit isn't enforced in code. A prospective subscriber is told paying $9.99/mo unlocks three things, two of which free users already have and one of which isn't actually capped for anyone. This reads as deceptive-advertising-adjacent, not a cosmetic copy/code drift, and needs a product decision (gate the features for real, or fix the marketing copy) before any paid promotion goes out. |
| 49 | Cross-theme (light/dark) consistency sweep | 60 | Same root cause as #1/#2 — the token system itself handles both themes correctly where used; the gap is entirely in the hardcoded-literal instances, not the theming mechanism. |
| 50 | Cross-device/orientation live-matrix readiness | 30 | **Explicit gap, not scored as done.** Codex's conference handoff calls for a live matrix at 320/375/390/452/768/1024/1440 widths across ~15 screens and ~10 states — this document is code-level only (screenshot capture was unreliable on the connected device all session) and cannot certify this live. Routed to whoever runs that matrix next, per the conference handoff's own assignment. |

**Column total: 3,306 / 5,000.**

## What changed since the 25-domain version (v1)

- **2 new confirmed bugs found and fixed**, both the same "field never selected/forwarded" family as the original Discover fix: Sessions' missing host-name join (#39) and Chat's dropped live-media fields (#41). Both ship with regression tests, full gate re-verified (tsc 0, eslint 0, vitest 161/1253, build clean), commit `dddf658`.
- **3 new findings documented but NOT fixed**, each requiring a design/product decision rather than a safe one-line patch: the Network/search schema mismatch (#40/#43), the onboarding silent-success-toast gap (#45), and — most consequential — the pricing page overselling features free users already have (#48).
- **1 new finding that's a UX inconsistency, not a bug**: the weekly-login pips vs. streak-number split (#46).
- **Credited Codex's live-browser evidence directly** for 7 categories (#22–28) this document's own methodology can't currently verify (no reliable screenshot capture this session) rather than guessing or re-scoring them from code alone.

## Priority sequence (updated)

### P0 — the pricing page (#48) is the one to act on fastest
This is the only finding in this round with direct exposure to paying customers and outside scrutiny (a subscriber or a journalist could notice it). Fix by either gating Portfolio Analytics / search filters for real, or editing the pricing copy to stop claiming they're Pro-exclusive, and either enforcing or removing the "5/week" free-tier connection claim. This should happen before any paid-tier promotion goes out, not just "eventually."

### P1 — design decisions needed, not blind patches
- Network/search schema mismatch (#40/#43): decide whether professional search should query `muse_professionals` directly or map `muse_profiles` fields into that shape.
- Onboarding silent-success toast (#45): decide the UX for a partial-failure onboarding completion (block + retry? best-effort + a follow-up nudge?).
- Weekly-login pips (#46): either sync them to a real server-side login-day record, or remove them so the widget doesn't show a real signal and a fake one side by side.

### P2 — needs a live device/screenshot pass to close out
Categories #22–28, #50 — routed to whoever runs the live matrix per the conference handoff, since this document's own methodology can't certify them.

## Sources / cross-agent credit
- `MUSES_VISUAL_BACKEND_5000_POINT_AUDIT_2026-10-07.md` (Codex, `codex/visual-backend-audit-20261007`) — live-browser evidence credited in categories 22–28, 50.
- `AGENT_CONFERENCE_HANDOFF_2026-10-07.md` (Codex) — defines this document's assigned scope and the live-matrix handoff.
- Two subagent research passes run this round for categories 39–48 (Sessions, Network/search, Chat, Notifications, Entitlements, Onboarding, Referral/quest, public pages).
