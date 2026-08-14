"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
}

const PANEL = {
  position: "fixed",
  bottom: 92,
  right: 16,
  width: 340,
  maxWidth: "calc(100vw - 32px)",
  height: 440,
  maxHeight: "70vh",
  background: "rgba(15,10,28,0.97)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 20,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  zIndex: 9999,
  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
} as const;

const FAB = {
  position: "fixed",
  bottom: 24,
  right: 16,
  width: 56,
  height: 56,
  borderRadius: 28,
  border: "none",
  background: "linear-gradient(135deg, #ffd700, #ff8c00)",
  color: "#0a0612",
  fontSize: 24,
  fontWeight: 800,
  cursor: "pointer",
  zIndex: 9998,
  boxShadow: "0 8px 24px rgba(255,180,0,0.35)",
} as const;

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", text: "Hi! I'm the Muse assistant. Ask me anything about bookings, safety, albums, verification, or your account." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const r = await fetch("/api/muse/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await r.json();
      const text = d.answer || "Sorry, I couldn't answer that. Email support@wyzdesign.com.";
      setMessages((m) => [...m, { role: "assistant", text, sources: d.sources }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong. Email support@wyzdesign.com." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div style={PANEL}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#f5f0ff" }}>Muse Assistant</div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  background: m.role === "user" ? "linear-gradient(135deg, #ffd700, #ff8c00)" : "rgba(255,255,255,0.08)",
                  color: m.role === "user" ? "#0a0612" : "#f5f0ff",
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {m.text}
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginTop: 4, paddingLeft: 4 }}>
                    Source: {m.sources.join(", ")}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "8px 14px", background: "rgba(255,255,255,0.06)", borderRadius: 14 }}>
                Typing…
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about Muse…"
              style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f0ff", fontSize: 13.5, outline: "none" }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{ padding: "10px 16px", borderRadius: 12, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>
              Send
            </button>
          </div>
        </div>
      )}

      <button style={FAB} onClick={() => setOpen((o) => !o)} aria-label="Help">
        {open ? "✕" : "?"}
      </button>
    </>
  );
}
