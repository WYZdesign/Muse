"use client";

import { useState } from "react";
import { FiArrowLeft, FiX } from "react-icons/fi";
import { ZE, CE, calcZodiac, calcChineseZodiac, calcLifePath, calcMbti } from "./types";

type TestKey = "zodiac" | "chinese" | "mbti" | "lifepath";

interface SelfDiscoveryModalProps {
  open: boolean;
  onClose: () => void;
  obData: any;
  onSaved: (key: string, value: any) => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (m: string) => void;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SelfDiscoveryModal({ open, onClose, obData, onSaved, apiFetch, showToast }: SelfDiscoveryModalProps) {
  const [view, setView] = useState<TestKey | "menu">("menu");
  const [saving, setSaving] = useState(false);

  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [mbtiAnswers, setMbtiAnswers] = useState<Record<string, string>>({});

  if (!open) return null;

  const resetInputs = () => {
    setBirthMonth("");
    setBirthDay("");
    setBirthYear("");
    setMbtiAnswers({});
  };

  const goBackToMenu = () => {
    resetInputs();
    setView("menu");
  };

  const save = async (apiKey: string, localKey: string, value: any, toast: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await apiFetch("/api/muse/auth", { method: "POST", body: JSON.stringify({ action: "update-profile", [apiKey]: value }) });
      onSaved(localKey, value);
      showToast(toast);
      goBackToMenu();
    } catch {
      showToast("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  };

  const menuItems: { key: TestKey; label: string; value: any }[] = [
    { key: "zodiac", label: "Zodiac", value: obData?.zodiac },
    { key: "chinese", label: "Chinese Zodiac", value: obData?.chinese },
    { key: "mbti", label: "MBTI", value: obData?.mbti },
    { key: "lifepath", label: "Life Path", value: obData?.lifePath },
  ];

  const chip = (selected: boolean, onClick: () => void, label: string) => (
    <div
      className={"chip" + (selected ? " sel" : "")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      onClick={onClick}
    >
      <span>{label}</span>
    </div>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9600, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      role="presentation"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, maxHeight: "88vh", background: "var(--panel-bg-solid)", backdropFilter: "blur(30px)", borderRadius: "24px 24px 0 0", border: "1px solid var(--border-subtle)", borderBottom: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {view !== "menu" && (
              <button onClick={goBackToMenu} aria-label="Back" style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", padding: 6, display: "flex" }}><FiArrowLeft size={20} /></button>
            )}
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>Self Discovery</div>
          </div>
          <button onClick={onClose} aria-label="Close Self Discovery" style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", padding: 6 }}><FiX size={20} /></button>
        </div>

        <div style={{ padding: "16px 20px 28px", overflowY: "auto" }}>
          {view === "menu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>Know yourself to find your creative match</div>
              {menuItems.map(({ key, label, value }) => (
                <button
                  key={key}
                  className="btn btn-outline"
                  style={{ textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}
                  onClick={() => { resetInputs(); setView(key); }}
                >
                  <span style={{ flex: 1 }}>{value ? String(value) : "Take " + label + " test"}</span>
                  <span style={{ fontSize: 12, color: "var(--gold)" }}>{value ? "Retake" : "Start"}</span>
                </button>
              ))}
            </div>
          )}

          {view === "zodiac" && (
            <div>
              <div className="step-title">Zodiac Calculator</div>
              <div className="step-sub">Enter your birth date</div>
              <select className="inp" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
              </select>
              <input className="inp" placeholder="Day" type="number" min={1} max={31} value={birthDay} onChange={(e) => setBirthDay(e.target.value)} />
              <button className="btn btn-gold" disabled={saving} onClick={() => { if (birthMonth && birthDay) { const z = calcZodiac(parseInt(birthMonth), parseInt(birthDay)); save("zodiac", "zodiac", z, "You are a " + z + "! " + ZE[z]); } }}>Calculate</button>
              <button className="back-link" onClick={goBackToMenu}>Back</button>
            </div>
          )}

          {view === "chinese" && (
            <div>
              <div className="step-title">Chinese Zodiac</div>
              <div className="step-sub">Enter your birth year</div>
              <input className="inp" placeholder="Year (e.g. 1995)" type="number" min={1900} max={2026} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
              <button className="btn btn-gold" disabled={saving} onClick={() => { if (birthYear) { const c = calcChineseZodiac(parseInt(birthYear)); save("chinese", "chinese", c, "You are the " + c + "! " + CE[c]); } }}>Calculate</button>
              <button className="back-link" onClick={goBackToMenu}>Back</button>
            </div>
          )}

          {view === "mbti" && (
            <div>
              <div className="step-title">MBTI Personality</div>
              <div className="step-sub">Pick what fits best</div>
              <div style={{ width: "100%", maxWidth: 320 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>At a party, you...</div>
                <div className="chips" style={{ marginBottom: 16 }}>
                  {chip(mbtiAnswers.ei === "e", () => setMbtiAnswers((p) => ({ ...p, ei: "e" })), "Talk to everyone")}
                  {chip(mbtiAnswers.ei === "i", () => setMbtiAnswers((p) => ({ ...p, ei: "i" })), "Find one person")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>You prefer...</div>
                <div className="chips" style={{ marginBottom: 16 }}>
                  {chip(mbtiAnswers.sn === "s", () => setMbtiAnswers((p) => ({ ...p, sn: "s" })), "Facts & details")}
                  {chip(mbtiAnswers.sn === "n", () => setMbtiAnswers((p) => ({ ...p, sn: "n" })), "Big picture ideas")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>Decisions come from...</div>
                <div className="chips" style={{ marginBottom: 16 }}>
                  {chip(mbtiAnswers.tf === "t", () => setMbtiAnswers((p) => ({ ...p, tf: "t" })), "Logic & analysis")}
                  {chip(mbtiAnswers.tf === "f", () => setMbtiAnswers((p) => ({ ...p, tf: "f" })), "Values & impact")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>You like things...</div>
                <div className="chips" style={{ marginBottom: 16 }}>
                  {chip(mbtiAnswers.jp === "j", () => setMbtiAnswers((p) => ({ ...p, jp: "j" })), "Planned & structured")}
                  {chip(mbtiAnswers.jp === "p", () => setMbtiAnswers((p) => ({ ...p, jp: "p" })), "Flexible & open")}
                </div>
                <button className="btn btn-gold" disabled={saving} onClick={() => { const mbti = calcMbti(mbtiAnswers); save("mbti", "mbti", mbti, "You are " + mbti + "!"); }}>Calculate</button>
                <button className="back-link" onClick={goBackToMenu}>Back</button>
              </div>
            </div>
          )}

          {view === "lifepath" && (
            <div>
              <div className="step-title">Life Path Number</div>
              <div className="step-sub">Enter your full birth date</div>
              <select className="inp" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
              </select>
              <input className="inp" placeholder="Day" type="number" min={1} max={31} value={birthDay} onChange={(e) => setBirthDay(e.target.value)} />
              <input className="inp" placeholder="Year" type="number" min={1900} max={2026} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
              <button className="btn btn-gold" disabled={saving} onClick={() => { if (birthMonth && birthDay && birthYear) { const lp = calcLifePath(parseInt(birthMonth), parseInt(birthDay), parseInt(birthYear)); save("life_path", "lifePath", lp, "Life Path " + lp + "!"); } }}>Calculate</button>
              <button className="back-link" onClick={goBackToMenu}>Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
