import type { Metadata } from "next";
import { getPressUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Press — Muse",
  description: "Press and media inquiries for Muse. Brand assets and contact information.",
  alternates: { canonical: getPressUrl() },
  openGraph: { title: "Press — Muse", description: "Press and media inquiries for Muse. Brand assets and contact information.", url: getPressUrl(), siteName: "Muse", type: "website" },
  twitter: { card: "summary", title: "Press — Muse", description: "Press and media inquiries for Muse. Brand assets and contact information." },
};

export default function PressPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Press</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <p style={{ marginBottom: 24 }}>
          For press inquiries, contact{" "}
          <a href="mailto:info@wyzdesign.com" style={{ color: "#ffd700" }}>info@wyzdesign.com</a>.
          Brand assets available on request.
        </p>
        <p>
          Muse is built by WYZ Design, a creative technology studio focused on building safer, smarter
          tools for the creative industry.
        </p>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
