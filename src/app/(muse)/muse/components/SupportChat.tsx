"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
}

const PANEL = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: "72vh",
  background: "rgba(15,10,28,0.98)",
  borderTop: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "24px 24px 0 0",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  zIndex: 9999,
  boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
} as const;

const GREETING = "Hey, I'm Muse — your creative wingmate. 🌊 Whether you're figuring out bookings, wondering how verification works, or just want tips on putting your best work forward, I've got you. What can I help you with?";

export default function SupportChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", text: GREETING },
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
      const text = d.answer || "Hmm, I'm not sure about that one. Email info@wyzdesign.com and we'll sort you out.";
      setMessages((m) => [...m, { role: "assistant", text, sources: d.sources }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong on my end. Email info@wyzdesign.com and we'll sort you out." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div style={PANEL}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #ffd700, #ff8c00)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0a0612", fontSize: 16 }}>M</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#f5f0ff" }}>Muse Assistant</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>Online · here to help</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 20, cursor: "pointer", padding: 4 }} aria-label="Close">✕</button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <div style={{
              padding: "11px 14px",
              borderRadius: 16,
              background: m.role === "user" ? "linear-gradient(135deg, #ffd700, #ff8c00)" : "rgba(255,255,255,0.08)",
              color: m.role === "user" ? "#0a0612" : "#f5f0ff",
              fontSize: 13.5,
              lineHeight: 1.55,
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
            Thinking…
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask me anything…"
          style={{ flex: 1, padding: "11px 14px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f0ff", fontSize: 13.5, outline: "none" }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{ padding: "11px 18px", borderRadius: 14, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  );
}
