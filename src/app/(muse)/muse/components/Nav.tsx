"use client";
import { FiCompass, FiUsers, FiZap, FiCamera, FiMenu } from "react-icons/fi";
import type { Screen } from "./types";

const gradMap: Record<string,string> = {
  discover: "linear-gradient(90deg,#FFD700,#FF8A80,#D4A5FF)",
  connections: "linear-gradient(90deg,#87CEEB,#64B5F6,#7B68EE)",
  briefs: "linear-gradient(90deg,#98FB98,#66BB6A,#00BCD4)",
  matches: "linear-gradient(90deg,#FF69B4,#FF4757,#FF6B6B)",
  moments: "linear-gradient(90deg,#FF6B6B,#FFD93D,#6BCB77)",
};

const tabs: { key: Screen|string; label: string; icon: React.ReactNode; hasScreen: boolean }[] = [
  { key:"discover", label:"Discover", icon:<FiCompass size={22} />, hasScreen:true },
  { key:"connections", label:"Feed", icon:<FiUsers size={22} />, hasScreen:true },
  { key:"briefs", label:"Collab", icon:<FiZap size={22} />, hasScreen:false },
  { key:"matches", label:"Matches", icon:<FiCamera size={22} />, hasScreen:true },
  { key:"moments", label:"BTS", icon:<FiCamera size={22} />, hasScreen:true },
];

export default function Nav({ active, onNavigate, onHamburgerToggle }: { active: string; onNavigate: (s: Screen) => void; onHamburgerToggle?: () => void }) {
  return (
    <div className="nav" role="navigation" aria-label="Main navigation">
      {tabs.map(tab => {
        const isActive = active === tab.key;
        const grad = gradMap[tab.key] || gradMap.discover;
        return (
          <button key={tab.key} className={"nav-item"+(isActive?" active":"")} onClick={() => { if (tab.hasScreen) onNavigate(tab.key as Screen); else if (tab.key==="briefs") onNavigate("briefs"); }} aria-label={tab.label} aria-current={isActive ? "page" : undefined}>
            <span className={"nav-icon"+(isActive?" nav-icon-glow":"")} style={isActive?{background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",animation:"iconHueShift 4s ease-in-out infinite"}:{color:grad.split(",")[0].replace("linear-gradient(90deg,",""),opacity:0.55}}>{tab.icon}</span>
            <span style={isActive?{background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",fontWeight:800,animation:"iconHueShift 4s ease-in-out infinite"}:{color:grad.split(",")[0].replace("linear-gradient(90deg,",""),opacity:0.55,fontWeight:600}}>{tab.label}</span>
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
