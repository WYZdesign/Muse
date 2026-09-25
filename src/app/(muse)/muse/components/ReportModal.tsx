import type { KeyboardEvent, Ref } from "react";
import { FiArrowLeft, FiX } from "react-icons/fi";

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
      } catch {
        console.debug("[muse] report request failed");
      }
      onReported(reported ? `Reported: ${reason}` : "Failed to report");
    }
    onClose();
  };

  const onReasonKeyDown = (event: KeyboardEvent<HTMLDivElement>, reason: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    void submit(reason);
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
          <div
            key={reason.label}
            className="report-option"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => onReasonKeyDown(event, reason.label)}
            onClick={() => void submit(reason.label)}
          >
            <div className="report-option-icon">{reason.icon}</div>
            <div>
              <div className="report-option-text">{reason.label}</div>
              <div className="report-option-desc">{reason.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
