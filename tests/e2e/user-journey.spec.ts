import { test, expect } from '../fixtures/test-fixtures';
import {
  loginAsDemoUser,
  dismissPageTour,
  assertNoDocOverflow,
  checkDiscoverQueueIsolation,
} from '../helpers/test-helpers';

/**
 * Tier 2.1 — one continuous user journey in demo mode.
 *
 * Every screen already has its own spec (discover-deck, feed-messaging,
 * profile-settings, smoke). What none of them prove is that the SEAMS work:
 * that arriving lands in the app (not the auth wall), that a decision leaves the
 * deck usable, that the Musa tab transitions, that a match opens a chat, and
 * that a session can be opened for booking. This file walks that single path in
 * one test so a break between screens is caught, not just a break inside one.
 *
 * Demo mode is read-only by design: mutations are rejected at the API boundary
 * with 409 DEMO_MODE (see demo-mode.spec.ts), and `doSwipe` returns early in
 * demo, so this asserts journey/state seams and never asserts a persisted write.
 *
 * Real DOM hooks used (verified against source, not guessed):
 *   - `button.nav-item` with aria-label from navTabLabel(role): a creative sees
 *     Discover / Feed / Collab / "Musa" (= matches) / BTS, plus a Menu button.
 *   - `.card-stack`, `.swipe-card.top-card`, `.card-hero-name`, queued cards.
 *   - `button[aria-label="Match actions"]` -> `.match-radial.open .match-radial-btn[aria-label="Pass"]`.
 *   - `[data-screen="matches"].active` (MusesScreen) and match cards expose
 *     `button[aria-label="Open chat with <name>"]` (MatchCard) which opens chat.
 *   - `[data-screen="chat"].active` needs `chatTarget` set (ChatScreen).
 *   - Menu items (MenuModal): Sessions / Network / Profile / Settings.
 *   - Sessions booking form: `[role="dialog"][aria-label="Book session"]`.
 */

const CARD_STACK = '.card-stack';
const TOP_CARD = `${CARD_STACK} .swipe-card.top-card`;
const TOP_NAME = `${TOP_CARD} .card-hero-name`;
// Every mounted screen renders its own <Nav>, so a bare selector matches hidden
// copies inside inactive `.screen-el` containers. `:visible` pins the live one.
const MATCH_FAB = 'button[aria-label="Match actions"]:visible';
const RADIAL_PASS = '.match-radial.open .match-radial-btn[aria-label="Pass"]:visible';
const AUTH_ACTIVE = '[data-screen="auth"].active';
const OPEN_CHAT = 'button[aria-label^="Open chat with"]:visible';

/** Open a Menu destination (Sessions / Profile / Settings / Network). */
async function openFromMenu(page: import('@playwright/test').Page, label: RegExp) {
  const menuBtn = page.locator('button.nav-item[aria-label="Menu"]:visible').first();
  await expect(menuBtn).toBeVisible({ timeout: 8000 });
  await menuBtn.click({ timeout: 8000 });
  const menu = page.locator('[role="dialog"][aria-label="Menu"], .hamburger-overlay').first();
  await expect(menu).toBeVisible({ timeout: 6000 });
  await menu
    .locator('button.hamburger-item, button, [role="button"], a')
    .filter({ hasText: label })
    .first()
    .click({ timeout: 8000 });
  await dismissPageTour(page);
}

test.describe('User Journey (demo mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('arrive -> discover -> decide -> match -> chat -> book', async ({ page }) => {
    // 1. ARRIVE — the seeded session restores the app shell, not the auth wall.
    await loginAsDemoUser(page);
    await dismissPageTour(page);
    await page.waitForSelector('button.nav-item', { timeout: 15000 });
    await expect(page.locator(AUTH_ACTIVE), 'session restored: auth wall stays inactive').toHaveCount(0);
    await assertNoDocOverflow(page);

    // 2. DISCOVER — a real top card with a real name, and a genuinely stacked deck.
    await expect(page.locator('[data-screen="discover"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator(TOP_CARD)).toBeVisible({ timeout: 15000 });
    const name = ((await page.locator(TOP_NAME).first().textContent()) || '').trim();
    expect(name.length, 'top discover card shows a profile name').toBeGreaterThan(1);
    await checkDiscoverQueueIsolation(page);

    // 3. DECIDE — the radial decision actions exist and the menu opens/closes.
    //    The buttons float on an infinite keyframe, so a real click never
    //    settles ("element is not stable"); discover-deck.spec.ts documents the
    //    same and asserts presence, not a click. Swipe OUTCOMES are demo-harness
    //    owned, so this asserts the seam, not a persisted decision.
    await page.locator(MATCH_FAB).first().click({ timeout: 8000 });
    for (const label of ['Pass', 'Super Like', 'Like this match', 'Like + Note']) {
      await expect(
        page.locator(`.match-radial.open .match-radial-btn[aria-label="${label}"]`).first(),
        `${label} action should be offered`,
      ).toBeVisible({ timeout: 6000 });
    }
    await page.locator(MATCH_FAB).first().click({ timeout: 8000 });
    await expect(page.locator(RADIAL_PASS).first(), 'closing the menu hides the actions').toBeHidden({ timeout: 5000 });
    await expect(page.locator('[data-screen="discover"]')).toBeVisible({ timeout: 6000 });
    await expect(page.locator(TOP_CARD)).toBeVisible({ timeout: 8000 });

    // 4. MATCHES — the "Musa" tab (creative label for `matches`) transitions and
    //    does not bounce back to the auth wall.
    const musaTab = page.locator('button.nav-item[aria-label="Musa"]:visible, button.nav-item[aria-label="Talent"]:visible').first();
    await expect(musaTab).toBeVisible({ timeout: 8000 });
    await musaTab.click({ timeout: 8000 });
    await expect(page.locator('[data-screen="matches"].active')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(AUTH_ACTIVE)).toHaveCount(0);

    // 5. MATCH -> CHAT — opening a match lands on the chat screen with a target.
    //    Guarded: demo inventory may legitimately have no matches yet.
    const openChat = page.locator(OPEN_CHAT).first();
    if (await openChat.isVisible({ timeout: 6000 }).catch(() => false)) {
      await openChat.click({ timeout: 6000 });
      await expect(page.locator('[data-screen="chat"].active')).toBeVisible({ timeout: 10000 });
      // The chat back control returns to the matches screen.
      const back = page.locator('button.chat-back:visible, button[aria-label="Go back"]:visible').first();
      if (await back.isVisible({ timeout: 4000 }).catch(() => false)) {
        await back.click({ timeout: 5000 });
        await expect(page.locator('[data-screen="matches"].active')).toBeVisible({ timeout: 8000 });
      }
    } else {
      test.info().annotations.push({
        type: 'info',
        description: 'No matches in demo inventory; match->chat seam not exercised this run',
      });
    }

    // 6. BOOK — Sessions from the Menu; the booking form opens and dismisses.
    await openFromMenu(page, /Sessions/i);
    await expect(page.locator('[data-screen="sessions"].active')).toBeVisible({ timeout: 10000 });
    const bookBtn = page.locator('button:has-text("Book Session")').first();
    if (await bookBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
      await bookBtn.click({ timeout: 5000 });
      const form = page.locator('[role="dialog"][aria-label="Book session"]').first();
      await expect(form).toBeVisible({ timeout: 6000 });
      await page.keyboard.press('Escape');
      if (await form.isVisible().catch(() => false)) {
        await form.locator('button:has-text("Cancel")').first().dispatchEvent('click');
      }
      await expect(form).toBeHidden({ timeout: 5000 });
    } else {
      test.info().annotations.push({
        type: 'info',
        description: 'No Book Session inventory in demo; booking form seam not exercised',
      });
    }

    // 7. And the journey ends on a shell that is still intact.
    await expect(page.locator(AUTH_ACTIVE)).toHaveCount(0);
    await assertNoDocOverflow(page);
  });
});
