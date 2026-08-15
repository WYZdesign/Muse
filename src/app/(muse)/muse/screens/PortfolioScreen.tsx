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
  showToast: (msg: string) => void;
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
      <div className="hdr">
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div className="logo-link" style={{ fontSize: 32, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>Portfolio</div>
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
