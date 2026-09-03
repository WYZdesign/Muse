from playwright.sync_api import sync_playwright

EMAIL = "test_audit_99@muse.dev"
PASS = "AuditTest99!"
BASE = "https://muse.wyzdesign.com/muse"

def login(page):
    page.goto(BASE, timeout=30000)
    page.wait_for_timeout(3000)
    page.locator("button", has_text="Log In").first.click()
    page.wait_for_timeout(300)
    page.locator('input[type="email"]').fill(EMAIL)
    page.locator('input[type="password"]').fill(PASS)
    page.wait_for_timeout(300)
    page.locator("button", has_text="Log In").last.click()
    page.wait_for_timeout(5000)
    later = page.locator("button", has_text="Later")
    if later.count() > 0:
        later.first.click()
        page.wait_for_timeout(1000)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 430, "height": 932})
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    login(page)

    # 1. App booted + reached an authenticated screen (Discover has match-card content)
    booted = page.locator(".screen-el.active").count() > 0
    print("AUTH BOOT:", "OK" if booted else "FAIL")

    # 2. Bottom nav present (Nav.tsx rendered) — proves React mounted
    nav = page.locator("button[aria-label='Discover']").count() > 0
    print("NAV RENDER:", "OK" if nav else "FAIL")

    # 3. Navigate to Profile -> hamburger menu -> Profile
    menu = page.locator("button[aria-label='Menu']")
    for i in range(menu.count()):
        if menu.nth(i).is_visible():
            menu.nth(i).click()
            page.wait_for_timeout(1200)
            break
    page.locator(".hamburger-item", has_text="Profile").first.click()
    page.wait_for_timeout(2000)
    page.screenshot(path="screenshot_profile_live.png")
    print("PROFILE SHOT: captured")

    # 4. Assert status pill area renders (member-since header present on Profile)
    has_header = page.locator(".profile-name").count() > 0
    print("PROFILE HEADER:", "OK" if has_header else "FAIL")

    # 5. Feed nav tab present
    feed_tab = page.locator("button[aria-label='Feed']").count() > 0
    print("FEED TAB:", "OK" if feed_tab else "FAIL")

    print("CONSOLE ERRORS:", len(errors))
    for e in errors[:5]:
        print("  [err]", e)
    browser.close()
    print("\nDONE")
