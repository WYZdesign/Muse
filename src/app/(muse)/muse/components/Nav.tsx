"use client";
import { FiCompass, FiUsers, FiZap, FiCamera, FiEye, FiMenu } from "react-icons/fi";
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

export default function Nav({ active, onNavigate, onHamburgerToggle }: { active: string; onNavigate: (s: Screen) => void; onHamburgerToggle?: () => void }) {
  return (
    <div className="nav" role="navigation" aria-label="Main navigation">
      {tabs.map(tab => {
        const isActive = active === tab.key;
        const color = lineColor[tab.key] || "#FFD700";
        return (
          <button key={tab.key} className={"nav-item"+(isActive?" active":"")} onClick={() => { if (tab.hasScreen) onNavigate(tab.key as Screen); else if (tab.key==="briefs") onNavigate("briefs" as Screen); }} aria-label={tab.label} aria-current={isActive ? "page" : undefined} style={isActive ? { ["--line-color" as string]: color } : undefined}>
            <span className="nav-icon" style={isActive?{color}:undefined}>{tab.icon}</span>
            <span style={isActive?{color,fontWeight:800}:{color:"var(--muted)",fontWeight:600}}>{tab.label}</span>
          </button>
        );
      })}
      <button className="nav-item" onClick={() => onHamburgerToggle?.()} aria-label="Menu">
        <span className="nav-icon"><FiMenu size={22} /></span>
        <span>Menu</span>
      </button>
    </div>
  );
}
