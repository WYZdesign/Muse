"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import Nav from "../components/Nav";
import { ALL_STUDIOS, type StudioProfile } from "../components/studios";
import type { Screen } from "../components/types";

interface StudiosScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  openHamburger?: () => void;
  unreadNotificationCount?: number;
  apiFetch: (url: string, opts?: any) => Promise<any>;
}

export const StudiosScreen = memo(function StudiosScreen({
  screen,
  showScreen,
  openHamburger = () => {},
  unreadNotificationCount,
  apiFetch,
}: StudiosScreenProps) {
  const [activeStudio, setActiveStudio] = useState<string>(ALL_STUDIOS[0]?.id || "fd");
  const [activeBuilding, setActiveBuilding] = useState<string | null>(ALL_STUDIOS[0]?.buildings[0]?.id || null);
  const [oracleQ, setOracleQ] = useState("");
  const [oracleAnswer, setOracleAnswer] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const studio: StudioProfile = ALL_STUDIOS.find((s) => s.id === activeStudio) || ALL_STUDIOS[0];
  const building = studio.buildings.find((b) => b.id === activeBuilding) || studio.buildings[0];

  const selectStudio = (id: string) => {
    const s = ALL_STUDIOS.find((x) => x.id === id);
    setActiveStudio(id);
    setActiveBuilding(s?.buildings[0]?.id || null);
    setOracleAnswer(null);
    setOracleQ("");
    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-event", name: "studio_tab_click", props: { studio: id } }) }).catch(() => {});
  };

  const askOracle = () => {
    const q = oracleQ.trim().toLowerCase();
    if (!q || !studio) return;
    const hit = studio.oracle.find((o) => o.q.toLowerCase().includes(q) || o.a.toLowerCase().includes(q));
    setOracleAnswer(hit ? hit.a : "I can help with booking, pricing, what's included, and house rules for " + studio.name + ". Ask about any of those.");
  };

  return (
    <div className={"screen-el" + (screen === "studios" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="chat-back" onClick={() => showScreen("sessions")} aria-label="Back"><FiArrowLeft size={20} /></button>
        <div className="logo-link" style={{ fontSize: 30, backgroundImage: "linear-gradient(90deg,#E1BEE7,#9C27B0,#FF4081,#E1BEE7,#9C27B0,#E1BEE7)", backgroundSize: "300% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", position: "relative", margin: 0, padding: 0, animation: "lavaFlow 7s ease-in-out infinite,logoShimmer 4s ease-in-out infinite" }}>LA Studios</div>
        <div style={{ width: 42 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 90px" }}>
        {/* Main studio tabs */}
        <div style={{ display: "flex", gap: 8, padding: "8px 0 14px" }}>
          {ALL_STUDIOS.map((s) => (
            <button key={s.id} onClick={() => selectStudio(s.id)} style={{ flex: 1, minWidth: 0, padding: "10px 8px", borderRadius: 12, border: "1px solid", borderColor: activeStudio === s.id ? s.color[0] : "rgba(255,255,255,0.08)", background: activeStudio === s.id ? `linear-gradient(135deg, ${s.color[0]}22, ${s.color[1]}22)` : "rgba(255,255,255,0.03)", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: activeStudio === s.id ? s.color[0] : "var(--text2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
              <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.buildings.reduce((n, b) => n + b.studios.length, 0)} spaces</div>
            </button>
          ))}
        </div>

        {/* Studio hero */}
        <div style={{ padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${studio.color[0]}18, ${studio.color[1]}18)`, border: `1px solid ${studio.color[0]}30`, marginBottom: 14 }}>
          {(studio as any).img && (
            <div style={{ width: "100%", height: 150, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={(studio as any).img} alt={studio.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ fontSize: 18, fontWeight: 800 }}>{studio.name}</div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3, lineHeight: 1.45 }}>{studio.tagline}</div>
          <a href={studio.siteUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 10, color: "#fff", background: `linear-gradient(135deg, ${studio.color[0]}, ${studio.color[1]})`, textDecoration: "none" }}>Visit {studio.name} ↗</a>
        </div>

        {/* Sub-tabs: buildings */}
        {studio.buildings.length > 1 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "thin" }}>
            {studio.buildings.map((b) => (
              <button key={b.id} onClick={() => setActiveBuilding(b.id)} style={{ flexShrink: 0, padding: "7px 12px", borderRadius: 99, border: "1px solid", borderColor: activeBuilding === b.id ? studio.color[0] : "rgba(255,255,255,0.1)", background: activeBuilding === b.id ? `${studio.color[0]}1e` : "transparent", color: activeBuilding === b.id ? studio.color[0] : "var(--text2)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{b.emoji} {b.label}</button>
            ))}
          </div>
        )}

        {/* Spaces (sub-widget) */}
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            <span>{building?.emoji}</span><span style={{ fontWeight: 700, color: "var(--text)" }}>{building?.label}</span>
            <span style={{ marginLeft: "auto" }}>{building?.hours} · {building?.phone}</span>
          </div>
          {(building?.studios || []).map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {s.img && (
                <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1, lineHeight: 1.35 }}>{s.feature}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", marginTop: 3 }}>{s.price}/hr</div>
              </div>
              <a href={`${studio.siteUrl.replace(/\/$/, "")}`} target="_blank" rel="noopener noreferrer" onClick={() => apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-event", name: "studio_book_click", props: { studio: studio.id, space: s.id } }) }).catch(() => {})} style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: "8px 12px", borderRadius: 10, color: "#fff", background: `linear-gradient(135deg, ${studio.color[0]}, ${studio.color[1]})`, textDecoration: "none", whiteSpace: "nowrap" }}>Book ↗</a>
            </div>
          ))}
        </div>

        {/* Studio rules dropdown (FD has the detailed client guide; others have a short one) */}
        {studio.rules && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div role="button" tabIndex={0} aria-expanded={rulesOpen} onClick={() => setRulesOpen(!rulesOpen)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRulesOpen(!rulesOpen); } }} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "var(--text)" }}>
              <div style={{ fontSize: 18 }}>📖</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 800 }}>Studio Guide — booking, rules & FAQs</div>
              <div style={{ fontSize: 12, color: rulesOpen ? studio.color[0] : "var(--gold)", fontWeight: 700 }}>{rulesOpen ? "−" : "+"}</div>
            </div>
            {rulesOpen && (
              <div style={{ marginTop: 10 }}>
                {studio.rules.map((r) => (
                  <div key={r.title} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: studio.color[0], marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>{r.icon} {r.title}</div>
                    {r.items.map((it, i) => <div key={i} style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.6, paddingLeft: 10, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--gold)" }}>·</span>{it}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Oracle — FD tab only (has scraped knowledge); others show general FAQ */}
        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>🔮 {studio.name} Oracle</div>
          <input className="inp" placeholder={studio.id === "fd" ? "Ask about booking, pricing, what's included…" : "Ask about this studio…"} value={oracleQ} onChange={(e) => setOracleQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") askOracle(); }} style={{ margin: 0 }} />
          <button className="btn btn-gold" style={{ marginTop: 8, padding: "10px 0", borderRadius: 10, fontWeight: 700, fontSize: 12.5 }} onClick={askOracle}>Ask</button>
          {oracleAnswer && <div style={{ marginTop: 10, fontSize: 12, color: "var(--text2)", lineHeight: 1.6, padding: "10px 12px", borderRadius: 10, background: "rgba(255,215,0,0.06)" }}>{oracleAnswer}</div>}
        </div>
      </div>
      <Nav active="sessions" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});
