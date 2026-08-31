"use client";

import React, { memo } from "react";
import { FiArrowLeft } from "react-icons/fi";
import FdStudioWidget from "../components/FdStudioWidget";
import type { Screen } from "../components/types";

export interface FdStudioScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
}

export const FdStudioScreen = memo(function FdStudioScreen({ screen, showScreen, apiFetch }: FdStudioScreenProps) {
  return (
    <div className={"screen-el" + (screen === "fdstudio" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="chat-back" onClick={() => showScreen("sessions")}><FiArrowLeft size={20} /></button>
        <div className="logo-link" style={{ fontSize: 30, backgroundImage: "linear-gradient(90deg,#E1BEE7,#9C27B0,#FF4081,#E1BEE7,#9C27B0,#E1BEE7)", backgroundSize: "300% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", position: "relative", margin: 0, padding: 0, animation: "lavaFlow 7s ease-in-out infinite,logoShimmer 4s ease-in-out infinite" }}>Studio</div>
        <div style={{ width: 42 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
        <FdStudioWidget apiFetch={apiFetch} />
      </div>
    </div>
  );
});

export default FdStudioScreen;
