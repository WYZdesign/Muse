"use client";

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  anchor: "card" | "fab" | "nav" | "header" | "center";
  // Optional CSS selector for the real DOM element to highlight. When present,
  // the overlay measures it with getBoundingClientRect so the ring outlines the
  // ACTUAL element on that screen. When absent, a generic anchor position is
  // used as a fallback.
  selector?: string;
}

export interface TutorialDef {
  key: string;
  title: string;
  steps: TutorialStep[];
}

// One tutorial per primary screen. `key` maps to the Screen value so the
// first-visit trigger + the Help Center replay share a single source of truth.
//
// Anchor selectors target real, stable DOM nodes shared across the app:
//   .nav        → the bottom navigation bar (Nav.tsx)
//   .hdr        → the screen header bar (every screen renders one)
//   .screen-el  → the active screen container (the main content region)
// For screens without a unique interactive element, steps fall back to a
// generic anchor position (still visually grounded, not pointing at a
// Discover-specific card).
export const TUTORIALS: Record<string, TutorialDef> = {
  discover: {
    key: "discover",
    title: "Discover",
    steps: [
      { id: "card", title: "Discover Cards", anchor: "card", selector: ".swipe-card.top-card", body: "Here's your deck of creatives. Tap the left or right side of the photo to browse their images, and scroll down to read their full profile, prompts, styles, and portfolio." },
      { id: "fab", title: "Match Actions", anchor: "fab", selector: ".match-radial-btn.btn-like", body: "This is the Like button. Around the card you'll also find Rewind, Pass, Super Like, and Like + Note." },
      { id: "swipe", title: "Swipe to Decide", anchor: "center", body: "Swipe right to like and left to pass, or tap the round buttons. Every like gets you closer to a match." },
      { id: "nav", title: "Navigation", anchor: "nav", selector: ".nav", body: "Use the bottom bar to move between Discover, Feed, Collab, Muses, and BTS. The menu button opens everything else, like your profile and settings." },
    ],
  },
  connections: {
    key: "connections",
    title: "Feed",
    steps: [
      { id: "post", title: "Your Feed", anchor: "card", selector: ".screen-el", body: "This is where creatives share work, updates, and behind-the-scenes moments. Scroll to see what your community is up to." },
      { id: "compose", title: "Post Something", anchor: "fab", body: "Tap the compose button to share your own work. Add a caption, attach photos, and post to your network." },
      { id: "nav", title: "Move Around", anchor: "nav", selector: ".nav", body: "The bottom bar takes you between Discover, Feed, Collab, Muses, and BTS at any time." },
    ],
  },
  briefs: {
    key: "briefs",
    title: "Collab",
    steps: [
      { id: "briefs", title: "Briefs", anchor: "card", body: "Briefs are paid or unpaid collaboration listings. Creatives post projects they need help with, and you can apply or save them." },
      { id: "post", title: "Post a Brief", anchor: "fab", body: "Have a project? Post your own brief with a title, description, budget, and category so others can find you." },
      { id: "nav", title: "Navigate", anchor: "nav", selector: ".nav", body: "Switch between screens anytime using the bottom bar." },
    ],
  },
  matches: {
    key: "matches",
    title: "Muses",
    steps: [
      { id: "matches", title: "Your Muses", anchor: "card", selector: ".match-list", body: "People you've matched with appear here. Tap one to open a chat, view their profile, or manage the connection." },
      { id: "chat", title: "Start Talking", anchor: "center", body: "Open a match to send messages, share images, and plan your next collaboration." },
      { id: "nav", title: "Navigate", anchor: "nav", selector: ".nav", body: "Use the bottom bar to move between screens." },
    ],
  },
  moments: {
    key: "moments",
    title: "BTS",
    steps: [
      { id: "moments", title: "Behind the Scenes", anchor: "card", selector: ".moments-feed", body: "BTS is a live feed of short moments from creatives — set photos, gear shots, on-location snaps. They disappear after a while, so check back often." },
      { id: "post", title: "Share a Moment", anchor: "fab", body: "Tap to post your own behind-the-scenes moment. It goes out to your network instantly." },
      { id: "nav", title: "Navigate", anchor: "nav", selector: ".nav", body: "The bottom bar moves you between all your screens." },
    ],
  },
  profile: {
    key: "profile",
    title: "Your Profile",
    steps: [
      { id: "profile", title: "Your Profile", anchor: "header", selector: ".hdr", body: "This is how other creatives see you. Your photo, type, bio, stats, and portfolio all live here." },
      { id: "edit", title: "Edit Profile", anchor: "center", body: "Tap Edit Profile (or the pencil icon) to update your name, bio, location, and photo. Tap Account Settings for privacy, notifications, and security." },
      { id: "portfolio", title: "Portfolio", anchor: "center", body: "Build your portfolio with albums and photos so potential collaborators can see your best work at a glance." },
    ],
  },
  forum: {
    key: "forum",
    title: "Forum",
    steps: [
      { id: "forum", title: "Community Forum", anchor: "card", body: "The forum is where the community talks — ask questions, share tips, and discuss the craft. Upvote posts and leave replies." },
      { id: "post", title: "Start a Thread", anchor: "fab", body: "Tap to create a new thread. Give it a title, write your post, and pick a category." },
    ],
  },
  sessions: {
    key: "sessions",
    title: "Bookings",
    steps: [
      { id: "sessions", title: "Sessions", anchor: "card", body: "Book sessions with creatives here. Browse offerings, pick a time, and complete your booking with secure payments and escrow." },
      { id: "book", title: "Book a Session", anchor: "center", body: "Open a session to see details and book. You may need to complete identity verification and a disclosure form first." },
      { id: "nav", title: "Navigate", anchor: "nav", selector: ".nav", body: "Use the bottom bar to move between screens." },
    ],
  },
  community: {
    key: "community",
    title: "Community",
    steps: [
      { id: "community", title: "Communities", anchor: "card", body: "Join communities around cities, crafts, and interests. Find events and connect with creatives near you." },
      { id: "events", title: "Events", anchor: "center", body: "Events are meetups, mixers, and shoots. RSVP to let others know you're coming." },
    ],
  },
  events: {
    key: "events",
    title: "Events",
    steps: [
      { id: "events", title: "Events", anchor: "card", body: "Browse upcoming events and mixers. RSVP to save your spot and connect with attendees." },
    ],
  },
  settings: {
    key: "settings",
    title: "Settings",
    steps: [
      { id: "settings", title: "Settings", anchor: "header", selector: ".hdr", body: "Everything you can control lives here — discovery preferences, notifications, connected accounts, theme, and more." },
      { id: "premium", title: "Muse Premium", anchor: "center", body: "Upgrade to Muse Pro for unlimited likes, advanced filters, read receipts, and priority discover." },
    ],
  },
};
