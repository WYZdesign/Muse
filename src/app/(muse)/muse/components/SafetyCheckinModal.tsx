"use client";

import { useState } from "react";

type CheckinData = {
  id: string;
  checkin_type: string;
  status: string;
  booking_id?: { id: string; session_id: string; status: string } | null;
  notes: string;
  shared_with_contact: boolean;
  created_at: string;
  responded_at?: string;
};

type SafetyProfile = {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  trusted_friend_name: string;
  trusted_friend_phone: string;
  trusted_friend_email: string;
  auto_share_enabled: boolean;
};

type Props = {
  checkins: CheckinData[];
  safetyProfile: SafetyProfile | null;
  onRespond: (checkinId: string, response: string, sharedWithContact: boolean, reason?: string) => Promise<void>;
  onSaveSafetyProfile: (profile: SafetyProfile) => Promise<void>;
  onShareDetails: (bookingId: string, method: string) => Promise<void>;
  onClose: () => void;
};

export default function SafetyCheckinModal({ checkins, safetyProfile, onRespond, onSaveSafetyProfile, onShareDetails, onClose }: Props) {
  const [tab, setTab] = useState<"checkins" | "safety" | "share">("checkins");
  const [loading, setLoading] = useState(false);
  const [sp, setSp] = useState<SafetyProfile>(safetyProfile || {
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "",
    trusted_friend_name: "", trusted_friend_phone: "", trusted_friend_email: "",
    auto_share_enabled: false,
  });

  const pending = checkins.filter(c => c.status === "pending");
  const completed = checkins.filter(c => c.status !== "pending");

  const handleConfirm = async (id: string) => {
    setLoading(true);
    try { await onRespond(id, "confirmed", sp.auto_share_enabled); } finally { setLoading(false); }
  };

  const handleCancel = async (id: string) => {
    setLoading(true);
    try { await onRespond(id, "cancelled", false, "Cancelled during pre-shoot check-in"); } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try { await onSaveSafetyProfile(sp); } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f0ff", fontSize: 13 };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
      <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 20, padding: 28, maxWidth: 520, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffd700" }}>🛡️ Safety Center</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
          {[["checkins", `Check-ins (${pending.length})`], ["safety", "Safety Profile"], ["share", "Share Details"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: tab === key ? "rgba(255,215,0,0.15)" : "transparent", border: "none", color: tab === key ? "#ffd700" : "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* CHECK-INS TAB */}
        {tab === "checkins" && (
          <div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
              Confirm your shoot details 24 hours before. This is your chance to verify everything matches what was disclosed.
            </p>

            {pending.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13 }}>No pending check-ins</div>
              </div>
            )}

            {pending.map(c => (
              <div key={c.id} style={{ padding: 16, background: "rgba(255,215,0,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.12)", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700", marginBottom: 6 }}>Pre-Shoot Check-in</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4, lineHeight: 1.5 }}>
                  Please confirm: Is everything still as originally disclosed? Same date, time, location, and content boundaries?
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                  {new Date(c.created_at).toLocaleDateString()}. Booking status: {c.booking_id?.status || "active"}
                </div>

                <div style={{ padding: 10, background: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 12, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                  <strong>Reminder:</strong> If anything has changed from the original disclosure (location, time, content boundaries, who will be present), <span style={{ color: "#ffd700" }}>do not confirm</span>. Instead, cancel and re-disclose.
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleCancel(c.id)} disabled={loading} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)", color: "#ff6b6b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Cancel Shoot
                  </button>
                  <button onClick={() => handleConfirm(c.id)} disabled={loading} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "linear-gradient(135deg, #4ecdc4, #2ecc71)", border: "none", color: "#0a0612", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    ✓ Confirm All Good
                  </button>
                </div>
              </div>
            ))}

            {completed.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Past Check-ins</div>
                {completed.slice(0, 5).map(c => (
                  <div key={c.id} style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{c.checkin_type.replace(/_/g, " ")}</span>
                    <span style={{ color: c.status === "confirmed" ? "#4ecdc4" : c.status === "cancelled" ? "#ff6b6b" : "rgba(255,255,255,0.4)" }}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SAFETY PROFILE TAB */}
        {tab === "safety" && (
          <div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
              Add emergency contacts and a trusted friend. You can share shoot details with them before meeting someone new.
            </p>

            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700", marginBottom: 10 }}>Emergency Contact</div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Name</label>
              <input value={sp.emergency_contact_name} onChange={e => setSp(p => ({ ...p, emergency_contact_name: e.target.value }))} style={inputStyle} placeholder="Full name" />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Phone</label>
                <input value={sp.emergency_contact_phone} onChange={e => setSp(p => ({ ...p, emergency_contact_phone: e.target.value }))} style={inputStyle} placeholder="(555) 123-4567" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Relationship</label>
                <input value={sp.emergency_contact_relation} onChange={e => setSp(p => ({ ...p, emergency_contact_relation: e.target.value }))} style={inputStyle} placeholder="e.g. Partner, Mom, Friend" />
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700", marginBottom: 10, marginTop: 20 }}>Trusted Friend</div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
              This person receives your shoot details (location, disclosure, contact info) before any meetup.
            </p>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Name</label>
              <input value={sp.trusted_friend_name} onChange={e => setSp(p => ({ ...p, trusted_friend_name: e.target.value }))} style={inputStyle} placeholder="Full name" />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Phone</label>
                <input value={sp.trusted_friend_phone} onChange={e => setSp(p => ({ ...p, trusted_friend_phone: e.target.value }))} style={inputStyle} placeholder="(555) 123-4567" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Email</label>
                <input value={sp.trusted_friend_email} onChange={e => setSp(p => ({ ...p, trusted_friend_email: e.target.value }))} style={inputStyle} placeholder="friend@email.com" />
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,215,0,0.06)", borderRadius: 8, border: "1px solid rgba(255,215,0,0.15)", cursor: "pointer", marginTop: 16, marginBottom: 20 }}>
              <input type="checkbox" checked={sp.auto_share_enabled} onChange={e => setSp(p => ({ ...p, auto_share_enabled: e.target.checked }))} style={{ accentColor: "#ffd700", width: 16, height: 16 }} />
              <div>
                <div style={{ fontSize: 12, color: "#f5f0ff", fontWeight: 600 }}>Auto-share with trusted friend</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Automatically send shoot details when you confirm a booking</div>
              </div>
            </label>

            <button onClick={handleSaveProfile} disabled={loading} style={{ width: "100%", padding: "10px 0", borderRadius: 12, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {loading ? "Saving..." : "Save Safety Profile"}
            </button>
          </div>
        )}

        {/* SHARE DETAILS TAB */}
        {tab === "share" && (
          <div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
              Share your shoot details with someone you trust. They&apos;ll receive the disclosure, location, and contact information.
            </p>

            <div style={{ padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f5f0ff", marginBottom: 8 }}>What gets shared:</div>
              <ul style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                <li>Shoot date, time, and duration</li>
                <li>Location (address or area)</li>
                <li>Disclosure terms (content type, boundaries)</li>
                <li>Other person&apos;s name and profile link</li>
                <li>Your check-in status</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button style={{ flex: 1, padding: "12px 0", borderRadius: 10, background: "rgba(78,205,196,0.15)", border: "1px solid rgba(78,205,196,0.3)", color: "#4ecdc4", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                📱 Send via SMS
              </button>
              <button style={{ flex: 1, padding: "12px 0", borderRadius: 10, background: "rgba(100,149,237,0.15)", border: "1px solid rgba(100,149,237,0.3)", color: "#6495ed", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                📧 Send via Email
              </button>
              <button style={{ flex: 1, padding: "12px 0", borderRadius: 10, background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", color: "#ffd700", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                🔗 Copy Link
              </button>
            </div>

            <div style={{ padding: 14, background: "rgba(78,205,196,0.06)", borderRadius: 10, border: "1px solid rgba(78,205,196,0.15)" }}>
              <div style={{ fontSize: 12, color: "#4ecdc4", fontWeight: 700, marginBottom: 6 }}>💡 Safety Tip</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                The easiest and most protective thing you can do is make it simple to back out. If something feels off, trust your instincts. You can cancel anytime without explanation. No shoot is worth compromising your comfort.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
