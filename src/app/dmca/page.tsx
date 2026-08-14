import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA Takedown Policy — Muse",
  description: "Report copyright infringement on the Muse platform.",
};

export default function DMCAPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0612", color: "#f5f0ff", padding: "60px 20px 100px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
        <a href="/muse" style={{ color: "#FFD700", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>&larr; Back to Muse</a>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 800, color: "#FFD700", margin: "12px 0 6px" }}>DMCA Takedown Policy</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 32 }}>Effective August 13, 2026 &middot; Muse by WYZ Design</p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Filing a DMCA Takedown Notice</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>If your copyrighted work appears on Muse without your permission, send a written notice to our Designated Agent containing:</p>
          <ol style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", paddingLeft: 24, marginTop: 8 }}>
            <li>Your signature (physical or electronic)</li>
            <li>Identification of the copyrighted work</li>
            <li>Identification of the infringing material and its location on Muse</li>
            <li>Your contact information</li>
            <li>A statement of good-faith belief that the use is unauthorized</li>
            <li>A statement under penalty of perjury that the info is accurate</li>
          </ol>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Designated Agent</h2>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.03)", padding: "16px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ margin: 0 }}><strong>Torre Marcel</strong></p>
            <p style={{ margin: "4px 0 0" }}>WYZ Design LLC</p>
            <p style={{ margin: "4px 0 0" }}>Email: <a href="mailto:dmca@wyzdesign.com" style={{ color: "#FFD700" }}>dmca@wyzdesign.com</a></p>
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Counter-Notification</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>If you believe your content was wrongly removed, you may file a counter-notification containing your signature, identification of the material, a statement under penalty of perjury, and consent to jurisdiction. We will restore the content within 10-14 business days unless the original complainant files a court action.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>Repeat Infringers</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Muse terminates accounts of repeat infringers. Two valid DMCA takedowns within any 12-month period result in permanent account termination.</p>
        </section>
      </div>
    </main>
  );
}
