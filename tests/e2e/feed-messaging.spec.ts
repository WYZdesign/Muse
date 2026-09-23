import { test, expect } from '../fixtures/test-fixtures';
import { loginAsDemoUser } from '../helpers/test-helpers';

test.describe('Feed Screen', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.click('[data-tab="feed"], [data-screen="feed"]');
    await page.waitForSelector('[data-screen="feed"], .feed-screen', { timeout: 5000 });
  });

  test('Feed loads and displays posts', async ({ page }) => {
    const posts = page.locator('[data-feed-post], .feed-post, [data-post-id]');
    await expect(posts.first()).toBeVisible({ timeout: 5000 });
  });

  test('Create post works', async ({ page }) => {
    const composer = page.locator('[data-feed-composer], .feed-composer').first();
    await expect(composer).toBeVisible();
    
    const textarea = composer.locator('textarea[aria-label*="Post"], textarea[placeholder*="What"]').first();
    await textarea.fill('Test post from Playwright');
    
    const postBtn = composer.locator('[data-post-button], button:has-text("Post")').first();
    await postBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/posted|demo/i);
  });

  test('Like post works', async ({ page }) => {
    const post = page.locator('[data-feed-post], .feed-post').first();
    const likeBtn = post.locator('[data-like-post], button[aria-label*="Like"]').first();
    await likeBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/liked|demo/i);
  });

  test('Comment on post works', async ({ page }) => {
    const post = page.locator('[data-feed-post], .feed-post').first();
    const commentBtn = post.locator('[data-comment-post], button[aria-label*="Comment"]').first();
    await commentBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Comments"], .comments-modal')).toBeVisible({ timeout: 3000 });
    
    const commentInput = page.locator('textarea[aria-label*="Comment"], input[placeholder*="Comment"]').first();
    await commentInput.fill('Test comment');
    
    const sendBtn = page.locator('[data-send-comment], button:has-text("Post")').first();
    await sendBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/comment|demo/i);
  });

  test('Share post works', async ({ page }) => {
    const post = page.locator('[data-feed-post], .feed-post').first();
    const shareBtn = post.locator('[data-share-post], button[aria-label*="Share"]').first();
    await shareBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Share"], .share-modal')).toBeVisible({ timeout: 3000 });
  });

  test('Filter by type works', async ({ page }) => {
    const filterBtns = page.locator('[role="button"][aria-pressed]');
    const firstFilter = filterBtns.first();
    await firstFilter.click();
    await expect(firstFilter).toHaveAttribute('aria-pressed', 'true');
  });

  test('Feed infinite scroll loads more', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const posts = page.locator('[data-feed-post], .feed-post');
    const count = await posts.count();
    expect(count).toBeGreaterThan(1);
  });
});

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.click('[data-tab="messages"], [data-screen="chat"]');
    await page.waitForSelector('[data-screen="chat"], .chat-screen', { timeout: 5000 });
  });

  test('Chat list loads', async ({ page }) => {
    const chats = page.locator('[data-chat-item], .chat-item, [data-match-chat]');
    await expect(chats.first()).toBeVisible({ timeout: 5000 });
  });

  test('Open chat works', async ({ page }) => {
    const chat = page.locator('[data-chat-item], .chat-item').first();
    await chat.click();
    
    await expect(page.locator('[data-chat-screen], .chat-detail-screen')).toBeVisible({ timeout: 3000 });
  });

  test('Send message works', async ({ page }) => {
    const chat = page.locator('[data-chat-item], .chat-item').first();
    await chat.click();
    
    const input = page.locator('textarea[aria-label*="Message"], input[placeholder*="Message"]').first();
    await input.fill('Hello from Playwright');
    
    const sendBtn = page.locator('[data-send-message], button[aria-label*="Send"]').first();
    await sendBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/sent|demo/i);
  });

  test('Voice note button visible', async ({ page }) => {
    const chat = page.locator('[data-chat-item], .chat-item').first();
    await chat.click();
    
    const voiceBtn = page.locator('[data-voice-note], button[aria-label*="Voice"]').first();
    await expect(voiceBtn).toBeVisible();
  });

  test('Video call button visible', async ({ page }) => {
    const chat = page.locator('[data-chat-item], .chat-item').first();
    await chat.click();
    
    const videoBtn = page.locator('[data-video-call], button[aria-label*="Video"]').first();
    await expect(videoBtn).toBeVisible();
  });

  test('Unmatch works in demo mode', async ({ page }) => {
    const chat = page.locator('[data-chat-item], .chat-item').first();
    await chat.click();
    
    const menuBtn = page.locator('[data-chat-menu], button[aria-label*="Menu"]').first();
    await menuBtn.click();
    
    const unmatchBtn = page.locator('[data-unmatch], button:has-text("Unmatch")').first();
    await unmatchBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Unmatch"], .unmatch-modal')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Collab/Briefs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.click('[data-tab="briefs"], [data-screen="briefs"]');
    await page.waitForSelector('[data-screen="briefs"], .briefs-screen', { timeout: 5000 });
  });

  test('Briefs list loads', async ({ page }) => {
    const briefs = page.locator('[data-brief-item], .brief-item, [data-collab-brief]');
    await expect(briefs.first()).toBeVisible({ timeout: 5000 });
  });

  test('Create brief works in demo mode', async ({ page }) => {
    const createBtn = page.locator('[data-create-brief], button:has-text("Create")').first();
    await createBtn.click();
    
    await expect(page.locator('[role="dialog"][aria-label*="Create"], .create-brief-modal')).toBeVisible({ timeout: 3000 });
    
    const titleInput = page.locator('input[aria-label*="Title"], input[placeholder*="Title"]').first();
    await titleInput.fill('Test Brief');
    
    const descInput = page.locator('textarea[aria-label*="Description"], textarea[placeholder*="Description"]').first();
    await descInput.fill('Test description for Playwright test');
    
    const submitBtn = page.locator('[data-submit-brief], button:has-text("Create")').first();
    await submitBtn.click();
    
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/created|demo/i);
  });

  test('Filter by category works', async ({ page }) => {
    const filterBtns = page.locator('[role="button"][aria-pressed]');
    const firstFilter = filterBtns.first();
    await firstFilter.click();
    await expect(firstFilter).toHaveAttribute('aria-pressed', 'true');
  });
});