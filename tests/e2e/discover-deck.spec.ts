import { test, expect } from '../fixtures/test-fixtures';
import { loginAsDemoUser, checkDiscoverQueueIsolation } from '../helpers/test-helpers';

test.describe('Discover Deck', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.waitForSelector('[data-screen="discover"], .discover-screen', { timeout: 10000 });
  });

  test('Deck renders with queued cards', async ({ page }) => {
    const queuedCards = page.locator('[data-queued="true"], [aria-hidden="true"][data-card-index]');
    await expect(queuedCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('Queued cards are aria-hidden and inert', async ({ page }) => {
    await checkDiscoverQueueIsolation(page);
  });

  test('Swipe left triggers pass animation', async ({ page }) => {
    const card = page.locator('[data-card-index="0"], .discover-card').first();
    await card.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator('[data-animation="pass"], .swipe-animation')).toBeVisible({ timeout: 2000 });
  });

  test('Swipe right triggers like animation', async ({ page }) => {
    const card = page.locator('[data-card-index="0"], .discover-card').first();
    await card.hover();
    await page.mouse.down();
    await page.mouse.move(-100, 0, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator('[data-animation="like"], .swipe-animation')).toBeVisible({ timeout: 2000 });
  });

  test('Super like button works', async ({ page }) => {
    const superBtn = page.locator('[data-super-like], button[aria-label*="Super"]').first();
    await expect(superBtn).toBeVisible();
    await superBtn.click();
    await expect(page.locator('[data-animation="super"], .swipe-animation')).toBeVisible({ timeout: 2000 });
  });

  test('Filter modal opens and closes', async ({ page }) => {
    const filterBtn = page.locator('[data-open-filter], button[aria-label*="Filter"]').first();
    await filterBtn.click();
    await expect(page.locator('[role="dialog"][aria-label*="Filter"], .filter-modal')).toBeVisible();
    
    const closeBtn = page.locator('[aria-label="Close"], [data-close-filter]').first();
    await closeBtn.click();
    await expect(page.locator('[role="dialog"][aria-label*="Filter"], .filter-modal')).toBeHidden();
  });

  test('Distance slider updates', async ({ page }) => {
    const filterBtn = page.locator('[data-open-filter], button[aria-label*="Filter"]').first();
    await filterBtn.click();
    
    const distanceSlider = page.locator('input[type="range"][aria-label*="Distance"]').first();
    await distanceSlider.fill('50');
    
    const applyBtn = page.locator('[data-apply-filter], button:has-text("Apply")').first();
    await applyBtn.click();
    
    await expect(page.locator('[data-distance-display], .distance-value')).toContainText('50');
  });

  test('Age range sliders work', async ({ page }) => {
    const filterBtn = page.locator('[data-open-filter], button[aria-label*="Filter"]').first();
    await filterBtn.click();
    
    const ageMin = page.locator('input[type="range"][aria-label*="Minimum age"]').first();
    const ageMax = page.locator('input[type="range"][aria-label*="Maximum age"]').first();
    
    await ageMin.fill('25');
    await ageMax.fill('40');
    
    const applyBtn = page.locator('[data-apply-filter], button:has-text("Apply")').first();
    await applyBtn.click();
    
    await expect(page.locator('[data-age-display], .age-range')).toContainText('25');
  });

  test('Gender selector works', async ({ page }) => {
    const filterBtn = page.locator('[data-open-filter], button[aria-label*="Filter"]').first();
    await filterBtn.click();
    
    const genderBtn = page.locator('[role="button"][aria-pressed="false"]:has-text("Women"), [role="button"][aria-pressed="false"]:has-text("Men")').first();
    await genderBtn.click();
    
    await expect(genderBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('Save search works in demo mode', async ({ page }) => {
    const saveBtn = page.locator('[data-save-search], button:has-text("Save")').first();
    await saveBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/saved|demo/i);
  });

  test('Keyboard navigation works', async ({ page }) => {
    await page.keyboard.press('Tab');
    const firstFocusable = page.locator(':focus');
    await expect(firstFocusable).toBeVisible();
    
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-animation="pass"], .swipe-animation')).toBeVisible({ timeout: 2000 });
  });

  test('Escape closes modals', async ({ page }) => {
    const filterBtn = page.locator('[data-open-filter], button[aria-label*="Filter"]').first();
    await filterBtn.click();
    await expect(page.locator('[role="dialog"][aria-label*="Filter"], .filter-modal')).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"][aria-label*="Filter"], .filter-modal')).toBeHidden();
  });

  test('Photo carousel swipe works', async ({ page }) => {
    const card = page.locator('[data-card-index="0"], .discover-card').first();
    const photo = card.locator('img, [data-photo]').first();
    
    if (await photo.isVisible({ timeout: 2000 })) {
      await photo.hover();
      await page.mouse.down();
      await page.mouse.move(0, -100, { steps: 10 });
      await page.mouse.up();
      
      await expect(page.locator('[data-photo-index="1"], .photo-carousel:has-text("1/")')).toBeVisible({ timeout: 2000 });
    }
  });

  test('Profile preview opens and closes', async ({ page }) => {
    const card = page.locator('[data-card-index="0"], .discover-card').first();
    const nameBtn = card.locator('[data-profile-name], [data-open-profile]').first();
    await nameBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Profile"], .profile-modal')).toBeVisible({ timeout: 3000 });
    
    const closeBtn = page.locator('[aria-label="Close"], [data-close-profile]').first();
    await closeBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Profile"], .profile-modal')).toBeHidden();
  });

  test('Like with note modal works', async ({ page }) => {
    const card = page.locator('[data-card-index="0"], .discover-card').first();
    const likeNoteBtn = card.locator('[data-like-note], button:has-text("Like with Note")').first();
    await likeNoteBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Like"], .like-note-modal')).toBeVisible({ timeout: 3000 });
    
    const textarea = page.locator('textarea[aria-label*="Note"]').first();
    await textarea.fill('Great profile!');
    
    const sendBtn = page.locator('[data-send-like-note], button:has-text("Send")').first();
    await sendBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/sent|demo/i);
  });
});