"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FiCompass, FiUsers, FiZap, FiHeart, FiCamera, FiCalendar,
  FiMessageCircle, FiUser, FiStar, FiX, FiArrowRight, FiArrowLeft,
} from "react-icons/fi";
import { MUSE_CLOSED_BETA_HIDE_SOCIAL } from "@/lib/config";

interface TourPage {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  from: string;
  to: string;
}

// Content order mirrors the main nav + the rest of the app's key surfaces,
// so this doubles as an at-a-glance map of everything Muse offers.
const ALL_PAGES: TourPage[] = [
  {
    id: "welcome",
    eyebrow: "Welcome to",
    title: "Muse",
    body: "A quick, glitzy tour of everything you can do here — swipe through, or skip anytime. You can replay this from Menu whenever you like.",
    icon: <FiStar size={40} />,
    from: "#FFD700",
    to: "#FF8A80",
  },
  {
    id: "discover",
    eyebrow: "Discover",
    title: "Find your people",
    body: "Swipe through creators near you. Right to connect, left to pass, up for a super like. Filter by style, distance, and more to zero in on the right fits.",
    icon: <FiCompass size={40} />,
    from: "#FFD700",
    to: "#FFA07A",
  },
  {
    id: "feed",
    eyebrow: "Feed",
    title: "Share your work",
    body: "Post updates, photos, and behind-the-scenes moments. Like, comment, and keep up with what everyone in your circle is creating.",
    icon: <FiUsers size={40} />,
    from: "#1E90FF",
    to: "#ADD8E6",
  },
  {
    id: "collab",
    eyebrow: "Collab",
    title: "Paid gigs & vision quests",
    body: "Browse quests posted by brands and creators — apply to paid opportunities or respond to open creative briefs. Track everything you've applied to under Menu → Your Activity.",
    icon: <FiZap size={40} />,
    from: "#20B2AA",
    to: "#7CFC00",
  },
  {
    id: "muses",
    eyebrow: "Muses",
    title: "Your matches",
    body: "Every mutual connection lands here. Jump into a conversation, revisit a profile, or see who's liked you.",
    icon: <FiHeart size={40} />,
    from: "#FF4500",
    to: "#FFD700",
  },
  {
    id: "bts",
    eyebrow: "BTS",
    title: "Behind the scenes",
    body: "Stories that disappear — quick, casual glimpses into a shoot, a session, or a day in the studio. Tap a ring to watch.",
    icon: <FiCamera size={40} />,
    from: "#FF1493",
    to: "#FF69B4",
  },
  {
    id: "community",
    eyebrow: "Community",
    title: "Groups & events",
    body: "Join creative communities that match your niche, and RSVP to meetups, workshops, and shoots happening around you.",
    icon: <FiCalendar size={40} />,
    from: "#D4A5FF",
    to: "#FF8A80",
  },
  {
    id: "network",
    eyebrow: "Network",
    title: MUSE_CLOSED_BETA_HIDE_SOCIAL ? "Find professionals" : "Pros & the forum",
    body: MUSE_CLOSED_BETA_HIDE_SOCIAL
      ? "Book verified professionals for your next project — photographers, directors, editors, and more."
      : "Book verified professionals for your next project, or drop into the forum to ask questions and swap advice with the community.",
    icon: <FiMessageCircle size={40} />,
    from: "#00CED1",
    to: "#1E90FF",
  },
  {
    id: "profile",
    eyebrow: "Profile & streaks",
    title: "Build your presence",
    body: "Fill out your portfolio, verify your account for a trust badge, and log in daily to build your streak and unlock quest rewards.",
    icon: <FiUser size={40} />,
    from: "#FFD700",
    to: "#FF8C00",
  },
  {
    id: "done",
    eyebrow: "That's everything",
    title: "Go make something",
    body: "You're all set. Explore at your own pace — and if you ever need a refresher, find this tour again under Menu → Help & Support.",
    icon: <FiStar size={40} />,
    from: "#FFD700",
    to: "#D4A5FF",
  },
];

// Drop the Community slide during closed beta — Community is hidden from the
// menu (MUSE_CLOSED_BETA_HIDE_SOCIAL) so the onboarding tour shouldn't sell
// new users on a feature they have no way to reach.
const PAGES: TourPage[] = ALL_PAGES.filter(p => !(MUSE_CLOSED_BETA_HIDE_SOCIAL && p.id === "community"));

function randSpark() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 60 + Math.random() * 70;
  return {
    "--vx": `${Math.cos(angle) * dist}px`,
    "--vy": `${Math.sin(angle) * dist}px`,
    animationDelay: `${Math.random() * 0.15}s`,
  } as React.CSSProperties;
}

function TourSprite({ page }: { page: TourPage }) {
  const [sparks] = useState(() => Array.from({ length: 10 }, randSpark));
  return (
    <div className="tour-sprite-wrap" key={page.id}>
      <div className="tour-sprite-glow" style={{ background: `radial-gradient(circle, ${page.from}66, transparent 72%)` }} />
      <div className="tour-sprite-ring" style={{ borderColor: page.from }} />
      <div className="tour-sprite-ring tour-sprite-ring-2" style={{ borderColor: page.to }} />
      <div className="tour-sprite-badge" style={{ background: `linear-gradient(135deg, ${page.from}, ${page.to})` }}>
        <span className="tour-sprite-icon">{page.icon}</span>
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className={`tour-sprite-orbit tour-sprite-orbit-${i}`}>
          <div className="tour-sprite-orbit-dot" style={{ background: i % 2 ? page.to : page.from }} />
        </div>
      ))}
      <div className="tour-sprite-burst">
        {sparks.map((s, i) => (
          <div key={i} className="tour-sprite-spark" style={{ ...s, background: i % 2 ? page.from : page.to }} />
        ))}
      </div>
    </div>
  );
}

export default function FeatureTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { if (open) setIdx(0); }, [open]);

  if (!open) return null;

  const page = PAGES[idx];
  const isLast = idx >= PAGES.length - 1;
  const isFirst = idx === 0;

  const next = () => { if (isLast) onClose(); else setIdx(i => i + 1); };
  const back = () => { if (!isFirst) setIdx(i => i - 1); };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) next();
    else if (dx > 40) back();
    touchStartX.current = null;
  };

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Feature tour" onClick={onClose}>
      <div
        className="tour-card"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ ["--tour-a" as any]: page.from, ["--tour-b" as any]: page.to }}
      >
        <div className="tour-card-wash" />
        <button className="tour-close" onClick={onClose} aria-label="Close tour"><FiX size={18} /></button>

        <div className="tour-page" key={page.id}>
          <TourSprite page={page} />
          <div className="tour-eyebrow">{page.eyebrow}</div>
          <div className="tour-title">{page.title}</div>
          <div className="tour-body">{page.body}</div>
        </div>

        <div className="tour-footer">
          <div className="tour-dots">
            {PAGES.map((p, i) => (
              <button
                key={p.id}
                className={"tour-dot" + (i === idx ? " active" : "")}
                aria-label={"Go to " + p.title}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
          <div className="tour-nav-row">
            {!isFirst ? (
              <button className="tour-btn tour-btn-ghost" onClick={back}><FiArrowLeft size={15} /> Back</button>
            ) : (
              <button className="tour-btn tour-btn-ghost" onClick={onClose}>Skip</button>
            )}
            <button className="tour-btn tour-btn-primary" onClick={next}>
              {isLast ? "Let's go!" : "Next"} {!isLast && <FiArrowRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
