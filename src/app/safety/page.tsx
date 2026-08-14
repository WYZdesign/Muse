import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Guidelines — Muse",
  description: "Muse community standards for creative professional networking.",
};

export default function SafetyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0612", color: "#f5f0ff", padding: "60px 20px 100px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
        <a href="/muse" style={{ color: "#FFD700", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>&larr; Back to Muse</a>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 800, color: "#FFD700", margin: "12px 0 6px" }}>Community Guidelines</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 32 }}>Effective August 13, 2026 &middot; Muse by WYZ Design</p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Be Professional</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Muse exists to connect creatives for professional work. Treat every interaction as a potential collaboration. Introduce yourself properly, discuss rates upfront, and follow through on commitments.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Zero-Tolerance: CSAM</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}><strong>Any sexual content involving minors results in immediate account termination and referral to NCMEC CyberTipline and law enforcement.</strong> No exceptions, no warnings. This is federal law (18 USC 2258A).</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Content Standards</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}><strong>Allowed:</strong> Professional portfolios, behind-the-scenes, creative process, tasteful artistic nudity (18+, behind age-gate).</p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", marginTop: 6 }}><strong>Prohibited:</strong> CSAM, non-consensual imagery, hate symbols, graphic violence, illegal content, spam, scams.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Harassment &amp; Safety</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>No stalking, threats, doxxing, or unwanted sexual advances. Respect boundaries — a declined collaboration is final. Report violations immediately via the in-app report button or email <a href="mailto:safety@wyzdesign.com" style={{ color: "#FFD700" }}>safety@wyzdesign.com</a>.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Reporting Violations</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Use the ⚐ report button on any profile or message. Reports are reviewed within 24 hours. For urgent safety concerns email <a href="mailto:safety@wyzdesign.com" style={{ color: "#FFD700" }}>safety@wyzdesign.com</a>.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Enforcement</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Violations result in warnings, temporary suspensions, or permanent bans depending on severity. CSAM and non-consensual content trigger immediate termination. All enforcement decisions are final.</p>
        </section>
      </div>
    </main>
  );
}
