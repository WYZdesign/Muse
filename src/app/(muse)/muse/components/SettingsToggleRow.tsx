// Shared small presentational helpers for SettingsScreen and its extracted
// sub-page panels: a labeled on/off switch row, and the 5-stop opacity
// slider used in the Appearance > Background Effects section.
"use client";

import { useEffect, useState } from "react";

export function ToggleRow({ label, desc, checked, onToggle }: { label: string; desc?: string; checked: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 14, color: "var(--text)" }}>{label}{desc && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "var(--gold)", background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 99, padding: "2px 7px", verticalAlign: "middle" }}>{desc}</span>}</span>
      <div
        role="switch"
        aria-checked={checked}
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        onClick={onToggle}
        className={"toggle-track" + (checked ? " active" : "")}
        style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "all .3s", background: checked ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.1)" }}
      >
        <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: checked ? 22 : 2, transition: "all .3s" }} />
      </div>
    </div>
  );
}

// Reusable 5-stop opacity slider (Background section). Note: stop labels are
// 20% → 100% (the lowest stop is 20%, fully transparent is excluded so the
// backdrop/sprites never vanish entirely). Value maps stop N → opacity where
// 100% = opacity 1. Persisted to localStorage per-slider; the CSS variable is
// applied straight to the root so BackgroundScene picks it up live.
export function OpacitySlider({ label, storageKey, cssVar }: { label: string; storageKey: string; cssVar: string }) {
  const STEPS = [0, 0.25, 0.5, 0.75, 1.0];
  const LABELS = ["0%", "25%", "50%", "75%", "100%"];
  const [idx, setIdx] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem(storageKey) || "1");
      return Math.max(0, Math.min(4, Math.round((isNaN(v) ? 1 : v) * 4)));
    } catch { return 4; }
  });
  useEffect(() => {
    try { document.documentElement.style.setProperty(cssVar, String(STEPS[idx])); } catch { /* CSSOM may be unavailable */ }
  }, [cssVar, idx]);
  const handleSlide = (i: number) => {
    setIdx(i);
    try { localStorage.setItem(storageKey, String(STEPS[i])); } catch { /* storage may be unavailable */ }
    try { document.documentElement.style.setProperty(cssVar, String(STEPS[i])); } catch { /* CSSOM may be unavailable */ }
  };
  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{LABELS[idx]}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={0}
        max={4}
        step={1}
        value={idx}
        onChange={e => handleSlide(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--gold)" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {LABELS.map((l, i) => (
          <span key={i} style={{ fontSize: 10, color: "var(--muted)" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}
