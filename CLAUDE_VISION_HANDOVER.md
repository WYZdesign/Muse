# CLAUDE — VISION / VISUAL AUDIT HANDOVER

> Claude — this is handoff for the **visual audit** pass. Key context up front:
> **the production deploy IS current and live (SHA `19b3d6f`).** You are NOT looking at a stale build.
> If the app "looks outdated," hard-refresh / clear cache (the app serves `no-store` but your browser may
> hold an old service-worker shell). Verified end-to-end — see §1.

---

## 1. Verified facts (do not re-litigate; trust these)

| Check | Result | How verified |
|-------|--------|--------------|
| Production live SHA | `19b3d6f` (`name=muse`, READY) | Vercel API `target=production` |
| Latest code in served bundle | ✅ `discover-ranked`, `boost-status`, `payout-readiness`, `request-refund` all present | Grepped the live Turbopack JS chunks |
| App health | ✅ `/api/health` OK | curl |
| Playwright smoke (21/21) | ✅ all pass on live site | `npx playwright test tests/smoke.spec.ts` |
| DB migrations | ✅ **005–014 applied** to live Supabase | Supabase Management API (verified columns/tables; no blind re-runs) |
| Vision check (wyzmind) | Landing page renders & scrolls; hero "MEET / Your Creative Twin", "Start free", sunset scene, footer all visible | Playwright screenshot + vision |

**So: everything I shipped is live.** Any visual "oldness" is browser/service-worker cache, not the deploy.

---

## 2. Context on what Claude IS responsible for (visual/UX only)

wyzmind completed the **backend + wiring + DB**. You own the **visual pass** on these (all code is live, DB is applied):

### New UI to visually verify (all shipped + wired)
1. **Discover cards** — live-ranked profiles now come from `discover-ranked` (not demo data). Cards should show:
   - **`✦ X% match`** chip when `matchScore >= 15`
   - **`⚡ BOOSTED`** badge on boosted profiles
   - This is the biggest visual change — confirm it renders cleanly and doesn't fight the existing card layout.
2. **Subscription screen** — new **Profile Boost** section at the bottom:
   - `boost-status` → shows inventory / active-until / "⚡ BOOSTED" state
   - Duration picker (24h / 72h / 7d) + **Boost Now** button
   - **Buy Boost Credits — $4.99** button
3. **Sessions > My Bookings** — new **"☀️ Upcoming shoots"** reminders card (from `booking-reminders`) above the booking list.
4. **Sessions > Requests (host)** — new **"💸 You have earnings pending"** banner + **Connect to get paid** CTA when `payout-readiness.needsConnect`.
5. **Sessions > My Bookings (booker, completed+paid)** — new **Request refund** button.

### Visual bugs I already spotted (from my own vision pass)
- **Landing page section headings look cut/abbreviated** ("4 YOUR GLOW", "WHY MUST", "BIG SANDAL", "THE READ LIST", "In-Body Mindset", "Does Out Of", "MUSIC TO FIL", "LAST LINKLESS PLAUS") — these read like **truncated/cropped headings**, likely an overflow/`white-space` issue or animating split-text that only reveals partially in headless/static render. **Investigate the heading overflow + the split-text/marquee sections.** This is the most likely source of your "looks off" impression.
- Verify the boost/match badges don't overflow the card hero on a 390×844 viewport.

---

## 3. Your visual-audit standard (what "done" means)

For each screen you open, confirm on a **390×844 mobile viewport** (Playwright config already does this):
- No horizontal scroll / layout overflow.
- No blank/black regions where content should be.
- Headings not truncated; feature copy not clipped.
- New badges/chips render inside card bounds (not cropped).
- Buttons tappable, no dead zones.

Use the same Playwright setup (`playwright.config.ts`, baseURL = live site):

```
npx playwright test tests/<your-spec>.spec.ts
```

To capture a full-page screenshot + the canvas/SVG animation states, add a test like:

```ts
import { test } from '@playwright/test';
test('shot <screen>', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('https://muse.wyzdesign.com/<route>', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); // let animations settle
  await page.screenshot({ path: '.shots/<screen>.png', fullPage: true });
});
```

---

## 4. Pending operator steps (NOT code — surfaced for you/him, not your job to fix)
- Create Stripe live prices: `price_muse_studio_monthly`, + a boost-credit price.
- Daily.co API key (video/voice) and Supabase Auth TOTP/sessions (2FA) — external-blocked.
- Migrations **005–014 are applied** ✅ — no DB work left.

---

## 5. Handoff cleanliness
- Don't merge over my work blindly — `main` is at `19b3d6f` (wyzmind). Rebase/pull before editing.
- The `claude-audit-fixes` branch carries earlier mergeable work; when you merge it, rebase onto `main` then merge, `git pull` first.
- Any new screenshot artifacts: put them in `.shots/` (gitignored) so they don't pollute the repo.
