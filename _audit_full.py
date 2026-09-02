from playwright.sync_api import sync_playwright

def login(page):
    page.goto("https://muse.wyzdesign.com/muse", timeout=30000)
    page.wait_for_timeout(3000)
    page.locator("button", has_text="Log In").first.click()
    page.wait_for_timeout(300)
    page.locator('input[type="email"]').fill("test_audit_99@muse.dev")
    page.locator('input[type="password"]').fill("AuditTest99!")
    page.wait_for_timeout(300)
    page.locator("button", has_text="Log In").last.click()
    page.wait_for_timeout(5000)
    later = page.locator("button", has_text="Later")
    if later.count() > 0:
        later.first.click()
        page.wait_for_timeout(1000)

def shot(page, name):
    page.screenshot(path=f"screenshot_{name}.png")
    print(f"[OK] {name}")

def open_menu(page):
    btns = page.locator("button[aria-label='Menu']")
    for i in range(btns.count()):
        if btns.nth(i).is_visible():
            btns.nth(i).click()
            page.wait_for_timeout(1500)
            return
    print("[WARN] No visible Menu button")

def close_hamburger_full(page):
    """Close hamburger overlay completely via JS evaluate."""
    page.evaluate("""() => {
        const overlay = document.querySelector('.hamburger-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.style.pointerEvents = 'none';
        }
        const backdrop = document.querySelector('.hamburger-backdrop');
        if (backdrop) backdrop.click();
    }""")
    page.wait_for_timeout(600)
    # Also try Escape
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)

def nav_to(page, label):
    """Navigate via bottom nav bar by aria-label."""
    btn = page.locator(f"button[aria-label='{label}']")
    for i in range(btn.count()):
        if btn.nth(i).is_visible():
            btn.nth(i).click()
            page.wait_for_timeout(2000)
            return
    print(f"[WARN] Nav button '{label}' not found")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 430, "height": 932})
    login(page)

    # 1. Discover (default screen)
    shot(page, "01_discover")

    # 2. Sessions — via hamburger menu (closes overlay on click)
    open_menu(page)
    page.locator(".hamburger-item", has_text="Sessions").first.click()
    page.wait_for_timeout(2000)
    shot(page, "02_sessions")

    # 3. Network — via hamburger menu
    open_menu(page)
    page.locator(".hamburger-item", has_text="Network").first.click()
    page.wait_for_timeout(2000)
    shot(page, "03_network")

    # 4. Profile — via hamburger menu (overlay stays open)
    open_menu(page)
    page.locator(".hamburger-item", has_text="Profile").first.click()
    page.wait_for_timeout(2000)
    shot(page, "04_profile_menu")
    close_hamburger_full(page)

    # 5. Settings — via hamburger menu (overlay stays open)
    open_menu(page)
    page.locator(".hamburger-item", has_text="Settings").first.click()
    page.wait_for_timeout(2000)
    shot(page, "05_settings")
    close_hamburger_full(page)

    # 6. BTS — bottom nav
    nav_to(page, "BTS")
    shot(page, "06_bts")

    # 7. Feed — bottom nav
    nav_to(page, "Feed")
    shot(page, "07_feed")

    # 8. Collab — bottom nav
    nav_to(page, "Collab")
    shot(page, "08_collab")

    # 9. Muses — bottom nav
    nav_to(page, "Muses")
    shot(page, "09_muses")

    # 10. Desktop
    page2 = browser.new_page(viewport={"width": 1440, "height": 900})
    login(page2)
    shot(page2, "10_desktop")

    browser.close()
    print("\nDone - 10 screenshots")
