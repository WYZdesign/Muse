"use client";

import { useState } from "react";

type Prompt = {
  id: string;
  category: string;
  prompt_text: string;
  prompt_type: string;
  choices: string[];
  display_order: number;
};

type Response = {
  id: string;
  prompt_id: string;
  response_text: string;
  response_choices: string[];
  prompt_id_data?: { id: string; prompt_text: string; category: string };
};

type Props = {
  prompts: Prompt[];
  responses: Response[];
  onSaveResponse: (promptId: string, text: string, choices: string[]) => Promise<void>;
  onClose: () => void;
};

export default function PromptBankModal({ prompts, responses, onSaveResponse, onClose }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const responseMap = new Map(responses.map(r => [r.prompt_id, r]));
  const filtered = filterCategory === "all" ? prompts : prompts.filter(p => p.category === filterCategory);
  const categories = [...new Set(prompts.map(p => p.category))];
  const current = filtered[currentIdx];
  const existingResponse = current ? responseMap.get(current.id) : null;

  const handleSave = async () => {
    if (!current) return;
    setLoading(true);
    try {
      const text = current.prompt_type === "text" ? textInput : "";
      const choices = current.prompt_type !== "text" ? selectedChoices : [];
      await onSaveResponse(current.id, text, choices);
      setTextInput("");
      setSelectedChoices([]);
      if (currentIdx < filtered.length - 1) setCurrentIdx(i => i + 1);
    } finally { setLoading(false); }
  };

  const answered = filtered.filter(p => responseMap.has(p.id)).length;
  const pct = filtered.length > 0 ? Math.round((answered / filtered.length) * 100) : 0;

  const choiceStyle = (selected: boolean): React.CSSProperties => ({
    padding: "10px 14px", borderRadius: 10, cursor: "pointer",
    background: selected ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${selected ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.08)"}`,
    color: selected ? "#ffd700" : "#f5f0ff", fontSize: 13, transition: "all 0.2s",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
      <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 20, padding: 28, maxWidth: 520, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffd700" }}>✨ Profile Prompts</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            <span>{answered} of {filtered.length} answered</span>
            <span>{pct}% complete</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: "linear-gradient(90deg, #ffd700, #ff8c00)", transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
          <button onClick={() => { setFilterCategory("all"); setCurrentIdx(0); }} style={{ padding: "5px 12px", borderRadius: 6, background: filterCategory === "all" ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.04)", border: "none", color: filterCategory === "all" ? "#ffd700" : "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer" }}>All</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => { setFilterCategory(cat); setCurrentIdx(0); }} style={{ padding: "5px 12px", borderRadius: 6, background: filterCategory === cat ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.04)", border: "none", color: filterCategory === cat ? "#ffd700" : "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>{cat}</button>
          ))}
        </div>

        {current ? (
          <div>
            {/* Prompt */}
            <div style={{ padding: 16, background: "rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: 16, borderLeft: "3px solid #ffd700" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, textTransform: "capitalize" }}>{current.category}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f5f0ff", lineHeight: 1.5 }}>{current.prompt_text}</div>
            </div>

            {/* Existing response */}
            {existingResponse && (
              <div style={{ padding: 10, background: "rgba(78,205,196,0.08)", borderRadius: 8, marginBottom: 12, fontSize: 12, color: "#4ecdc4" }}>
                ✓ Your answer: {existingResponse.response_text || existingResponse.response_choices?.join(", ") || "—"}
              </div>
            )}

            {/* Response input */}
            {current.prompt_type === "text" ? (
              <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Type your answer..." rows={4} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f0ff", fontSize: 14, resize: "vertical", lineHeight: 1.5 }} />
            ) : current.prompt_type === "single_choice" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {current.choices.map(choice => (
                  <div key={choice} onClick={() => setSelectedChoices([choice])} style={choiceStyle(selectedChoices.includes(choice))}>{choice}</div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {current.choices.map(choice => (
                  <div key={choice} onClick={() => setSelectedChoices(prev => prev.includes(choice) ? prev.filter(c => c !== choice) : [...prev, choice])} style={choiceStyle(selectedChoices.includes(choice))}>{choice}</div>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "none", color: "#f5f0ff", fontSize: 13, cursor: currentIdx === 0 ? "default" : "pointer", opacity: currentIdx === 0 ? 0.4 : 1 }}>← Prev</button>
              <div style={{ flex: 1 }} />
              <button onClick={handleSave} disabled={loading} style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {loading ? "Saving..." : currentIdx < filtered.length - 1 ? "Save & Next →" : "Save"}
              </button>
            </div>

            {/* Dots */}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {filtered.map((_, i) => (
                <div key={i} onClick={() => setCurrentIdx(i)} style={{ width: 8, height: 8, borderRadius: 4, background: i === currentIdx ? "#ffd700" : responseMap.has(filtered[i].id) ? "#4ecdc4" : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.2s" }} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
            <div>No prompts available yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
