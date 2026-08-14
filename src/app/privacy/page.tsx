import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Muse",
  description: "Learn how Muse collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0612", color: "#f5f0ff", padding: "60px 20px 100px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
        <a href="/muse" style={{ color: "#FFD700", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>&larr; Back to Muse</a>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 800, color: "#FFD700", margin: "12px 0 6px" }}>Privacy Policy</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 32 }}>Effective August 13, 2026 &middot; Muse by WYZ Design</p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>1. Information We Collect</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>We collect: your name, email, profile photos, bio, location, creative style tags, portfolio images, chat messages, booking details, device info, IP address, and geolocation (with your permission). Stripe Identity collects government ID and selfie for verification.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>2. How We Use Your Data</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Your data powers: profile matching, geolocation-based discovery, content moderation (AWS Rekognition), age verification (Stripe Identity), payment processing (Stripe), push notifications, and analytics to improve the platform. We never sell your data.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>3. Third-Party Services</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>We share data with: <strong>Supabase</strong> (database/auth), <strong>Stripe</strong> (payments/identity), <strong>AWS Rekognition</strong> (content scanning), <strong>Mapbox</strong> (geolocation), and <strong>Vercel</strong> (hosting). Each has their own privacy policy.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>4. Data Retention</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>We retain your data for the lifetime of your account plus 30 days after deletion. Content moderation logs are kept for 1 year. Booking records are kept for 7 years for tax/legal compliance.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>5. Your Rights</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>You may: access your data, correct inaccuracies, export your data, delete your account, opt out of marketing. Contact <a href="mailto:privacy@wyzdesign.com" style={{ color: "#FFD700" }}>privacy@wyzdesign.com</a> for requests. We respond within 30 days.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>6. Data Security</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>We use Supabase Row Level Security (RLS), HTTPS everywhere, DPAPI encryption for local credentials, and AWS KMS for secrets at rest. No system is perfectly secure, but we invest heavily in protecting your data.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>7. Children&apos;s Privacy</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Muse is strictly for ages 18+. We do not knowingly collect data from children. If you believe a child has used Muse, contact us immediately — we will delete all associated data within24 hours.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>8. Changes to This Policy</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>We may update this policy. We will notify you of material changes via email or in-app notification. Your continued use after changes means you accept the new policy.</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 8 }}>9. Contact</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>Privacy questions? Reach us at <a href="mailto:privacy@wyzdesign.com" style={{ color: "#FFD700" }}>privacy@wyzdesign.com</a></p>
        </section>
      </div>
    </main>
  );
}
