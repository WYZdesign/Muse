/** Refund policy, linked from the pricing page and settings. */
import type { Metadata } from "next";
import { getMuseUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Refund Policy | Musa by WYZ",
  description: "Musa by WYZ refund policy for Musa Pro and Musa Studio subscriptions.",
  alternates: { canonical: getMuseUrl() + "/refund" },
};

export default function RefundPolicyPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Refund Policy</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <p style={{ marginBottom: 24 }}>
          We want you to love Musa. If a subscription is not right for you, contact us within 14 days of the charge and we will process a full refund. No questions asked.
        </p>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 8, color: "#fff" }}>How to request a refund</h2>
        <p style={{ marginBottom: 24 }}>
          Email <a href="mailto:info@wyzdesign.com" style={{ color: "#ffd700" }}>info@wyzdesign.com</a> with your account email and the date of the charge. We process refunds within 5 business days.
        </p>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 8, color: "#fff" }}>What is refunded</h2>
        <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
          <li>Musa Pro monthly and annual charges within 14 days</li>
          <li>Musa Studio monthly charges within 14 days</li>
          <li>Boost purchases if the boost did not deliver</li>
        </ul>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 8, color: "#fff" }}>What is not refunded</h2>
        <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
          <li>Charges older than 14 days</li>
          <li>Accounts terminated for terms-of-service violations</li>
          <li>Partial months after the 14-day window</li>
        </ul>
        <p style={{ marginBottom: 24 }}>
          Cancellations take effect at the end of the current billing period. You keep Pro or Studio features until then.
        </p>
        <a href="/muse/pricing" style={{ display: "inline-block", marginTop: 24, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Pricing</a>
      </div>
    </div>
  );
}
