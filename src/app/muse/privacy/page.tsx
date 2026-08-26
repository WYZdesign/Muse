import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Muse",
  description: "How Muse collects, uses, and protects your personal information. Data security and your rights.",
  alternates: { canonical: "https://muse.wyzdesign.com/muse/privacy" },
  openGraph: { title: "Privacy Policy — Muse", description: "How Muse collects, uses, and protects your personal information. Data security and your rights.", url: "https://muse.wyzdesign.com/muse/privacy", siteName: "Muse", type: "website" },
  twitter: { card: "summary", title: "Privacy Policy — Muse", description: "How Muse collects, uses, and protects your personal information. Data security and your rights." },
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Privacy Policy</h1>
      <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 16 }}>Effective August 13, 2026 &middot; Muse by WYZ Design</p>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>1. Information We Collect</h2>
        <p style={{ marginBottom: 16 }}>We collect: your name, email, profile photos, bio, location, creative style tags, portfolio images, chat messages, booking details, device info, IP address, and geolocation (with your permission). Stripe Identity collects government ID and selfie for verification.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>2. How We Use Your Data</h2>
        <p style={{ marginBottom: 16 }}>Your data powers: profile matching, geolocation-based discovery, content moderation (AWS Rekognition), age verification (Stripe Identity), payment processing (Stripe), push notifications, and analytics to improve the platform. We never sell your data.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>3. Third-Party Services</h2>
        <p style={{ marginBottom: 16 }}>We share data with: <strong>Supabase</strong> (database/auth), <strong>Stripe</strong> (payments/identity), <strong>AWS Rekognition</strong> (content scanning), <strong>Mapbox</strong> (geolocation), and <strong>Vercel</strong> (hosting). Each has their own privacy policy.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>4. Data Retention</h2>
        <p style={{ marginBottom: 16 }}>We retain your data for the lifetime of your account plus 30 days after deletion. Content moderation logs are kept for 1 year. Booking records are kept for 7 years for tax/legal compliance.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>5. Your Rights</h2>
        <p style={{ marginBottom: 16 }}>You may: access your data, correct inaccuracies, export your data, delete your account, opt out of marketing. Contact <a href="mailto:privacy@wyzdesign.com" style={{ color: "#ffd700" }}>privacy@wyzdesign.com</a> for requests. We respond within 30 days.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>6. Data Security</h2>
        <p style={{ marginBottom: 16 }}>We use Supabase Row Level Security (RLS), HTTPS everywhere, DPAPI encryption for local credentials, and AWS KMS for secrets at rest. No system is perfectly secure, but we invest heavily in protecting your data.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>7. Children&apos;s Privacy</h2>
        <p style={{ marginBottom: 16 }}>Muse is strictly for ages 18+. We do not knowingly collect data from children. If you believe a child has used Muse, contact us immediately — we will delete all associated data within24 hours.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>8. Changes to This Policy</h2>
        <p style={{ marginBottom: 16 }}>We may update this policy. We will notify you of material changes via email or in-app notification. Your continued use after changes means you accept the new policy.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>9. Contact</h2>
        <p>Privacy questions? Reach us at <a href="mailto:privacy@wyzdesign.com" style={{ color: "#ffd700" }}>privacy@wyzdesign.com</a></p>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
