// Personality Profile + Creative Profile sub-pages for SettingsScreen. Each
// owns its own form state fully (seeded once from `obData` on mount) —
// nothing here is read anywhere else in the screen.
"use client";

import { useState } from "react";
import type { AuthFetchFn } from "../page-models";
import type { OnboardingData } from "../hooks/useAuthOnboardingState";
import { BEHIND_CAMERA, IN_FRONT_CAMERA, AESTHETICS, lookingForOptions } from "./types";
import { SettingsSubPage } from "./SettingsSubPage";

interface SharedPanelProps {
  obData: OnboardingData;
  apiFetch?: AuthFetchFn;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  onClose: () => void;
}

const ZODIAC = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const CHINESE = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
const MBTI = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const LIFE_PATHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

function chipRow<T extends string | number>(label: string, options: T[], value: T, setValue: (v: T) => void) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8, textAlign: "center" }}>{label}</div>
      <div className="chips" style={{ marginBottom: 0 }}>
        {options.map(o => (
          <button type="button" key={String(o)} aria-pressed={value === o} className={"chip" + (value === o ? " sel" : "")}
            onClick={() => setValue(o)}><span>{o}</span></button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPersonalityPanel({ obData, apiFetch, showToast, onClose }: SharedPanelProps) {
  const [persZodiac, setPersZodiac] = useState(obData?.zodiac || "");
  const [persChinese, setPersChinese] = useState(obData?.chinese || "");
  const [persMbti, setPersMbti] = useState(obData?.mbti || "");
  const [persLifePath, setPersLifePath] = useState<string | number>(obData?.lifePath || "");

  return (
    <SettingsSubPage title="Personality Profile" onClose={onClose}>
      <div>
        {chipRow("Zodiac", ZODIAC, persZodiac, setPersZodiac)}
        {chipRow("Chinese Zodiac", CHINESE, persChinese, setPersChinese)}
        {chipRow("MBTI", MBTI, persMbti, setPersMbti)}
        {chipRow<string | number>("Life Path", LIFE_PATHS, persLifePath, setPersLifePath)}
        <button className="btn btn-gold" style={{ width: "100%", marginTop: 8 }} onClick={async () => {
          try {
            await apiFetch?.("/api/muse/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-profile", zodiac: persZodiac, chinese: persChinese, mbti: persMbti, life_path: persLifePath }) });
            showToast("Personality profile saved!");
            onClose();
          } catch { showToast("Couldn't save — try again"); }
        }}>Save</button>
      </div>
    </SettingsSubPage>
  );
}

export function SettingsCreativeProfilePanel({ obData, apiFetch, showToast, onClose }: SharedPanelProps) {
  const [cpType, setCpType] = useState(obData?.type || "");
  const [cpCustomTypePending, setCpCustomTypePending] = useState(false);
  const [cpLooking, setCpLooking] = useState<string[]>(obData?.looking || []);
  const [cpStyles, setCpStyles] = useState<string[]>(obData?.styles || []);
  const [cpShowCustomStyleInput, setCpShowCustomStyleInput] = useState(false);
  const [cpCustomStyleDraft, setCpCustomStyleDraft] = useState("");
  const [cpCustomStylePending, setCpCustomStylePending] = useState(false);

  const toggle = (arr: string[], v: string, set: (x: string[]) => void, max = 6) => {
    if (arr.includes(v)) set(arr.filter(x => x !== v));
    else if (arr.length < max) set([...arr, v]);
    else showToast(`Max ${max} selected`);
  };
  const row = (label: string, options: string[], value: string | string[], onPick: (v: string) => void, multi = false) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8, textAlign: "center" }}>{label}</div>
      <div className="chips" style={{ marginBottom: 0 }}>
        {options.map(o => {
          const sel = multi ? (value as string[]).includes(o) : value === o;
          return (
            <button type="button" key={o} aria-pressed={sel} className={"chip" + (sel ? " sel" : "")}
              onClick={() => onPick(o)}><span>{o}</span></button>
          );
        })}
      </div>
    </div>
  );

  return (
    <SettingsSubPage title="Creative Profile" onClose={onClose}>
      <div>
        {row("Behind the Camera", BEHIND_CAMERA, cpType, (v) => { setCpType(v); setCpCustomTypePending(false); })}
        {row("In Front of the Camera", IN_FRONT_CAMERA, cpType, (v) => { setCpType(v); setCpCustomTypePending(false); })}
        {/* Torreé audit item 6: not every creative role fits the preset
            list — "Other" lets someone type their own, saved as a real
            `type` value immediately and flagged custom_type_pending
            for admin review at /muse/admin/moderation. */}
        <div style={{ marginBottom: 16 }}>
          <div className="chips" style={{ marginBottom: 0 }}>
            <button type="button" aria-pressed={cpCustomTypePending} className={"chip" + (cpCustomTypePending ? " sel" : "")}
              onClick={() => { setCpType(""); setCpCustomTypePending(true); }}><span>Add New +</span></button>
          </div>
          {cpCustomTypePending && (
            <input className="inp" aria-label="Creative role" placeholder="Type your creative role..." value={cpType} onChange={e => setCpType(e.target.value)} style={{ marginTop: 10 }} autoFocus />
          )}
        </div>
        {row("Looking For", lookingForOptions(cpType), cpLooking, (v) => toggle(cpLooking, v, setCpLooking, 4), true)}
        {row("Aesthetic", AESTHETICS, cpStyles, (v) => toggle(cpStyles, v, setCpStyles, 6), true)}
        <div style={{ marginBottom: 16 }}>
          <div className="chips" style={{ marginBottom: 0 }}>
            <button type="button" aria-pressed={cpShowCustomStyleInput} className={"chip" + (cpShowCustomStyleInput ? " sel" : "")}
              onClick={() => setCpShowCustomStyleInput(v => !v)}><span>Add New +</span></button>
            {cpStyles.filter(s => !AESTHETICS.includes(s)).map(s => (
              <button type="button" key={s} className="chip sel" title="Tap to remove"
                onClick={() => setCpStyles(cs => cs.filter(x => x !== s))}><span>✎ {s} ✕</span></button>
            ))}
          </div>
          {cpShowCustomStyleInput && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input className="inp" aria-label="Custom aesthetic" placeholder="Type your own aesthetic..." value={cpCustomStyleDraft} onChange={e => setCpCustomStyleDraft(e.target.value)} style={{ margin: 0, flex: 1 }} autoFocus />
              <button className="btn btn-outline" style={{ padding: "0 16px" }} onClick={() => {
                const v = cpCustomStyleDraft.trim();
                if (!v) return;
                if (cpStyles.includes(v)) return;
                if (cpStyles.length >= 6) { showToast("Max 6 selected"); return; }
                setCpStyles(cs => [...cs, v]);
                setCpCustomStylePending(true);
                setCpCustomStyleDraft("");
              }}>Add</button>
            </div>
          )}
        </div>
        <button className="btn btn-gold" style={{ width: "100%", marginTop: 8 }} onClick={async () => {
          try {
            await apiFetch?.("/api/muse/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
              action: "update-profile", type: cpType, looking: cpLooking, styles: cpStyles,
              ...(cpCustomTypePending ? { custom_type_pending: true } : {}),
              ...(cpCustomStylePending ? { custom_style_pending: true } : {}),
            }) });
            showToast("Creative profile saved!");
            onClose();
          } catch { showToast("Couldn't save — try again"); }
        }}>Save</button>
      </div>
    </SettingsSubPage>
  );
}
