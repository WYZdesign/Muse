"use client";

import React, { memo } from "react";
import { FiArrowLeft, FiImage, FiSend } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";

export interface ChatScreenProps {
  screen: Screen;
  chatTarget: any;
  setChatTarget: React.Dispatch<React.SetStateAction<any>>;
  showScreen: (s: Screen) => void;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  chatText: string;
  setChatText: (t: string) => void;
  chatImg: string;
  setChatImg: (s: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  sendChat: () => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  setViewProfile: (p: any) => void;
  setUnmatchTarget: (t: any) => void;
  setBlockTarget: (t: any) => void;
  setShowReport: (v: boolean) => void;
  setReportTarget: (t: any) => void;
  typingTarget: any;
  realtimeStatus: "connecting" | "connected" | "disconnected";
  sendTyping: any;
  openHamburger?: () => void;
  unreadNotificationCount?: number;
  showToast?: (msg: string) => void;
  uploadImage?: (file: File, context: string) => Promise<string | null>;
  authUser?: any;
  chatInput?: string;
  setChatInput?: (v: string) => void;
  sendTypingRef?: React.MutableRefObject<() => void>;
  setMatches?: React.Dispatch<React.SetStateAction<any[]>>;
  persistMessage?: (opts: { myId: string; theirId: string; text: string; img?: string }) => Promise<void>;
  getIcebreaker?: (type: string, seed?: string) => string;
  sendMsg?: (text?: string) => void;
  themTyping?: boolean;
}

export const ChatScreen = memo(function ChatScreen({
  screen,
  chatTarget,
  setChatTarget,
  showScreen,
  messages,
  setMessages,
  chatText,
  setChatText,
  chatImg,
  setChatImg,
  messagesEndRef,
  sendChat,
  handleImgError,
  setViewProfile,
  setUnmatchTarget,
  setBlockTarget,
  setShowReport,
  setReportTarget,
  typingTarget,
  realtimeStatus,
  sendTyping,
  openHamburger,
  unreadNotificationCount,
}: ChatScreenProps) {
  return (
    <div className={"screen-el" + (screen === "chat" && chatTarget ? " active" : "")}>
      {chatTarget && (
        <div className="chat-wrap">
          <div className="chat-header">
            <button className="chat-back" onClick={() => showScreen("matches")}><FiArrowLeft size={20} /></button>
            <img loading="lazy" src={chatTarget.img} alt={chatTarget.name} className="chat-avatar" onError={handleImgError} onClick={() => setViewProfile(chatTarget)} style={{ cursor: "pointer" }} />
            <div className="chat-info">
              <div className="chat-name">{chatTarget.name}</div>
              <div className="chat-type">{typingTarget === chatTarget.id ? <span style={{ color: "var(--gold)", fontStyle: "italic" }}>typing…</span> : chatTarget.type}</div>
            </div>
          </div>
          {realtimeStatus === "disconnected" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#ffb347", background: "rgba(255,140,0,0.12)", borderBottom: "1px solid rgba(255,140,0,0.25)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffb347", animation: "pulseDot 1.2s ease-in-out infinite" }} />
              Reconnecting… messages will resume automatically
            </div>
          )}
          <div className="messages" ref={messagesEndRef as any}>
            {(chatTarget.messages || []).length === 0 && !(typingTarget === chatTarget.id) && (
              <div style={{ textAlign: "center", padding: "48px 24px 24px", color: "var(--muted)" }}>
                <div style={{ fontSize: 38, marginBottom: 12 }}>🌊</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>You matched with {chatTarget.name}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>Break the ice with a quick reply below, or send your own message to kick things off.</div>
              </div>
            )}
            {(chatTarget.messages || []).map((msg: any, i: number) => (
              <div key={i} className={"msg " + (msg.from === "me" ? "msg-me" : "msg-them")}>
                {msg.img && <img loading="lazy" src={msg.img} alt="" style={{ maxWidth: 200, borderRadius: 12, marginBottom: 6, display: "block" }} />}
                {msg.text && <div>{msg.text}</div>}
                <div className="msg-time" style={{ textAlign: msg.from === "me" ? "right" : "left", marginTop: 4, fontSize: 10, color: msg.from === "me" ? "rgba(10,6,18,0.4)" : "var(--muted)" }}>
                  {msg.time}{msg.from === "me" && <span style={{ marginLeft: 4 }}>{i === (chatTarget.messages || []).length - 1 ? "✓✓" : "✓"}</span>}
                </div>
              </div>
            ))}
            {typingTarget === chatTarget.id && (
              <div className="msg msg-them" style={{ padding: "10px 16px" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--muted)", animation: "typingDot 1.4s infinite" }} />
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--muted)", animation: "typingDot 1.4s infinite .2s" }} />
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--muted)", animation: "typingDot 1.4s infinite .4s" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef as any} />
          </div>
          <div className="quick-replies">
            {["Hey! Love your work", "Let's collab", "What's your vision?", "Love your portfolio"].map(q => (
              <button key={q} className="quick-reply" onClick={() => { setChatText(q); }}>{q}</button>
            ))}
          </div>
          <div className="chat-input-wrap">
            <label style={{ cursor: "pointer", color: "var(--muted)", fontSize: 18, display: "flex", alignItems: "center" }}>
              <FiImage size={18} />
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = URL.createObjectURL(f);
                  setChatImg(url);
                }
              }} />
            </label>
            <input className="chat-inp" placeholder="Type a message..." value={chatText} onChange={e => { setChatText(e.target.value); if (sendTyping) sendTyping(); }} onKeyDown={e => { if (e.key === "Enter" && chatText.trim()) { sendChat(); } }} />
            <button className="send-btn" onClick={() => sendChat()}><FiSend size={18} /></button>
          </div>
        </div>
      )}
      <Nav active="matches" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default ChatScreen;
