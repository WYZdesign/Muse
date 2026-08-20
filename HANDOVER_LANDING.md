# Muse Landing Page — Handover for Claude (opencode)

**Date:** 2026-08-20  
**Commits pushed:** `51253c2`, `505331f`  
**Build status:** Clean  
**Vercel:** Auto-deploys from `main`

---

## What Was Fixed This Session

### 1. Broken footer + legal links (commit `51253c2`)
**Problem:** All 10 footer links and inline Terms/Privacy links returned HTTP 404.

**Fix:** Created 10 placeholder pages under `src/app/muse/`:
- `/muse/terms` — Terms of Service (full legal text)
- `/muse/privacy` — Privacy Policy (full legal text)
- `/muse/pricing` — Free vs Pro tier comparison
- `/muse/faq` — 6 FAQ items with accordion
- `/muse/about` — About Muse / WYZ Design
- `/muse/blog` — Coming soon placeholder
- `/muse/careers` — Email contact CTA
- `/muse/press` — Press contact + brand assets
- `/muse/guidelines` — 8 community rules
- `/muse/safety` — 6 safety features

All use consistent styling: dark `#0a0612` bg, `#ffd700` gold accents, `maxWidth: 720`, `padding: 120px 24px 80px`, back link to `/muse/landing`.

### 2. No mobile navigation menu (commit `51253c2`)
**Problem:** `.muse-nav-links` hidden at ≤720px with no hamburger toggle.

**Fix in `src/app/muse/landing/page.tsx`:**
- Added `mobileMenuOpen` state
- Added hamburger button (3-line icon) visible only at ≤720px
- Full-screen overlay menu with all nav links

**Fix in `src/app/muse/landing/landing.css`:**
- `.muse-nav-hamburger` — 3-line icon, flex column, gold color
- `.muse-mobile-menu` — full-screen overlay with backdrop blur, centered links
- Media query at ≤720px: hides `.muse-nav-cta`, shows hamburger + mobile menu

### 3. Viewport blocks pinch-zoom (commit `51253c2`)
**Problem:** `maximumScale: 1, userScalable: false` in both layout files.

**Fix:**
- `src/app/layout.tsx`: Changed to `maximumScale: 5`
- `src/app/(muse)/layout.tsx`: Changed to `maximumScale: 5`

### 4. Inconsistent feature-card styling
**Finding:** All 6 feature cards have identical markup with icons in code. First row may appear iconless due to caching or render timing — no code change needed.

---

## Verified Working

- **Waitlist form:** `POST /api/muse/waitlist` returns 200 OK, UI shows success message
- **Founding spots counter:** `GET /api/muse/landing-stats` queries `muse_profiles` table — live database count, not hardcoded
- **QR code generation:** Modal opens with real `blob:` image, "Copy Link" puts tracked URL on clipboard
- **Referral tracking:** Dropdown sources generate distinct URLs (e.g. `?src=instagram_bio`)
- **FAQ accordion:** Expands/collapses correctly
- **In-page nav anchors:** `#features`, `#how`, `#safety`, `#founding`, `#join` all resolve
- **Animated stats counter:** Counts up from 0 after page load
- **No console errors** on page load

---

## Known Issues Still Open

1. **Waitlist confirmation email** — Submission succeeds (200 OK) but no confirmation email received. Check if email service (Postmark/SendGrid/Resend) is configured.
2. **Mobile visual confirmation** — CSS looks solid from source read but no real-device screenshot pass completed below 720px.
3. **Pricing section lone card** — At ≤920px, 3-tier grid becomes 2+1 — may look stranded. Needs visual check.

---

## Key Files for Landing Page

| File | Purpose |
|------|---------|
| `src/app/muse/landing/page.tsx` | Landing page component (750 lines) |
| `src/app/muse/landing/landing.css` | Landing styles (804 lines) |
| `src/app/muse/*/page.tsx` | 10 legal/placeholder pages |
| `src/app/layout.tsx` | Root layout (viewport config) |
| `src/app/api/muse/waitlist/route.ts` | Waitlist POST endpoint |
| `src/app/api/muse/landing-stats/route.ts` | Stats GET endpoint |

---

## Styling Conventions

- **Colors:** `--gold: #ffd700`, `--coral: #ff8a80`, `--lavender: #d4a5ff`, `--bg: #0a0612`
- **Font:** `'Playfair Display'` for headings, `'Inter'` for body
- **Border radius:** 22px for cards, 999px for pills
- **Glass effect:** `rgba(255,255,255,0.03)` background, `rgba(255,255,255,0.06)` border
- **Reveal animation:** `<Reveal>` component with IntersectionObserver + `--rd` delay variable
