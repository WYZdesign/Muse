"use client";

import React from "react";
import {
  FiCompass, FiUsers, FiZap, FiStar, FiCamera, FiCalendar,
  FiBriefcase, FiMessageCircle, FiSend, FiClock, FiHome,
} from "react-icons/fi";
import { safeRemoveItem } from "../lib/safe-storage";
import type { PageTourSlide } from "./PageTour";

/**
 * The 11 real destinations that get their own first-visit tutorial —
 * main nav (discover/connections/briefs/matches/bts) plus the other
 * screens Torreé confirmed as in scope (chat, community, sessions, forum,
 * network, studios). settings/profile/subscription are intentionally
 * excluded, per spec.
 */
export type TourScreenId =
  | "discover" | "connections" | "briefs" | "matches" | "bts"
  | "chat" | "community" | "sessions" | "forum" | "network" | "studios";

export interface PageTourDef {
  icon: React.ReactNode;
  from: string;
  to: string;
  orbitCount: 1 | 2 | 3;
  sparkCount: number;
  ringStyle: "solid" | "dashed";
  ariaLabel: string;
  slides: PageTourSlide[];
}

/** The subset of screens whose tour is triggered by `screen` alone — every
 *  id here except "forum", which lives inside the Network screen as a tab
 *  and is triggered separately when that tab is opened for the first time. */
export const SCREEN_TRIGGERED_TOUR_IDS: TourScreenId[] = [
  "discover", "connections", "briefs", "matches", "bts",
  "chat", "community", "sessions", "network", "studios",
];

export const ALL_TOUR_IDS: TourScreenId[] = [...SCREEN_TRIGGERED_TOUR_IDS, "forum"];

export function tourSeenKey(id: TourScreenId): string {
  return `muse_tour_seen_${id}`;
}

/** Clears every screen's "seen" flag so each one's tutorial plays again the
 *  next time the user visits it. Used by the "Replay Tutorials" action. */
export function clearAllPageTourFlags(): void {
  for (const id of ALL_TOUR_IDS) {
    try { safeRemoveItem(tourSeenKey(id)); } catch {}
  }
}

export const PAGE_TOURS: Record<TourScreenId, PageTourDef> = {
  discover: {
    icon: <FiCompass size={40} />,
    from: "#FFD700",
    to: "#FFA07A",
    orbitCount: 3,
    sparkCount: 10,
    ringStyle: "solid",
    ariaLabel: "Discover tutorial",
    slides: [
      {
        eyebrow: "Discover",
        title: "Find your people",
        body: "Swipe through creators near you. Right to connect, left to pass, up for a super like.",
        highlight: "Swipe cards",
        steps: ["Swipe right to connect", "Swipe left to pass", "Swipe up for a super like"],
      },
      {
        eyebrow: "Discover",
        title: "Zero in with filters",
        body: "Narrow the stack by style, distance, and creative type so every card you see is a real fit.",
        highlight: "Filter · Distance · Style",
        steps: ["Tap the filter icon up top", "Set style, type & distance", "Filters stay set until you change them"],
      },
    ],
  },
  connections: {
    icon: <FiUsers size={40} />,
    from: "#1E90FF",
    to: "#ADD8E6",
    orbitCount: 2,
    sparkCount: 8,
    ringStyle: "solid",
    ariaLabel: "Feed tutorial",
    slides: [
      {
        eyebrow: "Feed",
        title: "Share your work",
        body: "Post updates, photos, and behind-the-scenes moments so your circle can see what you're making.",
        highlight: "Post · Photos · Updates",
        steps: ["Tap + to create a new post", "Add photos or just text", "Post shows up in everyone's feed"],
      },
      {
        eyebrow: "Feed",
        title: "Stay in the loop",
        body: "Like and comment on what others post, and save the ones you want to find again later.",
        highlight: "Like · Comment · Save",
        steps: ["Tap the heart to like", "Comment to start a conversation", "Bookmark to save for later"],
      },
    ],
  },
  briefs: {
    icon: <FiZap size={40} />,
    from: "#20B2AA",
    to: "#7CFC00",
    orbitCount: 3,
    sparkCount: 12,
    ringStyle: "dashed",
    ariaLabel: "Collab tutorial",
    slides: [
      {
        eyebrow: "Collab",
        title: "Paid gigs & vision quests",
        body: "Browse quests posted by brands and creators — real paid opportunities and open creative briefs, all in one place.",
        highlight: "Browse · Quests · Briefs",
        steps: ["Scroll to browse open briefs", "Tap a card for the full details", "New quests post regularly"],
      },
      {
        eyebrow: "Collab",
        title: "Apply, book, track",
        body: "Apply or book with one tap, then keep an eye on everything you've gone after from Menu → Your Activity.",
        highlight: "Apply · Book · Track",
        steps: ["Apply or book with one tap", "Track status anytime", "Find it all under Menu → Your Activity"],
      },
    ],
  },
  matches: {
    icon: <FiStar size={40} />,
    from: "#FF4500",
    to: "#FFD700",
    orbitCount: 3,
    sparkCount: 14,
    ringStyle: "solid",
    ariaLabel: "Muses tutorial",
    slides: [
      {
        eyebrow: "Muses",
        title: "Your matches, all here",
        body: "Every mutual connection lands on this screen. Switch between list and grid to browse however you like.",
        highlight: "List · Grid · All matches",
        steps: ["New matches appear at the top", "Toggle list or grid view", "Tap a match to see their profile"],
      },
      {
        eyebrow: "Muses",
        title: "Chat, manage, or move on",
        body: "Jump straight into a conversation, or swipe on a card to unmatch or report if something's not right.",
        highlight: "Chat · Report · Unmatch",
        steps: ["Tap a match to start chatting", "Swipe a card to unmatch or report", "Report goes straight to the safety team"],
      },
    ],
  },
  bts: {
    icon: <FiCamera size={40} />,
    from: "#FF1493",
    to: "#FF69B4",
    orbitCount: 1,
    sparkCount: 6,
    ringStyle: "solid",
    ariaLabel: "BTS tutorial",
    slides: [
      {
        eyebrow: "BTS",
        title: "Behind the scenes",
        body: "Quick, casual stories that disappear — a glimpse of a shoot, a session, or a day in the studio. Tap any ring to watch, and swipe sideways to move between them.",
        highlight: "Tap rings · Stories disappear",
        steps: ["Tap a ring to watch a story", "Swipe sideways for the next one", "Stories disappear after viewing"],
      },
    ],
  },
  chat: {
    icon: <FiSend size={40} />,
    from: "#FF6B9D",
    to: "#C86DD7",
    orbitCount: 2,
    sparkCount: 5,
    ringStyle: "dashed",
    ariaLabel: "Chat tutorial",
    slides: [
      {
        eyebrow: "Chat",
        title: "Keep the conversation going",
        body: "Send text or share a photo right from the message bar, and you'll see when the other person is typing back.",
        highlight: "Message · Photos · Typing",
        steps: ["Type or tap the image icon to send a photo", "A typing dot shows when they're replying", "Icebreakers help if you're stuck"],
      },
      {
        eyebrow: "Chat",
        title: "Stay in control",
        body: "If a conversation isn't working for you, the options menu has everything you need to step away safely.",
        highlight: "Report · Block · Unmatch",
        steps: ["Tap the ••• menu in the top right", "Report, block, or unmatch anytime", "Blocking is immediate and private"],
      },
    ],
  },
  community: {
    icon: <FiCalendar size={40} />,
    from: "#D4A5FF",
    to: "#FF8A80",
    orbitCount: 2,
    sparkCount: 9,
    ringStyle: "solid",
    ariaLabel: "Community tutorial",
    slides: [
      {
        eyebrow: "Community",
        title: "Groups that match your niche",
        body: "Join creative communities built around the kind of work you do, and connect with people who get it.",
        highlight: "Browse · Join · Connect",
        steps: ["Browse groups by category", "Tap a group to join", "Your groups show up at the top"],
      },
      {
        eyebrow: "Community",
        title: "Meetups, workshops & shoots",
        body: "RSVP to events happening around you, and keep track of what you've confirmed.",
        highlight: "RSVP · Events · Calendar",
        steps: ["Browse upcoming events", "RSVP with one tap", "Confirmed events stay on your calendar"],
      },
    ],
  },
  sessions: {
    icon: <FiClock size={40} />,
    from: "#6C5CE7",
    to: "#00B4D8",
    orbitCount: 3,
    sparkCount: 7,
    ringStyle: "solid",
    ariaLabel: "Sessions tutorial",
    slides: [
      {
        eyebrow: "Sessions",
        title: "Book real shoots",
        body: "Browse open sessions and book time with creators and pros — search, filter, and save the ones you like.",
        highlight: "Browse · Book · Save",
        steps: ["Browse sessions on offer", "Tap to see details & book", "Bookmark sessions to compare later"],
      },
      {
        eyebrow: "Sessions",
        title: "Bookings & requests",
        body: "Switch tabs to see what you've booked, and to manage incoming requests if you're the one hosting.",
        highlight: "Bookings · Requests",
        steps: ["Bookings tab: what you've booked", "Requests tab: what's coming your way", "Accept or decline requests from there"],
      },
      {
        eyebrow: "Sessions",
        title: "Payment, confirmed",
        body: "Every booking shows its real payment status, so you always know whether it's been held, paid, or is still pending.",
        highlight: "Payment status, visible",
        steps: ["Status shows on every booking card", "Held, paid, and pending are all labeled", "No guessing whether payment went through"],
      },
    ],
  },
  forum: {
    icon: <FiMessageCircle size={40} />,
    from: "#FF9F1C",
    to: "#2EC4B6",
    orbitCount: 2,
    sparkCount: 11,
    ringStyle: "dashed",
    ariaLabel: "Forum tutorial",
    slides: [
      {
        eyebrow: "Forum",
        title: "Ask, answer, swap advice",
        body: "Drop a question or post a discussion for the whole community — sort by Hot, New, or Top to find what's worth reading.",
        highlight: "Post · Hot · New · Top",
        steps: ["Tap + to start a new post", "Sort by Hot, New, or Top", "Filter by category to narrow it down"],
      },
      {
        eyebrow: "Forum",
        title: "Join the thread",
        body: "Upvote what's useful, reply to a thread, and keep the conversation going in the comments.",
        highlight: "Upvote · Reply · Discuss",
        steps: ["Vote posts up or down", "Tap a post to open the full thread", "Reply to keep the discussion going"],
      },
    ],
  },
  network: {
    icon: <FiBriefcase size={40} />,
    from: "#00CED1",
    to: "#1E90FF",
    orbitCount: 3,
    sparkCount: 8,
    ringStyle: "solid",
    ariaLabel: "Network tutorial",
    slides: [
      {
        eyebrow: "Network",
        title: "Verified professionals",
        body: "Browse photographers, directors, editors and more for your next project — filter by experience, rate, and what they're looking for.",
        highlight: "Browse · Filter · Verified",
        steps: ["Browse professionals near you", "Filter by experience & rate", "Every listing here is verified"],
      },
      {
        eyebrow: "Network",
        title: "Book or tip",
        body: "Book a session directly with a pro, or leave a tip for creators whose work you appreciate.",
        highlight: "Book · Tip · Support",
        steps: ["Tap a profile to see their work", "Book a session in a couple taps", "Leave a tip to support their work"],
      },
    ],
  },
  studios: {
    icon: <FiHome size={40} />,
    from: "#E07A5F",
    to: "#F4A261",
    orbitCount: 1,
    sparkCount: 13,
    ringStyle: "dashed",
    ariaLabel: "Studios tutorial",
    slides: [
      {
        eyebrow: "LA Studios",
        title: "Explore real studio space",
        body: "Browse studios and their buildings — see what's included, house rules, and what each space actually looks like before you book.",
        highlight: "Browse studios & buildings",
        steps: ["Pick a studio from the tabs", "Browse its buildings", "Check house rules before booking"],
      },
      {
        eyebrow: "LA Studios",
        title: "Ask the Oracle",
        body: "Have a question about booking, pricing, or what's included? Ask the Oracle and get an instant answer.",
        highlight: "Ask · Booking · Pricing",
        steps: ["Type your question to the Oracle", "Get instant answers on pricing & rules", "No question is too small"],
      },
    ],
  },
};
