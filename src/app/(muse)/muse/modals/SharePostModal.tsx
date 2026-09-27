"use client";

import { STRINGS } from "@/lib/strings";
import { getPostShareUrl } from "@/lib/urls";
import type { MuseModalsProps } from "./types";

type Props = Pick<MuseModalsProps, "shareTarget" | "setShareTarget" | "shareTargetTrap" | "showToast">;

export function SharePostModal({ shareTarget, setShareTarget, shareTargetTrap, showToast }: Props) {
  if (!shareTarget) return null;
  return (
    <div className="modal-overlay" ref={shareTargetTrap} role="dialog" aria-modal="true" aria-label="Share" onPointerDown={(e) => { if (e.target === e.currentTarget) setShareTarget(null); }}>
      <div className="modal-panel" style={{ maxWidth: 420, width: "90%", borderRadius: 24, padding: "24px 20px", background: "linear-gradient(180deg,#0f081e,#0a0612)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Playfair Display',serif", fontStyle: "italic", color: "var(--gold)" }}>Share</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>Share {shareTarget.author}'s post</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { name: "X", icon: "𝕏", color: "#000", bg: "#fff" },
            { name: "Facebook", icon: "f", color: "#fff", bg: "#1877F2" },
            { name: "Instagram", icon: "📸", color: "#fff", bg: "#E4405F" },
            { name: "WhatsApp", icon: "💬", color: "#fff", bg: "#25D366" },
            { name: "LinkedIn", icon: "in", color: "#fff", bg: "#0A66C2" },
            { name: "Email", icon: "✉️", color: "#fff", bg: "#6B7280" },
            { name: "Copy", icon: "🔗", color: "#fff", bg: "#8B5CF6" },
            { name: "More", icon: "•••", color: "#fff", bg: "#374151" },
          ].map(s => {
            const url = getPostShareUrl(shareTarget.id);
            const text = encodeURIComponent((shareTarget.text || "Check this out on Muses by WYZ!").slice(0, 200));
            const href = s.name === "X" ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`
              : s.name === "Facebook" ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
              : s.name === "LinkedIn" ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
              : s.name === "WhatsApp" ? `https://wa.me/?text=${text}%20${encodeURIComponent(url)}`
              : s.name === "Email" ? `mailto:?subject=${encodeURIComponent("Check this out on Muses by WYZ")}&body=${text}%20${encodeURIComponent(url)}`
              : null;
            return (
              <button key={s.name} onClick={() => {
                if (s.name === "Copy") { navigator.clipboard?.writeText(url); showToast("Link copied!"); setShareTarget(null); }
                else if (s.name === "More") { if (navigator.share) { navigator.share({ title: "Muses by WYZ", text: shareTarget.text || "Check this out on Muses by WYZ!", url }).catch(() => {}); } else { navigator.clipboard?.writeText(url); showToast("Link copied!"); } setShareTarget(null); }
                else if (href) { window.open(href, "_blank", "noopener"); setShareTarget(null); }
              }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 6px", cursor: "pointer", transition: "all .2s" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>{s.name}</div>
              </button>
            );
          })}
        </div>
        <button className="btn btn-outline" style={{ width: "100%", fontSize: 13, fontWeight: 600 }} onClick={() => setShareTarget(null)}>{STRINGS.cancel}</button>
      </div>
    </div>
  );
}
