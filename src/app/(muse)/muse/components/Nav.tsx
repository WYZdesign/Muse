"use client";
import React from "react";
import { FiCompass, FiUsers, FiZap, FiCamera, FiEye, FiMenu, FiStar } from "react-icons/fi";
import type { Screen } from "./types";

const lineColor: Record<string,string> = {
  discover: "#FFD700",
  connections: "#FF8C00",
  briefs: "#4DD0E1",
  matches: "#FF8C00",
  bts: "#FF69B4",
};

const lavaGradients: Record<string, string> = {
  discover: "linear-gradient(90deg,#FFD700,#FF8C69,#FFB6C1,#FFD700,#FFA07A,#FFD700)",
  connections: "linear-gradient(90deg,#FF8C00,#FFD700,#FFAA00,#FF8C00,#FF4500,#FF8C00)",
  briefs: "linear-gradient(90deg,#4DD0E1,#20B2AA,#00CED1,#4DD0E1,#26C6DA,#4DD0E1)",
  matches: "linear-gradient(90deg,#FF8C00,#FFD700,#FFAA00,#FF8C00,#FF4500,#FF8C00)",
  bts: "linear-gradient(90deg,#FF69B4,#FF1493,#FFB6C1,#FF69B4,#FF69B4)",
};

const tabs: { key: string; label: string; icon: React.ReactNode; hasScreen: boolean }[] = [
  { key:"discover", label:"Discover", icon:<FiCompass size={22} />, hasScreen:true },
  { key:"connections", label:"Feed", icon:<FiUsers size={22} />, hasScreen:true },
  { key:"briefs", label:"Collab", icon:<FiZap size={22} />, hasScreen:true },
  { key:"matches", label:"Muses", icon:<FiCamera size={22} />, hasScreen:true },
  { key:"bts", label:"BTS", icon:<FiEye size={22} />, hasScreen:true },
];

export default React.memo(function Nav({ active, onNavigate, onHamburgerToggle, unreadCount }: { active: string; onNavigate: (s: Screen) => void; onHamburgerToggle?: () => void; unreadCount?: number }) {
  return (
    <div className="nav" role="navigation" aria-label="Main navigation">
      {tabs.map(tab => {
        const isActive = active === tab.key;
        const color = lineColor[tab.key] || "#FFD700";
        const lava = lavaGradients[tab.key] || lavaGradients.discover;
        const iconStyle = isActive ? {
          color: color,
          filter: `drop-shadow(0 0 8px ${color}60)`,
          display: "inline-flex" as const,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        } : undefined;
        const buttonStyle = isActive ? {
          "--line-color": color,
          background: `linear-gradient(135deg, ${color}25, ${color}10)`,
          borderRadius: 12,
          border: `1px solid ${color}30`,
        } as React.CSSProperties : {
          "--line-color": color,
        } as React.CSSProperties;
        const labelStyle = isActive ? {
          backgroundImage: lava,
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          display: "inline-block",
          padding: "0 4px",
          animation: "lavaFlow 4s ease-in-out infinite",
          fontWeight: 800,
        } as React.CSSProperties : { color: "var(--muted)", fontWeight: 600 };
        return (
          <button key={tab.key} className={"nav-item"+(isActive?" active":"")} onClick={() => { if (tab.hasScreen) onNavigate(tab.key as Screen); else if (tab.key==="briefs") onNavigate("briefs" as Screen); }} aria-label={tab.label} aria-current={isActive ? "page" : undefined} style={buttonStyle}>
            <span className="nav-icon" style={iconStyle}>{tab.icon}</span>
            <span className="nav-label" style={labelStyle}>{" " + tab.label}</span>
          </button>
        );
      })}
      <button className="nav-item" onClick={() => onHamburgerToggle?.()} aria-label="Menu" style={{ position: "relative" }}>
        <span className="nav-icon"><FiMenu size={22} /></span>
        <span>Menu</span>
        {unreadCount ? <span style={{ position: "absolute", top: 4, right: 6, minWidth: 16, height: 16, borderRadius: 8, background: "var(--coral)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>
    </div>
  );
});