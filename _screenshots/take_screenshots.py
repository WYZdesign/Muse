"""Take screenshots of Muse app at various states."""
from playwright.sync_api import sync_playwright
import time, os, re

OUT = r"V:\Muse\_screenshots"
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})

    # 1. Auth page
    page.goto("https://muse.wyzdesign.com", wait_until="networkidle", timeout=30000)
    time.sleep(2)
    page.screenshot(path=f"{OUT}/01_auth.png")
    print("1. Auth page captured")

    # 2. Sign in with test account
    # Find email input and fill
    email_input = page.locator("input[type='email']")
    if email_input.count() > 0:
        email_input.fill("torree+test@wyzdesign.com")
        pass_input = page.locator("input[type='password']")
        if pass_input.count() > 0:
            pass_input.fill("Test1234!")
            # Click sign in button
            signin_btn = page.locator("button", has_text=re.compile("Sign (In|in|Up|up)|Log|Enter", re.I))
            if signin_btn.count() > 0:
                signin_btn.first.click()
                time.sleep(5)
                page.screenshot(path=f"{OUT}/02_after_signin.png")
                print("2. After sign-in captured")
                
                # 3. Current screen
                page.screenshot(path=f"{OUT}/03_current_screen.png", full_page=True)
                print("3. Current screen (full page) captured")
    else:
        print("No email input found — auth state may already be logged in")
        page.screenshot(path=f"{OUT}/02_auth_state.png")
    
    browser.close()
    print(f"\nScreenshots saved to {OUT}")
