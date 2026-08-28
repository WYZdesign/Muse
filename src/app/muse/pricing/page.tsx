import type { Metadata } from "next";
import { getMuseUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Pricing — Muse",
  description: "Muse pricing: a free tier forever, plus Muse Pro at $9.99/month. Founding members get lifetime Pro free.",
  alternates: { canonical: getMuseUrl() + "/pricing" },
  openGraph: { title: "Pricing — Muse", description: "Muse pricing: a free tier forever, plus Muse Pro at $9.99/month. Founding members get lifetime Pro free.", url: getMuseUrl() + "/pricing", siteName: "Muse", type: "website" },
  twitter: { card: "summary", title: "Pricing — Muse", description: "Muse pricing: a free tier forever, plus Muse Pro at $9.99/month. Founding members get lifetime Pro free." },
};

export default function PricingPage() {
  const freeFeatures = [
    "Create a profile",
    "Browse creatives",
    "Limited connection requests (5/week)",
    "Community feed access",
    "Safety features",
  ];
  const proFeatures = [
    "Unlimited connection requests",
    "Advanced search filters",
    "Portfolio analytics",
    "Priority in search results",
    "Direct messaging",
    "Project collaboration tools",
    "Early access to new features",
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Pricing</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <p style={{ marginBottom: 48 }}>Free tier forever. Muse Pro at $9.99/mo. Founding members get lifetime Pro free.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ border: "1px solid rgba(255,215,0,0.2)", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 1.25, fontWeight: 600, marginBottom: 4, color: "#fff" }}>Free</h2>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#ffd700", marginBottom: 24 }}>$0<span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/forever</span></p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {freeFeatures.map((f, i) => (
                <li key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{f}</li>
              ))}
            </ul>
          </div>

          <div style={{ border: "1px solid rgba(255,215,0,0.5)", borderRadius: 12, padding: 32, background: "rgba(255,215,0,0.04)" }}>
            <h2 style={{ fontSize: 1.25, fontWeight: 600, marginBottom: 4, color: "#fff" }}>Pro</h2>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#ffd700", marginBottom: 24 }}>$9.99<span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/mo</span></p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {proFeatures.map((f, i) => (
                <li key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{f}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <a href="/muse/landing#join" style={{ display: "inline-block", padding: "14px 36px", borderRadius: 999, background: "#ffd700", color: "#000", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>Join the Waitlist</a>
        </div>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 24, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
