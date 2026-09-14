# TORREE'S COMPREHENSIVE TASK LIST — 2026-09-14

**Priority: CRITICAL (breaking features) → HIGH (visibility) → MEDIUM (UX) → LOW (polish)**

---

## CRITICAL — Breaking Features

### C1. Age verification says "invalid token"
- The verification endpoint returns 500/invalid token
- Check if this is related to our column restoration or a separate auth issue
- Verify the Stripe Identity session creation works

### C2. 2FA says "invalid token"
- Similar to C1 — MFA endpoint returning invalid token
- Check if this is a Supabase auth issue or Stripe issue

### C3. Stripe connect says "unauthorized"
- Connected accounts flow broken
- Check Stripe OAuth flow in `social/callback/route.ts`

### C4. NSFW toggle should trigger age verification popup
- When user toggles NSFW on profile page, if not age verified, show age verification popup
- Currently just sets the flag without verification

---

## HIGH — Light Mode Visibility (ALL must be fixed)

### H1. All buttons, badges, icons with dark text need dark border/outline on light mode
- Every element with dark text on light background needs a visible border
- Check: buttons, badges, icons, pills, chips across ALL screens

### H2. Light mode no pastel colors unless border/outline/stroke is dark
- Cream/bright buttons, badges, icons must have dark stroke on light themes
- Applies to ALL light themes (sunrise, daylight, etc.)

### H3. Prompt bank popup invisible on light mode
- Settings → Prompt Bank button → popup has light fill + light stroke
- Buttons and text invisible

### H4. Safety center popup invisible on light mode
- Same issue as H3

### H5. Badge popups dark on light mode
- When tapping badges, popup is dark with dark text
- Should match theme

### H6. 3-dot button on muses page match chat - dark on light mode
- Top right of chat in muses page
- Should match theme

### H7. All settings popups/modals need light mode audit
- Every popup menu on settings page must be legible
- Check: Prompt Bank, Safety Center, Personality Profile, Creative Profile, Connected Accounts, Legal

### H8. Daily streak module needs dark border on light themes
- The flame icon doesn't show on light mode
- Module needs dark border/stroke

### H9. Quests flame not showing on light mode
- Only shows when collapsing/expanding daily streak widget
- Should always be visible

---

## MEDIUM — Visual/UX

### M1. Waves at bottom of EVERY page
- Currently only on splash
- Should be at bottom of all pages with sprites/animations
- Waves should move side to side AND up and down
- Smooth, fluid movement like tides
- X-axis straight across (not diagonal)
- Each row different wave pattern
- Each hump in each row animates up and down
- Super immersive movement

### M2. Stars should be white/variations of white
- Not dark dots on light mode
- Twinkle more like anime (faster, more varied)
- Randomly spread across entire top half
- Varying brightnesses
- NOT in a line — randomly distributed
- Strategic random spread, not bunched together

### M3. Nebulas and aurora clouds at top of every page
- Should be visible on all themes
- Full vibrancy at 0% background, 100% sprites

### M4. Sunrise and day light themes too similar
- Make them more different
- All themes should be totally unique

### M5. Profile info section 85% opacity when scrolling down on discover
- Background of profile info when scrolling on match card
- Applies to all themes

### M6. Move % match badge to top left of card
- On discover page match cards

### M7. Remove redundant search button on discover
- When pressing search button, remove the redundant one

### M8. Map should show studio markers
- When tapping map button on discover
- Should show actual studio locations
- Like Google Maps with markers

### M9. Constellations on splash
- 2-3 constellations in nebula clouds
- Subtle, not too much

### M10. Birds on splash
- Add birds to animation
- 15% more when first opening

### M11. Verify now button slide animation
- Should slide up from bottom nav
- When closed, reverse and slide down
- Smooth animation

### M12. Images should handle broad dimensions
- Users upload various dimensions/types/resolution
- Format/adjust on upload for best quality
- Sharp and clean

### M13. Horizontal filter bar arrows
- Align horizontally with filter button text
- Decrease side arrows by 15%

### M14. BTS page horizontal scroll bar
- Tight around buttons
- Not offcentered or too big
- Dark stroke on light modes

### M15. Hamburger menu bell notification bubble
- Top right corner of bell icon
- Red dot only (no stroke, no number)

### M16. Gradient animations fill containers
- Gradients should fully stretch inside elements
- No visible edges/behind when sliding

### M17. Web app viewport filling
- Entire viewport filled correctly dynamically
- Nothing cropped outside
- Not too much padding inside

---

## LOW — Feature Completion

### L1. Personality profile popup
- Links to take test/calculator for each trait
- If user doesn't know their type

### L2. Creative profile popup
- Options should be role-specific (Muse vs Creative)
- Users can add new options
- Admin can approve/deny/edit on backend

### L3. Portfolio settings fully functional
- Build, test, troubleshoot

### L4. Availability fully functional
- Build, test, troubleshoot

### L5. Rate settings fully functional
- Build, test, troubleshoot

### L6. Connected accounts fully functional
- Wire up all connections
- Test and troubleshoot

### L7. Legal buttons should open popups
- Not navigate to new page
- Popup-style modal

### L8. Collab/booking differentiation
- Apply = free, approval-based
- Book = paid, instant
- Screening process before booking

### L9. Admin panel expansion
- More active, passive, analytical, logistical capabilities
- Moderation and facilitation tools
- Can do things, not just see things

### L10. Muse Oracle
- AI assistant with all Muse-related info
- Admin should have their own

### L11. Admin panel title
- Just say "ADMIN PANEL" at top

---

## NOTES FROM WYZMIND
- Voice to chat (token needed)
- Other unfinished tasks need cross-reference with frontend/backend
