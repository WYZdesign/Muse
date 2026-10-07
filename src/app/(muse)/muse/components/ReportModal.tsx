import type { Ref } from "react";
import { FiArrowLeft, FiX } from "react-icons/fi";
import { trackError } from "@/lib/errorTracker";

type ReportTarget = {
  id: number | string;
  type: string;
};

type ReportModalProps = {
  target: ReportTarget | null;
  dialogRef: Ref<HTMLDivElement>;
  apiFetch: (_input: string, _init?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onReported: (_message: string) => void;
};

const REPORT_REASONS = [
  { icon: "🚫", label: "Inappropriate Content", desc: "Nudity, violence, or spam" },
  { icon: "🎭", label: "Fake Profile", desc: "Not a real person or catfish" },
  { icon: "⚡", label: "Harassment", desc: "Threats, bullying, or hate speech" },
  { icon: "🔞", label: "Underage", desc: "User appears to be under 18" },
  { icon: "💼", label: "Scam or Fraud", desc: "Selling, soliciting, or phishing" },
  { icon: "📋", label: "Other", desc: "Something else not listed above" },
];

export function ReportModal({ target, dialogRef, apiFetch, onClose, onReported }: ReportModalProps) {
  const submit = async (reason: string) => {
    if (target) {
      let reported = false;
      try {
        const response = await apiFetch("/api/muse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "report", target_id: target.id, target_type: target.type, reason }),
        });
        reported = response.ok;
      } catch (err) {
        // A failed report is a silent trust & safety gap, not a cosmetic
        // glitch — the submitter sees "Failed to report" below, but without
        // this the team has no way to know reports are failing in prod.
        trackError("report_submit_failed", { targetType: target.type, err: String(err) });
      }
      onReported(reported ? `Reported: ${reason}` : "Failed to report");
    }
    onClose();
  };


  return (
    <div className="modal-overlay" ref={dialogRef} role="dialog" aria-modal="true" aria-label="Report">
      <div className="modal-header">
        <button className="modal-back" aria-label="Back" onClick={onClose}><FiArrowLeft size={20} /></button>
        <div className="modal-title">Report</div>
        <button className="modal-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button>
      </div>
      <div className="modal-body">
        {REPORT_REASONS.map((reason) => (
          <button
            type="button"
            key={reason.label}
            className="report-option"
            onClick={() => void submit(reason.label)}
            style={{ textAlign: "left", width: "100%" }}
          >
            <div className="report-option-icon">{reason.icon}</div>
            <div>
              <div className="report-option-text">{reason.label}</div>
              <div className="report-option-desc">{reason.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
