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
      <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 16 }}>Last updated: August 2026</p>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>1. Information We Collect</h2>
        <p style={{ marginBottom: 16 }}>We collect information you provide directly: name, email, phone, location, profile photos, portfolio content, and messages. We also collect usage data including device type, browser, IP address, and interaction patterns within the platform.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>2. How We Use Your Information</h2>
        <p style={{ marginBottom: 16 }}>Your information is used to: operate and improve the platform, match you with other creatives, process bookings and payments, send safety-related notifications, enforce our community guidelines, and communicate platform updates.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>3. Information Sharing</h2>
        <p style={{ marginBottom: 16 }}>We do not sell your personal information. We share data only: with other users as part of your profile (limited to what you choose to display), with Stripe for payment processing, with Supabase for authentication and data storage, and when required by law.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>4. Safety Data</h2>
        <p style={{ marginBottom: 16 }}>Disclosure forms, check-in data, and trusted contact information are handled with heightened security. Check-in data is deleted after the confirmation window expires. Trusted contact information is never visible to other users.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>5. Data Security</h2>
        <p style={{ marginBottom: 16 }}>We use industry-standard encryption for data in transit and at rest. Payment data is handled entirely by Stripe and never touches our servers. However, no method of transmission is 100% secure.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>6. Your Rights</h2>
        <p style={{ marginBottom: 16 }}>You can access, update, or delete your data at any time from Settings. Account deletion removes your profile, matches, and messages. Some data may be retained for legal or safety purposes as required by law.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>7. Children&apos;s Privacy</h2>
        <p style={{ marginBottom: 16 }}>Muse is not intended for users under 18. We do not knowingly collect data from minors.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>8. Changes to This Policy</h2>
        <p style={{ marginBottom: 16 }}>We may update this policy from time to time. Material changes will be communicated via the platform.</p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>9. Contact</h2>
        <p>Privacy questions? Email <a href="mailto:info@wyzdesign.com" style={{ color: "#ffd700" }}>info@wyzdesign.com</a>.</p>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
