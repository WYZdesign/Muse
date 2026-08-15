"""Screen extraction v5 — match closing </div> by indentation level."""

import re

FILE = r"V:\Muse\src\app\(muse)\muse\page.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split("\n")
print(f"Original: {len(lines)} lines")

def find_line(text, start=0):
    for i in range(start, len(lines)):
        if text in lines[i]:
            return i
    return -1

def get_indent(line):
    """Get leading whitespace length."""
    return len(line) - len(line.lstrip())

# ═══ STEP 1: Replace hamburger ═══
print("\n=== HAMBURGER ===")
h_start = find_line('{showHamburger && (')
if h_start >= 0:
    depth = 0
    h_end = h_start
    for i in range(h_start, len(lines)):
        for ch in lines[i]:
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        if depth == 0 and i > h_start:
            h_end = i
            break
    
    replacement = (
        '      <MenuModal showHamburger={showHamburger} setShowHamburger={setShowHamburger} '
        'hamburgerScreen={hamburgerScreen} setHamburgerScreen={setHamburgerScreen} '
        'showScreen={showScreen} liveCommunities={liveCommunities} liveEvents={liveEvents} '
        'showNsfw={showNsfw} rsvpdEvents={rsvpdEvents} setRsvpdEvents={setRsvpdEvents} '
        'matches={matches} openChat={openChat} setChatTarget={setChatTarget} '
        'showToast={showToast} handleImgError={handleImgError} setViewProfile={setViewProfile} '
        'currentUser={currentUser} showNewPost={showNewPost} setShowNewPost={setShowNewPost} '
        'newPostTitle={newPostTitle} setNewPostTitle={setNewPostTitle} '
        'newPostBody={newPostBody} setNewPostBody={setNewPostBody} '
        'setForumPosts={setForumPosts} liveForum={liveForum} '
        'forumSort={forumSort} setForumSort={setForumSort} '
        'expandedPost={expandedPost} setExpandedPost={setExpandedPost} '
        'commentText={commentText} setCommentText={setCommentText} '
        'setSupportOpen={setSupportOpen} doLogoutFull={doLogoutFull} '
        'discoveryPrefs={discoveryPrefs} setDiscoveryPrefs={setDiscoveryPrefs} '
        'notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs} '
        'setShowNsfw={setShowNsfw} blockedUsers={blockedUsers} '
        'setScreen={setScreen} setShowAgeVerification={setShowAgeVerification} '
        'apiFetch={apiFetch} authFetch={authFetch} uid={uid} authUser={authUser} />'
    )
    print(f"  Lines {h_start+1}-{h_end+1} ({h_end - h_start + 1} lines)")
    lines[h_start:h_end+1] = [replacement]

# ═══ STEP 2: Replace each screen ═══
screen_defs = [
    ("discover",   'screen==="discover"'),
    ("connections", 'screen==="connections"'),
    ("matches",    'screen==="matches"'),
    ("chat",       'screen==="chat"&&chatTarget'),
    ("briefs",     'screen==="briefs"'),
    ("community",  'screen==="community"'),
    ("sessions",   'screen==="sessions"'),
    ("network",    'screen==="network"'),
    ("portfolio",  'screen==="portfolio"'),
    ("moments",    'screen==="moments"'),
    ("profile",    'screen==="profile"'),
]

components = {
    "discover": '<DiscoverScreen screen={screen} showScreen={showScreen} showNsfw={showNsfw} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} discoveryPrefs={discoveryPrefs} setDiscoveryPrefs={setDiscoveryPrefs} showDiscoveryPrefs={showDiscoveryPrefs} setShowDiscoveryPrefs={setShowDiscoveryPrefs} showFilterModal={showFilterModal} setShowFilterModal={setShowFilterModal} mapView={mapView} setMapView={setMapView} filteredProfiles={filteredProfiles} currentIdx={currentIdx} setCurrentIdx={setCurrentIdx} boostActive={boostActive} setBoostActive={setBoostActive} setBoostEnd={setBoostEnd} discoverSearchOpen={discoverSearchOpen} setDiscoverSearchOpen={setDiscoverSearchOpen} discoverSearch={discoverSearch} setDiscoverSearch={setDiscoverSearch} myGeo={myGeo} apiFetch={apiFetch} showToast={showToast} doSwipe={doSwipe} setViewProfile={setViewProfile} viewProfile={viewProfile} handleImgError={handleImgError} matches={matches} setMatches={setMatches} openChat={openChat} setChatTarget={setChatTarget} stories={stories} currentUser={currentUser} uid={uid} />',
    "connections": '<FeedScreen screen={screen} showScreen={showScreen} feedFilter={feedFilter} setFeedFilter={setFeedFilter} feedText={feedText} setFeedText={setFeedText} feedMedia={feedMedia} setFeedMedia={setFeedMedia} feedPosts={feedPosts} setFeedPosts={setFeedPosts} showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker} showNewPost={showNewPost} setShowNewPost={setShowNewPost} newPostTitle={newPostTitle} setNewPostTitle={setNewPostTitle} newPostBody={newPostBody} setNewPostBody={setNewPostBody} currentUser={currentUser} apiFetch={apiFetch} authFetch={authFetch} showToast={showToast} handleImgError={handleImgError} stories={stories} setStories={setStories} uploadImage={uploadImage} uid={uid} />',
    "matches": '<MusesScreen screen={screen} showScreen={showScreen} matches={matches} setMatches={setMatches} searchOpen={searchOpen} setSearchOpen={setSearchOpen} matchesView={matchesView} setMatchesView={setMatchesView} showLikesYou={showLikesYou} setShowLikesYou={setShowLikesYou} likedBy={likedBy} openChat={openChat} setChatTarget={setChatTarget} apiFetch={apiFetch} showToast={showToast} handleImgError={handleImgError} setViewProfile={setViewProfile} currentUser={currentUser} showNsfw={showNsfw} />',
    "chat": '<ChatScreen screen={screen} chatTarget={chatTarget} setChatTarget={setChatTarget} showScreen={showScreen} messages={messages} setMessages={setMessages} chatText={chatText} setChatText={setChatText} chatImg={chatImg} setChatImg={setChatImg} messagesEndRef={messagesEndRef} sendChat={sendChat} handleImgError={handleImgError} setViewProfile={setViewProfile} setUnmatchTarget={setUnmatchTarget} setBlockTarget={setBlockTarget} setShowReport={setShowReport} setReportTarget={setReportTarget} typingTarget={typingTarget} realtimeStatus={realtimeStatus} sendTyping={sendTyping} />',
    "briefs": '<CollabScreen screen={screen} showScreen={showScreen} museCat={museCat} setMuseCat={setMuseCat} userBriefs={userBriefs} setUserBriefs={setUserBriefs} showPostBrief={showPostBrief} setShowPostBrief={setShowPostBrief} liveBriefs={liveBriefs} showNsfw={showNsfw} currentUser={currentUser} apiFetch={apiFetch} showToast={showToast} uid={uid} />',
    "community": '<CommunityScreen screen={screen} showScreen={showScreen} commTab={commTab} setCommTab={setCommTab} liveCommunities={liveCommunities} liveEvents={liveEvents} showNsfw={showNsfw} rsvpdEvents={rsvpdEvents} setRsvpdEvents={setRsvpdEvents} apiFetch={apiFetch} showToast={showToast} handleImgError={handleImgError} />',
    "sessions": '<SessionsScreen screen={screen} showScreen={showScreen} sessTab={sessTab} setSessTab={setSessTab} matches={matches} setMatches={setMatches} openChat={openChat} setChatTarget={setChatTarget} apiFetch={apiFetch} authFetch={authFetch} showToast={showToast} handleImgError={handleImgError} uid={uid} currentUser={currentUser} setShowAgeVerification={setShowAgeVerification} />',
    "network": '<NetworkScreen screen={screen} showScreen={showScreen} showNsfw={showNsfw} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} matches={matches} apiFetch={apiFetch} showToast={showToast} setViewProfile={setViewProfile} currentUser={currentUser} handleImgError={handleImgError} openChat={openChat} liveForum={liveForum} showNewPost={showNewPost} setShowNewPost={setShowNewPost} newPostTitle={newPostTitle} setNewPostTitle={setNewPostTitle} newPostBody={newPostBody} setNewPostBody={setNewPostBody} setForumPosts={setForumPosts} forumSort={forumSort} setForumSort={setForumSort} forumCategory={forumCategory} uid={uid} />',
    "portfolio": '<PortfolioScreen screen={screen} showScreen={showScreen} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} matches={matches} getAccessToken={getAccessToken} uploadImage={uploadImage} showToast={showToast} />',
    "moments": '<BtsScreen screen={screen} showScreen={showScreen} stories={stories} setStories={setStories} showStory={showStory} setShowStory={setShowStory} currentUser={currentUser} handleImgError={handleImgError} showToast={showToast} />',
    "profile": '<ProfileScreen screen={screen} showScreen={showScreen} currentUser={currentUser} obData={obData} setObData={setObData} isUnlimited={isUnlimited} showUnlimitedBadge={showUnlimitedBadge} setShowUnlimitedBadge={setShowUnlimitedBadge} openHamburger={openHamburger} handleImgError={handleImgError} setShowEditProfile={setShowEditProfile} setEditName={setEditName} setEditBio={setEditBio} setEditLoc={setEditLoc} setEditAvatar={setEditAvatar} showToast={showToast} promptResponses={promptResponses} promptBankData={promptBankData} setShowPromptBank={setShowPromptBank} matches={matches} />',
}

# Process from bottom to top
for name, anchor in reversed(screen_defs):
    print(f"\n=== {name.upper()} ===")
    
    anchor_idx = -1
    for i, line in enumerate(lines):
        if anchor in line and 'screen-el' in line:
            anchor_idx = i
            break
    
    if anchor_idx < 0:
        print(f"  NOT FOUND")
        continue
    
    # Get the indentation of the opening line
    open_indent = get_indent(lines[anchor_idx])
    
    # Find closing </div> at same or lesser indentation
    # Strategy: scan forward, track div depth. When we find a </div> 
    # that brings depth to 0 relative to the opening, that's our close.
    # But since screens are nested, we track absolute depth and look for
    # the </div> that closes THIS specific <div>.
    #
    # Better approach: count ALL div opens/closes from opening line forward.
    # The first time depth returns to 0, we found the close.
    # BUT this fails because of parent divs.
    #
    # REAL approach: find the </div> at the SAME indentation as the opening <div.
    # Screen opening is at ~12 spaces indent. Its closing </div> should be at ~12 spaces.
    # But there are OTHER divs at 12 spaces too (like parent closing divs).
    #
    # BEST approach: just find the NEXT line that starts a new screen or a known delimiter.
    # The closing of the current screen block = the line before the next screen/conditional.
    
    # Find all anchor positions
    all_positions = []
    for n, a in screen_defs:
        for i, line in enumerate(lines):
            if a in line and 'screen-el' in line:
                all_positions.append((i, n))
                break
    
    # Find subscription and settings positions
    sub_pos = find_line('{screen === "subscription" && (')
    settings_pos = find_line('{screen === "settings" && (')
    
    # Sort all positions
    all_positions.sort()
    
    # Find this screen's position in the sorted list
    my_pos_in_list = -1
    for idx, (pos, n) in enumerate(all_positions):
        if n == name:
            my_pos_in_list = idx
            break
    
    if my_pos_in_list < 0:
        print(f"  NOT IN LIST")
        continue
    
    # The end is just before the next item (screen, subscription, or settings)
    # But we need to find the actual </div> that closes this screen block
    # The simplest: find the NEXT sibling screen's start, then go backward to find </div>
    
    next_start = None
    if my_pos_in_list < len(all_positions) - 1:
        next_start = all_positions[my_pos_in_list + 1][0]
    elif sub_pos >= 0:
        next_start = sub_pos
    elif settings_pos >= 0:
        next_start = settings_pos
    
    if next_start is None:
        print(f"  No next delimiter found")
        continue
    
    # From next_start, go backward to find the </div> that closes this screen
    close_idx = next_start - 1
    while close_idx > anchor_idx and '</div>' not in lines[close_idx]:
        close_idx -= 1
    
    if close_idx <= anchor_idx:
        print(f"  Could not find closing div")
        continue
    
    # But we also need to check if there are extra closing divs between screens
    # (like closing the phone div or phone-wrap). Those belong to the parent structure.
    # We only want to replace up to the screen's own </div>.
    # 
    # The screen's closing </div> should be the FIRST </div> going backward from next_start
    # that is at the same or deeper indentation than the opening.
    # Actually, the screen's closing is just the last line before the next screen that
    # contains </div> and is at a deeper or equal indentation.
    
    # Let's just find the last </div> before next_start that's at indent >= open_indent
    close_idx = next_start - 1
    while close_idx > anchor_idx:
        if '</div>' in lines[close_idx] and get_indent(lines[close_idx]) >= open_indent:
            break
        close_idx -= 1
    
    if close_idx <= anchor_idx:
        print(f"  Could not find closing div at indent {open_indent}")
        continue
    
    print(f"  Lines {anchor_idx+1}-{close_idx+1} ({close_idx - anchor_idx + 1} lines) (indent={open_indent})")
    
    comp = components[name]
    lines[anchor_idx:close_idx+1] = [f'            {comp}']
    print(f"  Replaced with component")

# ═══ STEP 3: Replace conditional screens ═══
cond_anchors = [
    ("subscription", '{screen === "subscription" && ('),
    ("settings", '{screen === "settings" && ('),
]

cond_components = {
    "subscription": '{screen === "subscription" && <SubscriptionScreen screen={screen} showScreen={showScreen} currentUser={currentUser} authUser={authUser} userTier={userTier} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} showToast={showToast} />}',
    "settings": '{screen === "settings" && <SettingsScreen screen={screen} showScreen={showScreen} currentUser={currentUser} obData={obData} showNsfw={showNsfw} setShowNsfw={setShowNsfw} notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs} blockedUsers={blockedUsers} setBlockedUsers={setBlockedUsers} obConnectedSocials={obConnectedSocials} toggleSocial={toggleSocial} theme={theme} setTheme={setTheme} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} showToast={showToast} doLogout={doLogout} setShowEditProfile={setShowEditProfile} setEditName={setEditName} setEditBio={setEditBio} setEditLoc={setEditLoc} setEditAvatar={setEditAvatar} setShowNotificationsSettings={setShowNotificationsSettings} showNotificationsSettings={showNotificationsSettings} setShowConnectedAccounts={setShowConnectedAccounts} showConnectedAccounts={showConnectedAccounts} pushEnabled={pushEnabled} setPushEnabled={setPushEnabled} subscribeToMusePush={subscribeToMusePush} unsubscribeFromMusePush={unsubscribeFromMusePush} setShowTerms={setShowTerms} setShowPrivacy={setShowPrivacy} setShowGuidelines={setShowGuidelines} setShowDeleteConfirm={setShowDeleteConfirm} isUnlimited={isUnlimited} setShowConnect={setShowConnect} setShowPaymentHistory={setShowPaymentHistory} setShowReferral={setShowReferral} setShowSafetyCheckin={setShowSafetyCheckin} setShowPromptBank={setShowPromptBank} promptResponses={promptResponses} promptBankData={promptBankData} myGeo={myGeo} setShowAgeGate={setShowAgeGate} setPendingNsfw={setPendingNsfw} setShowAgeVerification={setShowAgeVerification} />}',
}

for name, anchor in cond_anchors:
    print(f"\n=== {name.upper()} ===")
    open_idx = find_line(anchor)
    if open_idx < 0:
        print(f"  NOT FOUND")
        continue
    
    depth = 0
    close_idx = open_idx
    for i in range(open_idx, len(lines)):
        for ch in lines[i]:
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        if depth == 0 and i > open_idx:
            close_idx = i
            break
    
    print(f"  Lines {open_idx+1}-{close_idx+1} ({close_idx - open_idx + 1} lines)")
    lines[open_idx:close_idx+1] = [f'      {cond_components[name]}']
    print(f"  Replaced with component")

# ═══ Write ═══
result = "\n".join(lines)
with open(FILE, "w", encoding="utf-8") as f:
    f.write(result)

print(f"\n=== DONE: {len(lines)} lines ===")
