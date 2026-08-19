"use client";

import { useState } from "react";

type DisclosureForm = {
  compensationAmount: string;
  compensationTiming: string;
  compensationMethod: string;
  contentTypeNudity: boolean;
  contentTypeArtisticNude: boolean;
  contentTypeBoudoir: boolean;
  contentTypePortrait: boolean;
  contentTypeFashion: boolean;
  contentTypeEditorial: boolean;
  contentTypeCommercial: boolean;
  contentTypeConceptual: boolean;
  contentTypeOther: boolean;
  contentTypeOtherDesc: string;
  boundaryFullNudity: boolean;
  boundaryImpliedNudity: boolean;
  boundaryPartials: boolean;
  boundaryNoPartials: boolean;
  boundaryExplicitActs: boolean;
  boundaryPenetration: boolean;
  boundaryNoPenetration: boolean;
  boundaryTouchingSelf: boolean;
  boundaryTouchingOther: boolean;
  boundaryNoTouching: boolean;
  locationType: string;
  locationAddress: string;
  locationPublic: boolean;
  othersPresent: boolean;
  othersCount: number;
  othersDesc: string;
  usageRights: string;
  usageCustomDesc: string;
  editApprovalRequired: boolean;
  ndaRequired: boolean;
  modelReleaseRequired: boolean;
  agreeTerms: boolean;
};

const INITIAL: DisclosureForm = {
  compensationAmount: "", compensationTiming: "", compensationMethod: "",
  contentTypeNudity: false, contentTypeArtisticNude: false, contentTypeBoudoir: false,
  contentTypePortrait: false, contentTypeFashion: false, contentTypeEditorial: false,
  contentTypeCommercial: false, contentTypeConceptual: false, contentTypeOther: false,
  contentTypeOtherDesc: "",
  boundaryFullNudity: false, boundaryImpliedNudity: false, boundaryPartials: false,
  boundaryNoPartials: false, boundaryExplicitActs: false, boundaryPenetration: false,
  boundaryNoPenetration: false, boundaryTouchingSelf: false, boundaryTouchingOther: false,
  boundaryNoTouching: false,
  locationType: "", locationAddress: "", locationPublic: true,
  othersPresent: false, othersCount: 0, othersDesc: "",
  usageRights: "", usageCustomDesc: "", editApprovalRequired: false,
  ndaRequired: false, modelReleaseRequired: false, agreeTerms: false,
};

type Props = {
  responderName: string;
  responderId: string;
  bookingId?: string;
  onSubmit: (form: DisclosureForm & { responderId: string; bookingId?: string }) => Promise<void>;
  onCancel: () => void;
  existingDisclosure?: Record<string, unknown> | null;
  onConfirm?: (disclosureId: string) => Promise<void>;
};

export default function DisclosureModal({ responderName, responderId, bookingId, onSubmit, onCancel, existingDisclosure, onConfirm }: Props) {
  const [form, setForm] = useState<DisclosureForm>(INITIAL);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");

  const set = <K extends keyof DisclosureForm>(key: K, val: DisclosureForm[K]) => setForm(f => ({ ...f, [key]: val }));

  const isNsfw = form.contentTypeNudity || form.contentTypeArtisticNude || form.boundaryExplicitActs || form.boundaryPenetration;
  const hasPayment = form.compensationAmount && form.compensationAmount !== "0" && form.compensationAmount !== "Free";
  const wouldBlock = isNsfw && hasPayment;

  const handleSubmit = async () => {
    if (!form.agreeTerms) { setBlocked(false); return; }
    setLoading(true);
    try {
      if (wouldBlock) {
        setBlocked(true);
        setBlockedReason("NSFW content combined with payment violates Muse terms. This request has been blocked and flagged for review.");
        return;
      }
      await onSubmit({ ...form, responderId, bookingId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.includes("blocked")) {
        setBlocked(true);
        setBlockedReason(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const section = (title: string, icon: string) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#ffd700", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span> {title}
      </div>
    </div>
  );

  const checkbox = (label: string, checked: boolean, onChange: (v: boolean) => void, subtext?: string) => (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", borderRadius: 8, background: checked ? "rgba(255,215,0,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${checked ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", marginBottom: 6, transition: "all 0.2s" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ marginTop: 2, accentColor: "#ffd700", width: 16, height: 16, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, color: "#f5f0ff" }}>{label}</div>
        {subtext && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{subtext}</div>}
      </div>
    </label>
  );

  const select = (label: string, value: string, options: string[], onChange: (v: string) => void) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4, display: "block" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f0ff", fontSize: 13 }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const input = (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4, display: "block" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f0ff", fontSize: 13 }} />
    </div>
  );

  // BLOCKED STATE
  if (blocked) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
        <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,50,50,0.4)", borderRadius: 20, padding: 32, maxWidth: 420, width: "90%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#ff4444", marginBottom: 12 }}>Request Blocked</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 8, lineHeight: 1.6 }}>{blockedReason}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>This incident has been logged. Repeated violations may result in account suspension.</p>
          <button onClick={onCancel} style={{ padding: "10px 24px", borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "none", color: "#f5f0ff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    );
  }

  // EXISTING DISCLOSURE — CONFIRM VIEW
  if (existingDisclosure && onConfirm) {
    const disc = existingDisclosure;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
        <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 20, padding: 28, maxWidth: 520, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffd700", marginBottom: 16 }}>📋 Shoot Disclosure</h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Both parties must confirm the same terms. Please review carefully.</p>

          <div style={{ fontSize: 13, color: "#f5f0ff", lineHeight: 1.8 }}>
            <div><strong>Compensation:</strong> {(disc as any).compensation_amount || "Not specified"}. {(disc as any).compensation_timing || "Not specified"}</div>
            <div><strong>Location:</strong> {(disc as any).location_type || "Not specified"} {(disc as any).location_address ? `, ${(disc as any).location_address}` : ""}</div>
            <div><strong>Content types:</strong> {[
              (disc as any).content_type_nudity && "Nudity",
              (disc as any).content_type_artistic_nudity && "Artistic nude",
              (disc as any).content_type_boudoir && "Boudoir",
              (disc as any).content_type_portrait && "Portrait",
              (disc as any).content_type_fashion && "Fashion",
              (disc as any).content_type_editorial && "Editorial",
              (disc as any).content_type_commercial && "Commercial",
              (disc as any).content_type_conceptual && "Conceptual",
              (disc as any).content_type_other && ((disc as any).content_type_other_desc || "Other"),
            ].filter(Boolean).join(", ") || "Not specified"}</div>
            <div style={{ marginTop: 8, padding: 10, background: "rgba(255,255,255,0.04)", borderRadius: 8, fontSize: 12 }}>
              <strong>Boundary Checklist:</strong>
              <div style={{ marginTop: 4 }}>
                {(disc as any).boundary_no_penetration && <span style={{ color: "#4ecdc4" }}>✓ No penetration</span>}
                {(disc as any).boundary_no_touching && <span style={{ color: "#4ecdc4", marginLeft: 12 }}>✓ No touching between parties</span>}
                {(disc as any).boundary_explicit_acts && <span style={{ color: "#ff6b6b", marginLeft: 12 }}>⚠ Explicit acts included</span>}
                {(disc as any).boundary_penetration && <span style={{ color: "#ff6b6b", marginLeft: 12 }}>⚠ Penetration included</span>}
              </div>
            </div>
            <div style={{ marginTop: 8 }}><strong>Others present:</strong> {(disc as any).others_present ? `${(disc as any).others_count}. ${(disc as any).others_desc || "See details"}` : "No. Solo shoot"}</div>
            <div><strong>Usage rights:</strong> {(disc as any).usage_rights || "Not specified"}</div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "none", color: "#f5f0ff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Decline</button>
            <button onClick={() => onConfirm((disc as any).id)} disabled={loading} style={{ flex: 1, padding: "10px 0", borderRadius: 12, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
              {loading ? "Confirming..." : "I Confirm These Terms"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // NEW DISCLOSURE — FORM WIZARD
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
      <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 20, padding: 28, maxWidth: 560, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffd700" }}>📋 Shoot Disclosure</h2>
          <button onClick={onCancel} aria-label="Close" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 20, lineHeight: 1.5 }}>
          Both you and <strong style={{ color: "#ffd700" }}>{responderName}</strong> must review and confirm the same document. This protects everyone.
        </p>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {["Compensation", "Content", "Boundaries", "Location", "Terms"].map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "#ffd700" : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
          ))}
        </div>

        {/* STEP 0: Compensation */}
        {step === 0 && (
          <div>
            {section("Compensation", "💰")}
            {input("Amount (e.g. $150, TFP, Free)", form.compensationAmount, v => set("compensationAmount", v), "$150")}
            {select("Payment timing", form.compensationTiming, ["Before shoot", "After shoot", "Half upfront / half after", "Upon delivery of photos", "Not applicable (TFP/free)"], v => set("compensationTiming", v))}
            {select("Payment method", form.compensationMethod, ["Cash", "Venmo/Zelle", "Stripe (in-app)", "Check", "Other", "Not applicable"], v => set("compensationMethod", v))}
          </div>
        )}

        {/* STEP 1: Content Type */}
        {step === 1 && (
          <div>
            {section("Content Type", "📷")}
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Select all that apply to this shoot.</p>
            {checkbox("Portrait", form.contentTypePortrait, v => set("contentTypePortrait", v))}
            {checkbox("Fashion", form.contentTypeFashion, v => set("contentTypeFashion", v))}
            {checkbox("Editorial", form.contentTypeEditorial, v => set("contentTypeEditorial", v))}
            {checkbox("Commercial", form.contentTypeCommercial, v => set("contentTypeCommercial", v))}
            {checkbox("Conceptual / Art", form.contentTypeConceptual, v => set("contentTypeConceptual", v))}
            {checkbox("Boudoir", form.contentTypeBoudoir, v => set("contentTypeBoudoir", v))}
            {checkbox("Artistic Nude", form.contentTypeArtisticNude, v => set("contentTypeArtisticNude", v), "Artistic, non-sexual nudity")}
            {checkbox("Nudity", form.contentTypeNudity, v => set("contentTypeNudity", v), "May include explicit content")}
            {checkbox("Other", form.contentTypeOther, v => set("contentTypeOther", v))}
            {form.contentTypeOther && input("Describe", form.contentTypeOtherDesc, v => set("contentTypeOtherDesc", v))}
          </div>
        )}

        {/* STEP 2: Boundary Checklist — THE PRIMING DEVICE */}
        {step === 2 && (
          <div>
            {section("Boundary Checklist", "🛡️")}
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 14, lineHeight: 1.5 }}>
              Check each item that applies. Items marked &quot;none&quot; are <strong>deliberately shown</strong> to ensure both parties think about every boundary, even ones you don&apos;t plan to cross.
            </p>

            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8, marginTop: 16 }}>Nudity Level</div>
            {checkbox("Full nudity", form.boundaryFullNudity, v => set("boundaryFullNudity", v))}
            {checkbox("Implied nudity (covered/suggested)", form.boundaryImpliedNudity, v => set("boundaryImpliedNudity", v))}
            {checkbox("Partial nudity (topless, etc.)", form.boundaryPartials, v => set("boundaryPartials", v))}
            {checkbox("No partial nudity", form.boundaryNoPartials, v => set("boundaryNoPartials", v), "Checked = boundaries are clear")}

            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8, marginTop: 16 }}>Physical Contact</div>
            {checkbox("Touching self (poses)", form.boundaryTouchingSelf, v => set("boundaryTouchingSelf", v))}
            {checkbox("Touching between parties", form.boundaryTouchingOther, v => set("boundaryTouchingOther", v))}
            {checkbox("No touching between parties", form.boundaryNoTouching, v => set("boundaryNoTouching", v), "Checked = boundaries are clear")}

            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8, marginTop: 16 }}>Content Boundaries</div>
            {checkbox("Explicit sexual acts", form.boundaryExplicitActs, v => set("boundaryExplicitActs", v), "⚠ If checked with payment → auto-blocked")}
            {checkbox("Penetration", form.boundaryPenetration, v => set("boundaryPenetration", v), "⚠ If checked with payment → auto-blocked")}
            {checkbox("No penetration", form.boundaryNoPenetration, v => set("boundaryNoPenetration", v), "Checked = boundaries are clear")}
          </div>
        )}

        {/* STEP 3: Location & People */}
        {step === 3 && (
          <div>
            {section("Location & People Present", "📍")}
            {select("Location type", form.locationType, ["Certified/Professional Studio", "Private Studio (rented)", "Private Residence", "Outdoor/Public", "Hotel/Airbnb", "Other"], v => set("locationType", v))}
            {input("Address or area", form.locationAddress, v => set("locationAddress", v), "e.g. Downtown LA or exact address")}
            {checkbox("Location is public/not private", form.locationPublic, v => set("locationPublic", v))}

            <div style={{ marginTop: 16 }}>
              {checkbox("Others will be present", form.othersPresent, v => set("othersPresent", v))}
              {form.othersPresent && (
                <div style={{ marginLeft: 26, marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>How many?</label>
                    <input type="number" min={0} max={20} value={form.othersCount} onChange={e => set("othersCount", parseInt(e.target.value) || 0)} style={{ width: 60, padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f0ff", fontSize: 13 }} />
                  </div>
                  {input("Who will be present?", form.othersDesc, v => set("othersDesc", v), "e.g. Makeup artist, assistant, chaperone")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Terms & Acknowledgments */}
        {step === 4 && (
          <div>
            {section("Terms & Acknowledgments", "📝")}
            {select("Usage rights", form.usageRights, ["Portfolio use only", "Client/commercial use", "Editorial/magazine", "Social media", "Unlimited", "Custom"], v => set("usageRights", v))}
            {form.usageRights === "Custom" && input("Describe usage terms", form.usageCustomDesc, v => set("usageCustomDesc", v))}
            {checkbox("Model approves final edits before use", form.editApprovalRequired, v => set("editApprovalRequired", v))}
            {checkbox("NDA required (confidentiality agreement)", form.ndaRequired, v => set("ndaRequired", v))}
            {checkbox("Model release required", form.modelReleaseRequired, v => set("modelReleaseRequired", v))}

            <div style={{ marginTop: 20, padding: 14, background: "rgba(255,215,0,0.06)", borderRadius: 10, border: "1px solid rgba(255,215,0,0.15)" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.agreeTerms} onChange={e => set("agreeTerms", e.target.checked)} style={{ marginTop: 2, accentColor: "#ffd700", width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#f5f0ff", lineHeight: 1.5 }}>
                  I have read and agree to the <a href="/muse" style={{ color: "#ffd700" }}>Muse Community Guidelines</a> and <a href="/muse" style={{ color: "#ffd700" }}>Terms of Service</a>. I understand that this disclosure is a binding agreement between both parties for this specific shoot.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ padding: "10px 20px", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "none", color: "#f5f0ff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)} style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !form.agreeTerms} style={{ padding: "10px 24px", borderRadius: 12, background: wouldBlock ? "rgba(255,50,50,0.8)" : "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontSize: 13, fontWeight: 700, cursor: loading || !form.agreeTerms ? "not-allowed" : "pointer", opacity: !form.agreeTerms ? 0.5 : 1 }}>
              {loading ? "Sending..." : wouldBlock ? "⚠ Review & Submit" : "Send Disclosure"}
            </button>
          )}
        </div>

        {wouldBlock && (
          <p style={{ fontSize: 11, color: "#ff6b6b", marginTop: 10, textAlign: "center" }}>
            ⚠ This combination (NSFW content + payment) will be blocked per Muse terms.
          </p>
        )}
      </div>
    </div>
  );
}
