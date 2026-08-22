"use client";

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  anchor: "card" | "fab" | "nav" | "header" | "center";
  selector?: string;
}

export interface TutorialDef {
  key: string;
  title: string;
  steps: TutorialStep[];
}

export const TUTORIALS: Record<string, TutorialDef> = {
  discover: {
    key: "discover",
    title: "Discover",
    steps: [
      { id: "card", title: "Profile Card", anchor: "card", selector: ".swipe-card.top-card", body: "Tap left/right edges of the photo to browse images. Scroll down for bio, prompts, styles, and portfolio." },
      { id: "swipe", title: "Swipe or Tap", anchor: "center", body: "Swipe right to like, left to pass. Drag up to Super Like. Or tap the round buttons below." },
      { id: "fab", title: "Action Buttons", anchor: "fab", selector: ".match-radial-btn.btn-like", body: "Rewind, Pass, Super Like, Like, and Like + Note. Each match earns a free DM." },
      { id: "nav", title: "Navigation", anchor: "nav", selector: ".nav", body: "Bottom bar switches screens. Menu button opens profile, settings, and marketplace." },
    ],
  },
  connections: {
    key: "connections",
    title: "Feed",
    steps: [
      { id: "post", title: "Community Posts", anchor: "card", selector: ".screen-el", body: "Photos, updates, and work-in-progress from your network. Double-tap or tap the heart to like." },
      { id: "compose", title: "Share Work", anchor: "fab", body: "Post photos with a caption. Tag creatives, add location, and set visibility." },
      { id: "nav", title: "Quick Switch", anchor: "nav", selector: ".nav", body: "Badges show new matches and messages. Tap any icon to jump screens." },
    ],
  },
  briefs: {
    key: "briefs",
    title: "Collab",
    steps: [
      { id: "briefs", title: "Open Briefs", anchor: "card", selector: ".brief-card", body: "Paid and unpaid gigs. Tap a brief to see budget, deadline, and requirements. Save or apply." },
      { id: "post", title: "Post a Brief", anchor: "fab", body: "Create a listing with title, description, category, budget, and deadline. It goes live instantly." },
      { id: "nav", title: "Navigate", anchor: "nav", selector: ".nav", body: "Switch between screens anytime using the bottom bar." },
    ],
  },
  matches: {
    key: "matches",
    title: "Muses",
    steps: [
      { id: "matches", title: "Match List", anchor: "card", selector: ".match-list", body: "Your connections. Tap a match to open chat, view their profile, or unmatch." },
      { id: "chat", title: "Messaging", anchor: "center", body: "Send text, photos, and voice notes. Free DMs after a match; unlimited with Pro." },
    ],
  },
  moments: {
    key: "moments",
    title: "BTS",
    steps: [
      { id: "moments", title: "Live Moments", anchor: "card", selector: ".moments-feed", body: "Behind-the-scenes clips from creatives. Set photos, gear shots, location snaps. They expire after a while." },
      { id: "post", title: "Post a Moment", anchor: "fab", body: "Share a quick BTS snap to your network. Photos and short video only." },
    ],
  },
  profile: {
    key: "profile",
    title: "Your Profile",
    steps: [
      { id: "profile", title: "Public Profile", anchor: "header", selector: ".hdr", body: "This is what others see — photo, type, bio, styles, portfolio, and stats." },
      { id: "edit", title: "Edit Profile", anchor: "center", body: "Tap Edit to change name, bio, location, and avatar. Add portfolio albums and prompt responses." },
      { id: "settings", title: "Settings", anchor: "center", body: "Account Settings has privacy, notifications, themes, NSFW, and subscription management." },
    ],
  },
  forum: {
    key: "forum",
    title: "Forum",
    steps: [
      { id: "forum", title: "Threads", anchor: "card", selector: ".conn-card", body: "Community discussions. Upvote useful posts, reply to help others, sort by recent or top." },
      { id: "post", title: "New Thread", anchor: "fab", body: "Start a discussion with a title, body, and category. Others can reply and upvote." },
    ],
  },
  sessions: {
    key: "sessions",
    title: "Bookings",
    steps: [
      { id: "sessions", title: "Session Listings", anchor: "card", selector: ".conn-card", body: "Browse or list creative sessions. Each shows price, duration, and availability." },
      { id: "book", title: "Book Now", anchor: "center", body: "Tap a session to see details, pick a date, and pay. Identity verification and disclosure may be required first." },
    ],
  },
  community: {
    key: "community",
    title: "Community",
    steps: [
      { id: "community", title: "Groups", anchor: "card", selector: ".conn-card", body: "City-based, craft-based, and interest-based communities. Join to see members, events, and discussions." },
      { id: "events", title: "Events", anchor: "center", body: "Meetups, mixers, and shoots. RSVP to save your spot and notify attendees." },
    ],
  },
  events: {
    key: "events",
    title: "Events",
    steps: [
      { id: "events", title: "Upcoming Events", anchor: "card", selector: ".conn-card", body: "Browse events by date, location, or type. RSVP to confirm attendance and see who else is going." },
    ],
  },
  settings: {
    key: "settings",
    title: "Settings",
    steps: [
      { id: "settings", title: "Settings Groups", anchor: "header", selector: ".hdr", body: "Account, Appearance, Discovery, Payments, Safety, and Legal — everything organized in one place." },
      { id: "premium", title: "Go Pro", anchor: "center", body: "Unlimited likes, advanced filters, read receipts, and priority discover. Manage subscription here." },
    ],
  },
};
