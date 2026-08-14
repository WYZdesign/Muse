import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Muse",
  description: "Read Muse's Terms of Service for the creative professional networking platform.",
};

export default function TermsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0612", color: "#f5f0ff", padding: "60px 20px 100px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
        <a href="/muse" style={{ color: "#FFD700", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>&larr; Back to Muse</a>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 800, color: "#FFD700", margin: "12px 0 6px" }}>Terms of Service</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 32 }}>Effective August 13, 2026 &middot; Muse by WYZ Design</p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>1. Acceptance of Terms</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>By creating an account, accessing, or using Muse (&quot;Platform&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Platform.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>2. Description of Service</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Muse is a creative professional networking platform connecting photographers, models, filmmakers, musicians, designers, artists, and other creative professionals for collaboration, booking, and professional growth. Muse is <strong>not</strong> a dating platform. All interactions are expected to remain professional.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>3. Eligibility</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>You must be at least 18 years of age. Paid bookings and adult content require government-issued ID verification via Stripe Identity (document + selfie). Certain jurisdictions impose additional age-verification requirements for adult content — see Section 8.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>4. Your Account</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>You are responsible for all activity under your account. You must provide accurate information and keep your credentials secure. One account per person. We may suspend accounts that violate these Terms.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>5. Content You Post</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>You retain ownership of all content you post. By posting, you grant Muse a worldwide, non-exclusive, royalty-free license to display, distribute, and modify your content solely to operate and improve the Platform. You are solely responsible for your content.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>6. Content We Prohibit</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>The following are strictly prohibited and will result in immediate account suspension and, where applicable, referral to law enforcement:</p>
          <ul style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", paddingLeft: 24, marginTop: 8 }}>
            <li>Child sexual abuse material (CSAM) — zero-tolerance, reported to NCMEC CyberTipline</li>
            <li>Non-consensual intimate imagery</li>
            <li>Hate speech, threats, or harassment</li>
            <li>Spam, scams, or deceptive practices</li>
            <li>Impersonation of another person or brand</li>
          </ul>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>7. NSFW / Adult Content</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Adult content is age-gated and hidden by default. Users must explicitly opt in via Settings and pass an age check. Some jurisdictions require government-issued ID verification for adult content — see Section 8.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>8. Age &amp; Identity Verification</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Stripe Identity (government ID + live selfie) is required before any paid booking. In certain U.S. states — including Texas (HB 1181), Louisiana (Act 440), Arkansas, and Utah — additional age verification is required for access to adult content. Muse enforces this automatically via IP geolocation + Stripe Identity.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>9. Payments &amp; Bookings</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>All paid bookings are processed via Stripe Connect. Muse charges a 5% platform commission on each completed booking. Refund disputes are between the provider and the client; Muse will mediate if needed. Tipping is non-refundable.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>10. DMCA &amp; Copyright</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>We respect intellectual property. If your work appears on Muse without authorization, submit a DMCA takedown notice to <a href="mailto:dmca@wyzdesign.com" style={{ color: "#FFD700" }}>dmca@wyzdesign.com</a>. Repeat infringers will have their accounts permanently banned. See our <a href="/dmca" style={{ color: "#FFD700" }}>DMCA page</a> for the full procedure.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>11. Content Moderation &amp; Safety</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Muse uses automated content scanning (AWS Rekognition) on every image upload. Flagged content is reviewed and, where legally required, reported to NCMEC CyberTipline. We also employ human review for escalated cases. Muse reserves the right to remove any content at our discretion.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>12. Account Suspension &amp; Termination</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>We may suspend or terminate your account for violating these Terms, with or without notice. You may delete your account at any time via Settings. Upon termination your data will be retained for 30 days then permanently deleted, except where retention is required by law.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>13. Intellectual Property</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>The Muse name, logo, and visual design are the exclusive property of WYZ Design LLC. Your creative work remains yours — Muse does not claim ownership.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>14. Disclaimer of Warranties</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>THE PLATFORM IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. We do not warrant that the Platform will be uninterrupted, error-free, or secure.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>15. Limitation of Liability</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, MUSE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. Our total liability shall not exceed $100 USD or the amount you paid us in the last 12 months, whichever is greater.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>16. Indemnification</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>You agree to indemnify and hold harmless WYZ Design LLC from any claims arising from your use of the Platform or violation of these Terms.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>17. Dispute Resolution</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Any disputes shall be resolved through binding arbitration under the rules of the American Arbitration Association. Class action lawsuits are waived to the extent permitted by law.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>18. Governing Law</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>19. Changes to Terms</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>We may update these Terms from time to time. We will notify you of material changes. Continued use of the Platform after changes constitutes acceptance.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>20. Contact</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Questions? Reach us at <a href="mailto:legal@wyzdesign.com" style={{ color: "#FFD700" }}>legal@wyzdesign.com</a></p>
        </section>
      </div>
    </main>
  );
}
