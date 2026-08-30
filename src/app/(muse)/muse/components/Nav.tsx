"use client";
import React from "react";
import { FiCompass, FiUsers, FiZap, FiCamera, FiEye, FiMenu, FiStar } from "react-icons/fi";
import type { Screen } from "./types";

const lineColor: Record<string,string> = {
  discover: "#FFD700",
  connections: "#1E90FF",
  briefs: "#20B2AA",
  matches: "#FF4500",
  moments: "#FF1493",
  bts: "#FF4500",
};

const lavaGradients: Record<string, string> = {
  discover: "linear-gradient(90deg,#FFD700,#FF8C69,#FFB6C1,#FFD700,#FFA07A,#FFD700)",
  connections: "linear-gradient(90deg,#1E90FF,#87CEEE,#B0C4DE,#1E90FF,#ADD8E6,#1E90FF)",
  briefs: "linear-gradient(90deg,#20B2AA,#9ACD32,#00CED1,#20B2AA,#7CFC00,#20B2AA)",
  matches: "linear-gradient(90deg,#FF4500,#FFD700,#FFAA00,#FF4500,#FF8C00,#FF4500)",
  moments: "linear-gradient(90deg,#FF1493,#FF0000,#DDA0DD,#FF1493,#FF69B4,#FF1493)",
  bts: "linear-gradient(90deg,#FF4500,#FFA500,#FFFF00,#FFA500,#FF4500)",
};

const tabs: { key: string; label: string; icon: React.ReactNode; hasScreen: boolean }[] = [
  { key:"discover", label:"Discover", icon:<FiCompass size={22} />, hasScreen:true },
  { key:"connections", label:"Feed", icon:<FiUsers size={22} />, hasScreen:true },
  { key:"briefs", label:"Collab", icon:<FiZap size={22} />, hasScreen:false },
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
        const gradientStyle = isActive ? {
          background: lava,
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          animation: "lavaFlow 4s ease-in-out infinite",
        } as React.CSSProperties : undefined;
        const iconGradient = isActive ? {
          background: lava,
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "lavaFlow 4s ease-in-out infinite",
          filter: "none",
        } as React.CSSProperties : undefined;
        return (
          <button key={tab.key} className={"nav-item"+(isActive?" active":"")} onClick={() => { if (tab.hasScreen) onNavigate(tab.key as Screen); else if (tab.key==="briefs") onNavigate("briefs" as Screen); }} aria-label={tab.label} aria-current={isActive ? "page" : undefined} style={{ "--line-color": color } as React.CSSProperties}>
            <span className="nav-icon" style={isActive ? { ...iconGradient, display:"inline-flex", alignItems:"center", justifyContent:"center" } : undefined}>{tab.icon}</span>
            <span className="nav-label" style={isActive ? gradientStyle : { color:"var(--muted)", fontWeight: 600 }}>{" " + tab.label}</span>
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
