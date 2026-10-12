// Brief Templates / Team Management / Hiring Preferences sub-pages for
// SettingsScreen's "Hiring & Team" group (industry-side accounts). Each owns
// its own form state, seeded once from `preferences` on mount — nothing here
// is read anywhere else in the screen.
"use client";

import { useState } from "react";
import type { AuthFetchFn } from "../page-models";
import { SettingsSubPage } from "./SettingsSubPage";

interface SharedPanelProps {
  preferences: Record<string, unknown>;
  apiFetch?: AuthFetchFn;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  onClose: () => void;
}

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export function SettingsBriefTemplatesPanel({ preferences, apiFetch, showToast, onClose }: SharedPanelProps) {
  const [briefTemplates, setBriefTemplates] = useState<{ title: string; desc: string; budget: string }[]>(
    Array.isArray(preferences.briefTemplates) && (preferences.briefTemplates as unknown[]).length
      ? (preferences.briefTemplates as { title: string; desc: string; budget: string }[])
      // Demo fallback so the panel isn't an empty "No templates yet" state.
      : (DEMO_MODE
        ? [
            { title: "Editorial shoot", desc: "Half-day editorial shoot, 3 looks, 25+ edited images delivered in 48 hours.", budget: "$800-$1,500" },
            { title: "Brand campaign", desc: "Concept, shot list and full-day capture for a product or brand campaign.", budget: "$3,000-$5,000" },
            { title: "Test shoot (TFP)", desc: "Mutually beneficial test shoot for portfolio pieces. No fee either way.", budget: "TFP" },
          ]
        : []),
  );

  return (
    <SettingsSubPage title="Brief Templates" onClose={onClose}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
        Reusable formats so you don&apos;t retype the same brief every time.
      </div>
      {briefTemplates.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>No templates yet — add your first below.</div>
      )}
      {briefTemplates.map((t, i) => (
        <div key={i} style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)" }}>
          <input aria-label="Template name" value={t.title} placeholder="Template name" onChange={(e) => setBriefTemplates((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
            style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          <textarea aria-label="Template description" value={t.desc} placeholder="What you're looking for" rows={2} onChange={(e) => setBriefTemplates((prev) => prev.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
            style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <input aria-label="Template budget" value={t.budget} placeholder="Budget (e.g. $500)" onChange={(e) => setBriefTemplates((prev) => prev.map((x, j) => j === i ? { ...x, budget: e.target.value } : x))}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
            <button onClick={() => setBriefTemplates((prev) => prev.filter((_, j) => j !== i))} aria-label="Delete template"
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,138,128,0.4)", background: "transparent", color: "#ff8a80", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete</button>
          </div>
        </div>
      ))}
      <button className="btn btn-outline" style={{ width: "100%", marginBottom: 12 }}
        onClick={() => setBriefTemplates((prev) => [...prev, { title: "", desc: "", budget: "" }])}>+ Add template</button>
      <button className="btn btn-gold" style={{ width: "100%" }} onClick={async () => {
        try {
          await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { briefTemplates } }) });
          showToast("Brief templates saved!");
        } catch { showToast("Couldn't save — try again"); }
      }}>Save Templates</button>
    </SettingsSubPage>
  );
}

export function SettingsTeamPanel({ preferences, apiFetch, showToast, onClose }: SharedPanelProps) {
  const [teamMembers, setTeamMembers] = useState<{ name: string; email: string; role: string }[]>(
    Array.isArray(preferences.teamMembers) && (preferences.teamMembers as unknown[]).length
      ? (preferences.teamMembers as { name: string; email: string; role: string }[])
      // Demo fallback so the panel isn't an empty "No team members yet." state.
      : (DEMO_MODE
        ? [
            { name: "Maya Chen", email: "maya@studio.example", role: "Producer" },
            { name: "Sam Taylor", email: "sam@studio.example", role: "Editor" },
            { name: "Riley Patel", email: "riley@studio.example", role: "Designer" },
          ]
        : []),
  );

  return (
    <SettingsSubPage title="Team Management" onClose={onClose}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
        Who works with you. Roles are for your own reference.
      </div>
      {teamMembers.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>No team members yet.</div>
      )}
      {teamMembers.map((m, i) => (
        <div key={i} style={{ marginBottom: 10, padding: 12, borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)" }}>
          {[
            { k: "name" as const, ph: "Name" },
            { k: "email" as const, ph: "Email" },
          ].map((f) => (
            <input key={f.k} aria-label={f.ph} value={m[f.k]} placeholder={f.ph} onChange={(e) => setTeamMembers((prev) => prev.map((x, j) => j === i ? { ...x, [f.k]: e.target.value } : x))}
              style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <select aria-label="Member role" value={m.role} onChange={(e) => setTeamMembers((prev) => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}>
              {["Owner", "Manager", "Editor", "Assistant", "Viewer"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={() => setTeamMembers((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove member"
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,138,128,0.4)", background: "transparent", color: "#ff8a80", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Remove</button>
          </div>
        </div>
      ))}
      <button className="btn btn-outline" style={{ width: "100%", marginBottom: 12 }}
        onClick={() => setTeamMembers((prev) => [...prev, { name: "", email: "", role: "Editor" }])}>+ Add member</button>
      <button className="btn btn-gold" style={{ width: "100%" }} onClick={async () => {
        try {
          await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { teamMembers } }) });
          showToast("Team saved!");
        } catch { showToast("Couldn't save — try again"); }
      }}>Save Team</button>
    </SettingsSubPage>
  );
}

export function SettingsHiringPanel({ preferences, apiFetch, showToast, onClose }: SharedPanelProps) {
  const [hireMinRate, setHireMinRate] = useState(String(preferences.hireMinRate ?? ""));
  const [hireAvailability, setHireAvailability] = useState(String(preferences.hireAvailability ?? ""));
  const [hireTypes, setHireTypes] = useState(String(preferences.hireTypes ?? ""));
  const [hireNotes, setHireNotes] = useState(String(preferences.hireNotes ?? ""));

  return (
    <SettingsSubPage title="Hiring Preferences" onClose={onClose}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
        What you look for when hiring — used to filter who you see and to auto-decline mismatches.
      </div>
      {[
        { label: "Minimum rate", value: hireMinRate, set: setHireMinRate, ph: "e.g. $300/day" },
        { label: "Availability needed", value: hireAvailability, set: setHireAvailability, ph: "e.g. Weekends, 2 weeks notice" },
        { label: "Preferred creative types", value: hireTypes, set: setHireTypes, ph: "e.g. Photographer, MUA, Stylist" },
        { label: "Notes", value: hireNotes, set: setHireNotes, ph: "Anything else you need" },
      ].map((f) => (
        <div key={f.label} style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{f.label}</div>
          <input aria-label={f.label} value={f.value} placeholder={f.ph} onChange={(e) => f.set(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
      ))}
      <button className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={async () => {
        try {
          await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { hireMinRate, hireAvailability, hireTypes, hireNotes } }) });
          showToast("Hiring preferences saved!");
        } catch { showToast("Couldn't save — try again"); }
      }}>Save Hiring Preferences</button>
    </SettingsSubPage>
  );
}
