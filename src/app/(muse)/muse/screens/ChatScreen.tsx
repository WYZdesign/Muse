"use client";

import React, { memo, useState } from "react";
import Image from "next/image";
import { FiArrowLeft, FiImage, FiSend, FiMoreVertical, FiFlag, FiUserX, FiSlash } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";

export interface ChatScreenProps {
  screen: Screen;
  chatTarget: any;
  setChatTarget: React.Dispatch<React.SetStateAction<any>>;
  showScreen: (s: Screen) => void;
  goBack?: () => void;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  chatText: string;
  setChatText: (t: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  sendChat: () => void;
  sendChatImg?: (url: string) => void;
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
  showToast?: (msg: string | { msg: string; onTap?: () => void }) => void;
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
  goBack,
  messages,
  setMessages,
  chatText,
  setChatText,
  messagesEndRef,
  sendChat,
  sendChatImg,
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
  showToast,
  uploadImage,
}: ChatScreenProps) {
  // Blur-then-reveal chat image messages (consistent with Discover/BTS/Portfolio):
  // chat media can be sensitive, so it's blurred until the viewer taps to reveal,
  // instead of rendering unblurred like a plain img.
  const [revealedChatImgs, setRevealedChatImgs] = useState<Set<string>>(() => new Set());
  // Report/Unmatch/Block were fully wired end-to-end (setters passed as props,
  // modals built and rendered in page.tsx) but had no entry point anywhere in
  // the app to actually reach them from an active conversation — a real gap,
  // not a style choice. This menu is that entry point.
  const [showChatMenu, setShowChatMenu] = useState(false);
  return (
    <div className={"screen-el" + (screen === "chat" && chatTarget ? " active" : "")} data-screen="chat">
      {chatTarget && (
        <div className="chat-wrap">
          <div className="chat-header">
            <button className="chat-back" onClick={() => (goBack ? goBack() : showScreen("matches"))}><FiArrowLeft size={20} /></button>
            <Image loading="lazy" src={chatTarget.img} alt={chatTarget.name} width={40} height={40} className="chat-avatar" onError={handleImgError} onClick={() => setViewProfile(chatTarget)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewProfile(chatTarget); } }} style={{ cursor: "pointer" }} />
            {/* Audit fix (2026-09-08, wyzmind's Torreé batch item 4): only the
                40px avatar circle opened the full profile — the name/type text
                right beside it (the larger, more natural tap target most people
                would actually go for) did nothing. Wired the whole info block to
                the same setViewProfile call. */}
            <div className="chat-info" role="button" tabIndex={0} onClick={() => setViewProfile(chatTarget)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewProfile(chatTarget); } }} style={{ cursor: "pointer" }}>
              <div className="chat-name">{chatTarget.name}</div>
              <div className="chat-type">{typingTarget === chatTarget.id ? <span style={{ color: "var(--gold)", fontStyle: "italic" }}>typing…</span> : chatTarget.type}</div>
            </div>
            <div style={{ position: "relative" }}>
              <button
                className="chat-back"
                aria-label="Chat options"
                aria-haspopup="menu"
                aria-expanded={showChatMenu}
                onClick={() => setShowChatMenu(v => !v)}
              ><FiMoreVertical size={20} /></button>
              {showChatMenu && (
                <>
                  <div role="presentation" aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setShowChatMenu(false)} />
                  <div role="menu" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 999, minWidth: 168, background: "#1a0a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
                    <button role="menuitem" onClick={() => { setShowChatMenu(false); setShowReport(true); setReportTarget({ id: chatTarget.id, type: "user", name: chatTarget.name }); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}><FiFlag size={14} /> Report</button>
                    <button role="menuitem" onClick={() => { setShowChatMenu(false); setUnmatchTarget({ id: chatTarget.id, name: chatTarget.name }); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}><FiUserX size={14} /> Unmatch</button>
                    <button role="menuitem" onClick={() => { setShowChatMenu(false); setBlockTarget({ id: chatTarget.id, name: chatTarget.name }); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", color: "#ff6b6b", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}><FiSlash size={14} /> Block</button>
                  </div>
                </>
              )}
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
                {msg.img && (
                  <div style={{ position: "relative", display: "inline-block" }} onClick={() => setRevealedChatImgs(prev => { const n = new Set(prev); n.add(String(msg.img)); return n; })} role="button" tabIndex={0} aria-label="Reveal image">
                    <Image loading="lazy" src={msg.img} alt="Photo" width={200} height={200} style={{ width: "auto", height: "auto", maxWidth: 200, borderRadius: 12, marginBottom: 6, display: "block", filter: revealedChatImgs.has(String(msg.img)) ? "none" : "blur(24px)", transition: "filter .2s" }} />
                    {!revealedChatImgs.has(String(msg.img)) && (
                      <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, color: "#fff", background: "rgba(10,6,18,0.6)", padding: "4px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>Tap to reveal</span>
                    )}
                  </div>
                )}
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
            <label style={{ cursor: "pointer", color: "var(--muted)", fontSize: 18, display: "flex", alignItems: "center", alignSelf: "center" }}>
              <FiImage size={22} />
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                e.target.value = "";
                if (!uploadImage) { showToast?.("Image upload unavailable"); return; }
                showToast?.("Uploading image...");
                const url = await uploadImage(f, "chat");
                if (url) sendChatImg?.(url);
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
