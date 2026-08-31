"use client";

import React, { memo } from "react";
import { FiArrowLeft } from "react-icons/fi";
import type { Screen, Match } from "../components/types";
import Nav from "../components/Nav";
import MyAlbumsManager from "../components/MyAlbumsManager";

export interface PortfolioScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  openHamburger: () => void;
  unreadNotificationCount: number;
  matches: Match[];
  getAccessToken: () => string | null;
  uploadImage: (file: File, folder: string) => Promise<string | null>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
}

export const PortfolioScreen = memo(function PortfolioScreen({
  screen,
  showScreen,
  openHamburger,
  unreadNotificationCount,
  matches,
  getAccessToken,
  uploadImage,
  showToast,
}: PortfolioScreenProps) {
  return (
    <div className={"screen-el" + (screen === "portfolio" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div className="logo-link" style={{
          fontSize: 30,
          backgroundImage: "linear-gradient(90deg,#20B2AA,#9ACD32,#00CED1,#20B2AA,#7CFC00,#20B2AA)",
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
        }}>Portfolio</div>
        <div style={{ width: 42 }} />
      </div>
      <div className="portfolio-scroll">
        <MyAlbumsManager
          authToken={getAccessToken() || ""}
          uploadImage={uploadImage}
          showToast={showToast}
          matchOptions={matches.map((m: any) => ({ id: m.id, name: m.name, avatar: m.img || m.avatar }))}
        />
      </div>
      <Nav active="portfolio" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default PortfolioScreen;
