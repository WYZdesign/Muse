// "Help & Support" group for SettingsScreen: the FAQ list plus the Report a
// Bug / Have an Idea forms. Owns the bug/idea form state itself — none of it
// is read anywhere else in the screen — and the data-export/email-support
// actions. Rendered inline (not a SettingsSubPage), same as in the original.
"use client";

import { useState } from "react";
import { FiAlertTriangle, FiDownload, FiHelpCircle } from "react-icons/fi";
import { STRINGS } from "@/lib/strings";
import { clearAllPageTourFlags } from "./pageTourContent";
import type { Screen } from "./types";
import type { AuthFetchFn } from "../page-models";

const SUPPORT_EMAIL = "info@wyzdesign.com";

const FAQ_ITEMS = [
  { q: "How does matching work?", a: "Swipe right on creators you'd like to connect with. If they swipe right back, it's a connection! You can then message each other." },
  { q: "What are Quests?", a: "Quests are small challenges that reward you for using Musa — like swiping on profiles, posting, or messaging someone. They refresh daily, weekly and monthly. Finishing one earns XP plus a reward such as free likes or a profile boost. Open Quests (Menu → Quests, or Settings → Rewards → Quests) to see your progress and claim anything that’s ready." },
  { q: "How do I upgrade to Premium?", a: "Go to Settings → Payments & Subscription → Subscription to see plan options." },
  { q: "How do I report someone?", a: "Tap the ⚑ Report button on any feed or forum post, the ••• menu on a match, or Report inside a chat conversation. Choose a reason and we'll review it — track your reports in Menu → Your Activity → Reports." },
  { q: "How do I delete my account?", a: "Go to Settings → Legal → Delete Account. Access is removed immediately and your account data is permanently deleted after 30 days, except records required for legal, safety, fraud, dispute, or recordkeeping obligations; see the Privacy Policy for details." },
];

export interface SettingsHelpSupportSectionProps {
  showScreen: (s: Screen) => void;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  authFetch?: AuthFetchFn;
  /** Opens the AI help-guide chat (SupportChat). */
  setSupportOpen?: (v: boolean) => void;
  /** Opens the human support-ticket modal (SupportModal) — a separate flow from the AI help guide above. */
  setContactSupportOpen?: (v: boolean) => void;
}

export function SettingsHelpSupportSection({ showScreen, showToast, authFetch, setSupportOpen, setContactSupportOpen }: SettingsHelpSupportSectionProps) {
  const [showBugForm, setShowBugForm] = useState(false);
  const [bugCategory, setBugCategory] = useState("ui");
  const [bugDescription, setBugDescription] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [bugExpected, setBugExpected] = useState("");
  const [bugActual, setBugActual] = useState("");
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [ideaCategory, setIdeaCategory] = useState("feature");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaSubmitting, setIdeaSubmitting] = useState(false);

  return (
    <div className="settings-group">
      <div className="settings-group-title">Help &amp; Support</div>
      {FAQ_ITEMS.map((faq, i) => (
        <div key={i} style={{ marginBottom: 10, padding: "12px 14px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{faq.q}</div>
          <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{faq.a}</div>
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
        <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => { clearAllPageTourFlags(); showToast("Tutorials reset — you'll see them again as you explore"); }}>Replay Tutorials</button>
        <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => showScreen("codex")}>Glossary + Codex</button>
        <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => setSupportOpen?.(true)}>Help Guide</button>
        <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => setContactSupportOpen?.(true)}><FiHelpCircle size={14} style={{ marginRight: 6 }} />Contact Support</button>
        {!showIdeaForm ? (
          <button className="btn" style={{ width: "100%", fontSize: 13, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)" }} onClick={() => setShowIdeaForm(true)}>Have an Idea?</button>
        ) : (
          <div style={{ padding: 14, background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 10 }}>Share Your Idea</div>
            <select aria-label="Idea category" value={ideaCategory} onChange={e => setIdeaCategory(e.target.value)} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}>
              <option value="feature">New Feature</option>
              <option value="improvement">Improvement</option>
              <option value="new-category">New Category</option>
              <option value="partnership">Partnership Idea</option>
              <option value="other">Other</option>
            </select>
            <input aria-label="Idea title" value={ideaTitle} onChange={e => setIdeaTitle(e.target.value)} placeholder="Give it a name*" style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
            <textarea aria-label="Idea description" value={ideaDescription} onChange={e => setIdeaDescription(e.target.value)} placeholder="Describe your idea — what should it do? What problem does it solve?*" rows={3} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" style={{ flex: 1, fontSize: 12, padding: "8px 0", background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", color: "var(--gold)" }} disabled={ideaSubmitting || !ideaTitle.trim() || !ideaDescription.trim() || !authFetch} onClick={async () => {
                if (!authFetch) return; setIdeaSubmitting(true);
                try {
                  const r = await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit-idea", title: ideaTitle, description: ideaDescription, category: ideaCategory }) });
                  if (!r.ok) throw new Error("failed");
                  showToast("Idea submitted — we appreciate it!"); setShowIdeaForm(false); setIdeaTitle(""); setIdeaDescription("");
                } catch { showToast("Failed to submit idea"); }
                setIdeaSubmitting(false);
              }}>{ideaSubmitting ? "Sending…" : "Submit Idea"}</button>
              <button className="btn btn-outline" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => setShowIdeaForm(false)}>{STRINGS.cancel}</button>
            </div>
          </div>
        )}
        {!showBugForm ? (
          <button className="btn" style={{ width: "100%", background: "rgba(255,107,107,0.08)", border: "1px solid var(--border-subtle)", color: "var(--coral)", fontSize: 13 }} onClick={() => setShowBugForm(true)}><FiAlertTriangle size={14} style={{ marginRight: 6 }} />Report a Bug</button>
        ) : (
          <div style={{ padding: 14, background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--coral)", marginBottom: 10 }}>Report a Bug</div>
            <select aria-label="Bug category" value={bugCategory} onChange={e => setBugCategory(e.target.value)} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}>
              <option value="ui">UI / Visual Issue</option>
              <option value="crash">App Crash</option>
              <option value="payment">Payment Problem</option>
              <option value="matching">Matching Not Working</option>
              <option value="notification">Notification Issue</option>
              <option value="upload">Upload / Media Issue</option>
              <option value="other">Other</option>
            </select>
            <textarea aria-label="Bug description" value={bugDescription} onChange={e => setBugDescription(e.target.value)} placeholder="What happened?*" rows={3} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }} />
            <textarea aria-label="Steps to reproduce" value={bugSteps} onChange={e => setBugSteps(e.target.value)} placeholder="Steps to reproduce (optional)" rows={2} style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 8, minWidth: 0 }}>
              <input aria-label="Expected behavior" value={bugExpected} onChange={e => setBugExpected(e.target.value)} placeholder="Expected behavior" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
              <input aria-label="Actual behavior" value={bugActual} onChange={e => setBugActual(e.target.value)} placeholder="Actual behavior" style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text)", fontSize: 13 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" style={{ flex: 1, fontSize: 12, padding: "8px 0", background: "rgba(255,107,107,0.15)", border: "1px solid var(--border-subtle)", color: "var(--coral)" }} disabled={bugSubmitting || !bugDescription.trim() || !authFetch} onClick={async () => {
                if (!authFetch) return; setBugSubmitting(true);
                try {
                  const r = await authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "report-bug", category: bugCategory, description: bugDescription, steps: bugSteps, expected: bugExpected, actual: bugActual }) });
                  if (!r.ok) throw new Error("failed");
                  showToast("Bug report sent — thank you!"); setShowBugForm(false); setBugDescription(""); setBugSteps(""); setBugExpected(""); setBugActual("");
                } catch { showToast("Failed to send bug report"); }
                setBugSubmitting(false);
              }}>{bugSubmitting ? "Sending…" : "Submit Bug"}</button>
              <button className="btn btn-outline" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => setShowBugForm(false)}>{STRINGS.cancel}</button>
            </div>
          </div>
        )}
        <button className="btn" style={{ width: "100%", background: "var(--card-bg)", border: "1px solid var(--border-subtle)", color: "var(--text)", fontSize: 13 }} onClick={async () => {
          if (!authFetch) { showToast("Can't export right now"); return; }
          try {
            const res = await authFetch("/api/muse?type=export");
            if (!res.ok) { showToast("Export failed"); return; }
            const j = await res.json();
            const blob = new Blob([JSON.stringify(j, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "muse-my-data.json"; a.click();
            URL.revokeObjectURL(url);
            showToast("Data exported");
          } catch { showToast("Export failed"); }
        }}><FiDownload size={14} style={{ marginRight: 6 }} />Export My Data</button>
        <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => { try { window.location.href = "mailto:" + SUPPORT_EMAIL + "?subject=" + encodeURIComponent("Musa Support Request") + "&body=" + encodeURIComponent("Describe your issue here:\n\n"); } catch { showToast?.("Email us at " + SUPPORT_EMAIL); } }}><FiHelpCircle size={14} style={{ marginRight: 6 }} />Email Support</button>
      </div>
    </div>
  );
}
