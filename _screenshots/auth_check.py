"""Take screenshots of Muse app at various states."""
from playwright.sync_api import sync_playwright
import time, os

OUT = r"V:\Muse\_screenshots"
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto("https://muse.wyzdesign.com", wait_until="domcontentloaded", timeout=30000)
    time.sleep(8)

    # Check for input fields
    inputs = page.locator("input")
    print(f"Input count: {inputs.count()}")
    for i in range(min(inputs.count(), 5)):
        inp = inputs.nth(i)
        print(f"  Input {i}: type={inp.get_attribute('type')}, placeholder={inp.get_attribute('placeholder')}")

    # Check for buttons
    buttons = page.locator("button")
    print(f"Button count: {buttons.count()}")
    for i in range(min(buttons.count(), 10)):
        btn = buttons.nth(i)
        text = btn.inner_text()
        if text.strip():
            print(f'  Button {i}: "{text.strip()[:50]}"')

    # Full page screenshot
    page.screenshot(path=f"{OUT}/02_full_auth.png", full_page=True)
    print("Full auth page captured")

    # Try scrolling down
    page.evaluate("window.scrollTo(0, 600)")
    time.sleep(1)
    page.screenshot(path=f"{OUT}/03_scrolled.png")
    print("Scrolled view captured")

    browser.close()
