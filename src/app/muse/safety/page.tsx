export default function SafetyPage() {
  const features = [
    { title: "Disclosure Forms", desc: "Before any meet, both parties fill out disclosure forms — what they're planning, where, and who's involved." },
    { title: "24hr Check-Ins", desc: "Set a check-in timer before meets. If you don't check in, your trusted contacts are alerted automatically." },
    { title: "Trusted Contacts", desc: "Add people you trust. They get notified when you start a meet and can alert authorities if needed." },
    { title: "Instant Block", desc: "Block anyone instantly. No questions, no appeals, no awkward conversations. Your safety comes first." },
    { title: "Two-Track Enforcement", desc: "Violations are reviewed by real people, not algorithms. Severity determines the response — from warnings to permanent bans." },
    { title: "Age Verification via Stripe Identity", desc: "Every member verifies their identity through Stripe. No minors, no fakes, no anonymous predators." },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Safety Center</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <p style={{ marginBottom: 32 }}>Your safety is our foundation. Every feature is built around it.</p>
        <div>
          {features.map((f, i) => (
            <div key={i} style={{ padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#ffd700", marginBottom: 4 }}>{f.title}</h3>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.6)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
