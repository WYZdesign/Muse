"use client";

import { useState } from "react";
import { FiShield } from "react-icons/fi";
import type { CommunityRule } from "./types";

export type CommunityRulesEditorProps = {
  communityId: string;
  rules: CommunityRule[];
  /** Server enforces community-admin only for `update-community-rules`. */
  canEdit: boolean;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  onSaved: (rules: CommunityRule[]) => void;
};

const TITLE_MAX = 100;
const BODY_MAX = 500;
const POST = { method: "POST", headers: { "Content-Type": "application/json" } } as const;

const editBtn: React.CSSProperties = { padding: "5px 12px", borderRadius: 8, background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.3)", color: "var(--gold)", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-subtle)", color: "var(--text)", fontSize: 13, marginBottom: 6 };

export function CommunityRulesEditor({ communityId, rules, canEdit, apiFetch, showToast, onSaved }: CommunityRulesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CommunityRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const startEdit = () => {
    setDraft((rules || []).map(r => ({ title: r.title || "", body: r.body || "" })));
    setError("");
    setEditing(true);
  };

  const cancel = () => { setEditing(false); setError(""); };
  const updateRow = (i: number, patch: Partial<CommunityRule>) => setDraft(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setDraft(prev => [...prev, { title: "", body: "" }]);
  const removeRow = (i: number) => setDraft(prev => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    const cleaned = draft
      .map(r => ({ title: r.title.trim(), body: r.body.trim() }))
      .filter(r => r.title);
    setSaving(true);
    setError("");
    try {
      const r = await apiFetch("/api/muse", {
        ...POST,
        body: JSON.stringify({ action: "update-community-rules", communityId, rules: cleaned }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setError(e.error || `Couldn't save rules (${r.status})`);
        return;
      }
      onSaved(cleaned);
      setEditing(false);
      showToast("Group rules updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg.includes("403") ? "Only group admins can edit rules." : "Couldn't save rules — try again");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    const list = Array.isArray(rules) ? rules : [];
    if (list.length === 0 && !canEdit) return null;
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}><FiShield size={13} /> Group Rules</div>
          {canEdit && <button type="button" onClick={startEdit} style={editBtn}>Edit</button>}
        </div>
        {list.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>No rules set yet.</div>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((rule, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
                <span style={{ color: "#fff", fontWeight: 700 }}>{rule.title}</span>
                {rule.body && <div style={{ marginTop: 2 }}>{rule.body}</div>}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><FiShield size={13} /> Edit Group Rules</div>

      {error && <div role="alert" style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 8 }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {draft.map((rule, i) => (
          <div key={i} style={{ border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>Rule {i + 1}</span>
              <button type="button" onClick={() => removeRow(i)} aria-label={`Remove rule ${i + 1}`} style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Remove</button>
            </div>
            <input
              aria-label={`Rule ${i + 1} title`}
              placeholder="Rule title"
              value={rule.title}
              maxLength={TITLE_MAX}
              onChange={e => updateRow(i, { title: e.target.value })}
              style={inputStyle}
            />
            <textarea
              aria-label={`Rule ${i + 1} details`}
              placeholder="Rule details (optional)"
              value={rule.body}
              maxLength={BODY_MAX}
              rows={2}
              onChange={e => updateRow(i, { body: e.target.value })}
              style={{ ...inputStyle, marginBottom: 0, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} style={{ ...editBtn, marginTop: 8 }}>+ Add rule</button>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,140,0,0.25))", border: "1px solid rgba(255,215,0,0.4)", color: "var(--gold)", fontSize: 13, fontWeight: 800, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Save rules"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={cancel}
          style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text2)", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default CommunityRulesEditor;
