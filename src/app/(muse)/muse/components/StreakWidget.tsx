"use client";

import React from "react";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function StreakWidget({
  weeklyLogins,
  loginStreak,
  compact = false,
}: {
  weeklyLogins: boolean[];
  loginStreak: number;
  compact?: boolean;
}) {
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  if (compact) {
    return (
      <div className="streak-compact">
        <div className="streak-compact-fire">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2C14 2 6 10 6 17a8 8 0 0016 0c0-7-8-15-8-15z" fill="url(#fireGrad)" />
            <path d="M14 10c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" fill="url(#innerGrad)" />
            <defs>
              <linearGradient id="fireGrad" x1="14" y1="2" x2="14" y2="27" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFD700" />
                <stop offset="0.5" stopColor="#FF8C00" />
                <stop offset="1" stopColor="#FF4500" />
              </linearGradient>
              <linearGradient id="innerGrad" x1="14" y1="10" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFF7CC" />
                <stop offset="1" stopColor="#FFD700" />
              </linearGradient>
            </defs>
          </svg>
          <span className="streak-compact-num">{loginStreak}</span>
        </div>
        <div className="streak-compact-days">
          {weeklyLogins.map((on, i) => (
            <div key={i} className={"streak-compact-dot" + (on ? " on" : "") + (i === todayIdx ? " today" : "")}>
              <div className="streak-compact-pip" />
              <span className="streak-compact-label">{DAY_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="streak-widget">
      <div className="streak-widget-header">
        <div className="streak-widget-flame">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="url(#ringGrad)" strokeWidth="2" fill="rgba(255,215,0,0.06)" />
            <path d="M20 6C20 6 10 16 10 23a10 10 0 0020 0c0-7-10-17-10-17z" fill="url(#fireGradLg)" />
            <path d="M20 14c0 0-5 5-5 9a5 5 0 0010 0c0-4-5-9-5-9z" fill="url(#innerGradLg)" />
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#FFD700" />
                <stop offset="1" stopColor="#FF8C00" />
              </linearGradient>
              <linearGradient id="fireGradLg" x1="20" y1="6" x2="20" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFD700" />
                <stop offset="0.5" stopColor="#FF8C00" />
                <stop offset="1" stopColor="#FF4500" />
              </linearGradient>
              <linearGradient id="innerGradLg" x1="20" y1="14" x2="20" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFF7CC" />
                <stop offset="1" stopColor="#FFD700" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="streak-widget-info">
          <div className="streak-widget-title">
            {loginStreak > 0 ? `${loginStreak} Day Streak` : "Start Your Streak"}
          </div>
          <div className="streak-widget-sub">
            {loginStreak >= 7 ? "Unstoppable — full week cleared!" : loginStreak >= 3 ? `${7 - loginStreak} more days to complete the week` : "Log in daily to build your streak"}
          </div>
        </div>
      </div>
      <div className="streak-widget-bar">
        {weeklyLogins.map((on, i) => (
          <div key={i} className={"streak-day" + (on ? " hit" : "") + (i === todayIdx ? " today" : "")}>
            <div className="streak-day-ring">
              {on ? (
                <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="url(#dotGold)" /><path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#0a0612" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <defs><linearGradient id="dotGold" x1="0" y1="0" x2="18" y2="18"><stop stopColor="#FFD700" /><stop offset="1" stopColor="#FF8C00" /></linearGradient></defs>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.5" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="rgba(255,255,255,0.03)" /></svg>
              )}
            </div>
            <span className="streak-day-label">{DAY_LABELS[i]}</span>
          </div>
        ))}
      </div>
      <div className="streak-widget-progress">
        <div className="streak-progress-track">
          <div className="streak-progress-fill" style={{ width: `${(weeklyLogins.filter(Boolean).length / 7) * 100}%` }} />
        </div>
        <span className="streak-progress-text">{weeklyLogins.filter(Boolean).length}/7 days</span>
      </div>
    </div>
  );
}
