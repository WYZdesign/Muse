export default function TermsPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Terms of Service</h1>
      <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 16 }}>
        Last updated: August 2026
      </p>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>1. Acceptance of Terms</h2>
        <p style={{ marginBottom: 16 }}>
          By accessing or using Muse (&quot;muse.wyzdesign.com&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.
        </p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>2. Who We Are</h2>
        <p style={{ marginBottom: 16 }}>
          Muse is a creative professional network operated by WYZ Design. We connect photographers, models, filmmakers, musicians, designers, and other creatives for collaboration, booking, and community.
        </p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>3. Eligibility</h2>
        <p style={{ marginBottom: 16 }}>
          You must be at least 18 years old to use Muse. By creating an account, you represent and warrant that you meet this requirement and have the legal capacity to enter into these terms.
        </p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>4. Account Registration</h2>
        <p style={{ marginBottom: 16 }}>
          You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You agree to provide accurate, current information during registration and to update it as needed.
        </p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>5. Platform Rules</h2>
        <p style={{ marginBottom: 16 }}>
          You agree not to: harass, threaten, or harm other users; post false, misleading, or fraudulent content; circumvent safety features including disclosure forms and check-ins; use the platform for illegal activity; or attempt to access other users&apos; accounts.
        </p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>6. Bookings &amp; Payments</h2>
        <p style={{ marginBottom: 16 }}>
          Muse Pro subscriptions are processed through Stripe. Fees are non-refundable except where required by law. Free-tier users can access core features without payment. Founding member benefits are tied to your account and cannot be transferred.
        </p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>7. Safety Features</h2>
        <p style={{ marginBottom: 16 }}>
          Muse provides disclosure forms, 24-hour check-ins, trusted contacts, and reporting tools. These are designed to enhance your safety but do not guarantee it. You are responsible for your own safety during any in-person meeting.
        </p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>8. Termination</h2>
        <p style={{ marginBottom: 16 }}>
          We may suspend or terminate your account at any time for violations of these terms. You may delete your account at any time from Settings. Upon termination, your right to use the platform ceases immediately.
        </p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>9. Changes to These Terms</h2>
        <p style={{ marginBottom: 16 }}>
          We may update these terms from time to time. Continued use of Muse after changes constitutes acceptance of the updated terms.
        </p>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>10. Contact</h2>
        <p>
          Questions about these terms? Email us at <a href="mailto:info@wyzdesign.com" style={{ color: "#ffd700" }}>info@wyzdesign.com</a>.
        </p>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
