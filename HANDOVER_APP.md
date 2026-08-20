# Muse App — Handover for Claude (opencode)

**Date:** 2026-08-20  
**Commits pushed:** `69cac88`, `51253c2`, `505331f`  
**Build status:** Clean (`tsc --noEmit` + `npm run build` both pass)  
**Vercel:** Auto-deploys from `main`

---

## What Was Fixed This Session

### 1. Subscription/Settings double-page-scroll (commit `69cac88`)
**Problem:** Muse Pro and Settings screens rendered their own full phone-frame while the main app's phone-wrap stayed visible as empty scrollable content on desktop.

**Fix:**
- `src/app/(muse)/muse/muse.css` line 568: Added `.phone-wrap-standalone-hidden{display:none!important}`
- `src/app/(muse)/muse/page.tsx` line 1605: Conditional className hides main phone-wrap when `screen==="subscription"||screen==="settings"`

### 2. Landing page fixes (commit `51253c2`)
- 10 legal/placeholder pages created (terms, privacy, pricing, faq, about, blog, careers, press, guidelines, safety)
- Mobile hamburger nav added for ≤720px viewport
- Viewport zoom fix: `maximumScale: 5` (was `1` with `userScalable: false`)

### 3. App polish (commit `505331f`)
- **SubscriptionScreen header:** "Profile" text was invisible — had `backgroundClip: "text"` + `WebkitTextFillColor: "transparent"` but no `background` gradient. Fixed: now shows "Muse Pro" with gold-to-lavender gradient.
- **Image fallback improved:** `handleImgError` in `page.tsx` now shows dark background with gold camera icon or initials instead of garish pink/purple gradient.
- **Tutorial spotlight overlay:** 5 tutorials had `anchor: "card"` with no `selector`, causing highlight ring to cover 84%×52% of viewport. Added real selectors: `.conn-card` for community/forum/sessions/events, `.brief-card` for collab.

---

## Known Issues Still Open

### Resolved this session (commit `f1c7c27`)
- **§3 Founding-member "already yours" badge** — ✅ Implemented. Added gold-to-lavender "✓ You have this" pill badge on the current tier card + "Browse plans below anytime — you won't be charged" reassurance line under the founding banner in `SubscriptionScreen.tsx`.
- **§4 BTS empty-state placeholder** — ✅ Implemented. Empty-state cards now show a centered camera icon + "No moments yet" label instead of a bare gradient rectangle.
- **§6 SQL catch-up migration** — ✅ VERIFIED applied. All 7 tables (`muse_waitlist`, `muse_landing_analytics`, `muse_qr_events`, `muse_verification_sessions`, `muse_rate_limits`, `muse_events_log`, `muse_ncmec_reports`) + 4 columns (`founding_tier`, `pro_expires_at`, `age_verified`, `suspended`) confirmed live via PostgREST (status 200).

### From HANDOVER_V3 (Chrome extension Claude) — still open
1. **Waitlist confirmation email** — `/api/muse/waitlist` returns 200 OK but no confirmation email was received. Check email service logs. (Backend question, no code fix identified.)
2. **§4 Discover card "blank" appearance** — Downgraded to false alarm by Chrome Claude: card was fully loaded 1s later, lazy-load/render-timing artifact. No further action.

### Remaining
3. **Onboarding full tab-by-tab visual audit** — Playwright walkthrough works through all 18 steps but only captures Discover after onboarding. Full screen-by-screen screenshot audit still pending.
4. **Pricing section narrow-viewport (≤920px) layout** — 3-tier grid becomes 2+1, lone third card may look stranded. Needs a real ≤920px visual check.

---

## Architecture Notes for Claude

### Navigation
- **Hamburger menu** (`openHamburger` → `MenuModal`): Activity, Community, Sessions, Network, Profile, Settings, Muse Pro
- **Screen switching:** `showScreen("screenName")` for direct nav; `setHamburgerScreen("sub")` for sub-menus
- **Bottom Nav:** `<Nav>` component in each screen, uses `active` prop + `onNavigate` callback

### Onboarding Flow (18 steps)
0. Find your Muse → "Get Started"
1. Your Info → name (required), location, bio → "Next"
2. Creative Type → select chip → "Next"
3. Looking For → select chips (multi) → "Next"
4. Aesthetic Style → select chips (multi) → "Next"
5. Know Yourself? → "Skip, Set Up Later" → step 14
6-9. Zodiac/Chinese/MBTI/LifePath (all skippable)
10-13. Discovery tests (skippable)
14. Photo → skip → 15
15. Portfolio → skip → 16
16. Socials → skip → 17
17. "Enter Muse" → Discover

### Key Files
| File | Purpose |
|------|---------|
| `src/app/(muse)/muse/page.tsx` | ~2459-line SPA monolith, all state + routing |
| `src/app/(muse)/muse/muse.css` | All app styles |
| `src/app/(muse)/muse/screens/*.tsx` | Individual screen components |
| `src/app/(muse)/muse/screens/tutorials.ts` | Tutorial definitions with selectors |
| `src/app/(muse)/muse/screens/MenuModal.tsx` | Hamburger menu panel |
| `src/app/(muse)/muse/components/Nav.tsx` | Bottom navigation bar |
| `src/app/api/muse/*.ts` | API routes (auth, waitlist, etc.) |

### Supabase
- **Production:** `ejbwjmzrazfgtisqsamf`
- **Staging:** `rwgofoxqycpzsvxfnozt` (user wants to delete this manually)

### Stripe
- **Muse account:** `acct_1U0n04AlrkQDEH7C`
- **MUSEBETA promo code:** $0 checkout verified working

### Run Audit
```bash
python _audit/run_audit.py
```
