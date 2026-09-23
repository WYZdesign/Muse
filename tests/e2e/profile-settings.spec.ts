import { test, expect } from '../fixtures/test-fixtures';
import { loginAsDemoUser } from '../helpers/test-helpers';

test.describe('Profile Screen', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.click('[data-tab="profile"], [data-screen="profile"]');
    await page.waitForSelector('[data-screen="profile"], .profile-screen', { timeout: 5000 });
  });

  test('Profile displays correctly', async ({ page }) => {
    await expect(page.locator('[data-profile-name], .profile-name')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-profile-avatar], .profile-avatar')).toBeVisible();
    await expect(page.locator('[data-profile-bio], .profile-bio')).toBeVisible();
  });

  test('Edit profile opens modal', async ({ page }) => {
    const editBtn = page.locator('[data-edit-profile], button[aria-label*="Edit"]').first();
    await editBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Edit"], .edit-profile-modal')).toBeVisible({ timeout: 3000 });
  });

  test('Edit profile saves in demo mode', async ({ page }) => {
    const editBtn = page.locator('[data-edit-profile], button[aria-label*="Edit"]').first();
    await editBtn.click();
    
    const nameInput = page.locator('input[aria-label*="Name"], input[placeholder*="Name"]').first();
    await nameInput.fill('Updated Name');
    
    const saveBtn = page.locator('[data-save-profile], button:has-text("Save")').first();
    await saveBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/saved|demo/i);
  });

  test('Portfolio tab works', async ({ page }) => {
    const portfolioTab = page.locator('[data-portfolio-tab], [role="tab"]:has-text("Portfolio")').first();
    await portfolioTab.click();
    
    await expect(page.locator('[data-portfolio-grid], .portfolio-grid')).toBeVisible({ timeout: 3000 });
  });

  test('Add portfolio item works in demo mode', async ({ page }) => {
    const portfolioTab = page.locator('[data-portfolio-tab], [role="tab"]:has-text("Portfolio")').first();
    await portfolioTab.click();
    
    const addBtn = page.locator('[data-add-portfolio], button:has-text("Add")').first();
    await addBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Portfolio"], .portfolio-modal')).toBeVisible({ timeout: 3000 });
    
    const titleInput = page.locator('input[aria-label*="Title"], input[placeholder*="Title"]').first();
    await titleInput.fill('Test Portfolio');
    
    const saveBtn = page.locator('[data-save-portfolio], button:has-text("Save")').first();
    await saveBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/saved|demo/i);
  });

  test('Share profile works', async ({ page }) => {
    const shareBtn = page.locator('[data-share-profile], button[aria-label*="Share"]').first();
    await shareBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Share"], .share-modal')).toBeVisible({ timeout: 3000 });
  });

  test('Report user works', async ({ page }) => {
    const reportBtn = page.locator('[data-report-user], button[aria-label*="Report"]').first();
    await reportBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Report"], .report-modal')).toBeVisible({ timeout: 3000 });
  });

  test('Block user works in demo mode', async ({ page }) => {
    const blockBtn = page.locator('[data-block-user], button[aria-label*="Block"]').first();
    await blockBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Block"], .block-modal')).toBeVisible({ timeout: 3000 });
    
    const confirmBtn = page.locator('[data-confirm-block], button:has-text("Block")').first();
    await confirmBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/blocked|demo/i);
  });
});

test.describe('Settings Screen', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.click('[data-tab="settings"], [data-screen="settings"]');
    await page.waitForSelector('[data-screen="settings"], .settings-screen', { timeout: 5000 });
  });

  test('Settings categories visible', async ({ page }) => {
    const categories = page.locator('[data-settings-category], .settings-category, [role="tab"]');
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Notifications settings work', async ({ page }) => {
    const notifToggle = page.locator('[data-notif-toggle], input[type="checkbox"][aria-label*="Notification"]').first();
    await notifToggle.click();
    await expect(notifToggle).toBeChecked();
  });

  test('Discovery preferences work', async ({ page }) => {
    const distanceSlider = page.locator('input[type="range"][aria-label*="Distance"]').first();
    await distanceSlider.fill('75');
    
    const applyBtn = page.locator('[data-apply-discovery], button:has-text("Save")').first();
    await applyBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/saved|demo/i);
  });

  test('Theme selector works', async ({ page }) => {
    const themeBtn = page.locator('[data-theme-selector], button[aria-label*="Theme"]').first();
    await themeBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Theme"], .theme-modal')).toBeVisible({ timeout: 3000 });
  });

  test('Connected accounts section visible', async ({ page }) => {
    await expect(page.locator('[data-connected-accounts], .connected-accounts')).toBeVisible({ timeout: 3000 });
  });

  test('Privacy policy link works', async ({ page }) => {
    const privacyLink = page.locator('[data-privacy-link], a:has-text("Privacy")').first();
    await privacyLink.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Privacy"], .privacy-modal, [data-screen="privacy"]')).toBeVisible({ timeout: 5000 });
  });

  test('Terms of service link works', async ({ page }) => {
    const termsLink = page.locator('[data-terms-link], a:has-text("Terms")').first();
    await termsLink.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Terms"], .terms-modal, [data-screen="terms"]')).toBeVisible({ timeout: 5000 });
  });

  test('Delete account flow works in demo mode', async ({ page }) => {
    const deleteBtn = page.locator('[data-delete-account], button:has-text("Delete Account")').first();
    await deleteBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Delete"], .delete-modal')).toBeVisible({ timeout: 3000 });
    
    const confirmBtn = page.locator('[data-confirm-delete], button:has-text("Delete")').first();
    await confirmBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/deleted|demo/i);
  });

  test('Payment history accessible', async ({ page }) => {
    const paymentsBtn = page.locator('[data-payment-history], button:has-text("Payment")').first();
    await paymentsBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Payment"], .payment-modal')).toBeVisible({ timeout: 3000 });
  });

  test('Referral section visible', async ({ page }) => {
    const referralBtn = page.locator('[data-referral], button:has-text("Referral")').first();
    await referralBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Referral"], .referral-modal')).toBeVisible({ timeout: 3000 });
  });

  test('Daily login streak visible', async ({ page }) => {
    const streakBtn = page.locator('[data-daily-login], button:has-text("Streak")').first();
    await streakBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Streak"], .streak-modal')).toBeVisible({ timeout: 3000 });
  });
});