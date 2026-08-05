"use client";
import { FiCompass, FiUsers, FiZap, FiCamera, FiEye, FiMenu } from "react-icons/fi";
import { isValidElement } from "react";
import type { Screen } from "./types";

const lineColor: Record<string,string> = {
  discover: "#FFD700",
  connections: "#4169E1",
  briefs: "#20B2AA",
  matches: "#FF8C00",
  moments: "#FF69B4",
};

const tabs: { key: string; label: string; icon: React.ReactNode; hasScreen: boolean }[] = [
  { key:"discover", label:"Discover", icon:<FiCompass size={22} />, hasScreen:true },
  { key:"connections", label:"Feed", icon:<FiUsers size={22} />, hasScreen:true },
  { key:"briefs", label:"Collab", icon:<FiZap size={22} />, hasScreen:false },
  { key:"matches", label:"Matches", icon:<FiCamera size={22} />, hasScreen:true },
  { key:"moments", label:"BTS", icon:<FiEye size={22} />, hasScreen:true },
];

export default function Nav({ active, onNavigate, onHamburgerToggle, unreadCount }: { active: string; onNavigate: (s: Screen) => void; onHamburgerToggle?: () => void; unreadCount?: number }) {
  const activeIconStyle = (color: string) => ({
    color,
    filter: "drop-shadow(0 0 8px " + color + "80) drop-shadow(0 0 12px " + color + "40) hue-rotate(0deg)",
    animation: "hueShift 3s ease-in-out infinite"
  });

  const activeLabelStyle = (color: string): React.CSSProperties => ({
    color,
    fontWeight: 800,
    background: "linear-gradient(90deg," + color + ",rgba(255,255,255,0.95)," + color + "," + color + ")",
    backgroundSize: "200% 100%",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: "gradientShift 4s ease-in-out infinite"
  });

  return (
    <div className="nav" role="navigation" aria-label="Main navigation">
      {tabs.map(tab => {
        const isActive = active === tab.key;
        const color = lineColor[tab.key] || "#FFD700";
        return (
          <button key={tab.key} className={"nav-item"+(isActive?" active":"")} onClick={() => { if (tab.hasScreen) onNavigate(tab.key as Screen); else if (tab.key==="briefs") onNavigate("briefs" as Screen); }} aria-label={tab.label} aria-current={isActive ? "page" : undefined} style={isActive ? { ["--line-color" as string]: color } : undefined}>
            <span className="nav-icon" style={isActive ? activeIconStyle(color) : undefined}>{tab.icon}</span>
            <span style={isActive ? activeLabelStyle(color) : { color:"var(--muted)", fontWeight:600 }}>{tab.label}</span>
          </button>
        );
      })}
      <button className="nav-item" onClick={() => onHamburgerToggle?.()} aria-label="Menu" style={{ position: "relative" }}>
        <span className="nav-icon"><FiMenu size={22} /></span>
        {unreadCount && unreadCount > 0 ? <span style={{ position: "absolute", top: 2, right: 6, width: 16, height: 16, borderRadius: 8, background: "#ff6b6b", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
        <span>Menu</span>
      </button>
    </div>
  );
}
