export default function GuidelinesPage() {
  const rules = [
    { title: "Be respectful", desc: "Treat every member with professionalism and dignity. Creative work is personal — honor that." },
    { title: "Be real", desc: "Use your real identity. Fake profiles undermine the trust that makes collaboration possible." },
    { title: "Be safe", desc: "Use Muse's built-in safety features. They exist to protect you and the people you work with." },
    { title: "No harassment", desc: "Zero tolerance for harassment, discrimination, or predatory behavior of any kind." },
    { title: "No fraud", desc: "Don't misrepresent yourself, your work, or your intentions. Scams and catfishing result in immediate bans." },
    { title: "Verify your identity", desc: "Complete Stripe Identity verification to unlock the full platform. It protects you and everyone you work with." },
    { title: "Use safety features", desc: "Fill out disclosure forms, set up 24hr check-ins, and add trusted contacts before meets." },
    { title: "Report violations", desc: "See something wrong? Report it. We review every report and take action." },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Community Guidelines</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <p style={{ marginBottom: 32 }}>Be respectful. Be real. Be safe.</p>
        <div>
          {rules.map((rule, i) => (
            <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{rule.title}</h3>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.55)" }}>{rule.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
