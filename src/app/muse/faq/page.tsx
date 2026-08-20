"use client";
import { useState } from "react";

const faqs = [
  { q: "When does Muse launch?", a: "Muse is currently in development. We're targeting a beta launch in 2026. Sign up on the landing page to get early access." },
  { q: "How does verification work?", a: "We use Stripe Identity for age verification and government ID checks. Creators must verify before engaging in paid work or collaborations." },
  { q: "Is Muse free?", a: "Yes — the free tier includes profile creation, browsing, limited connections, community feed, and all safety features. Muse Pro ($9.99/mo) unlocks advanced tools." },
  { q: "How is Muse different from Instagram?", a: "Muse is a professional network for creatives, not a social media feed. It's built around real collaboration — finding crew, booking talent, and verified trust signals — not likes and algorithms." },
  { q: "Is my data safe?", a: "Yes. We never sell your data. All personal information is encrypted, and safety features like disclosure forms and 24hr check-ins are built into the platform by default." },
  { q: "Who is Muse for?", a: "Photographers, models, filmmakers, musicians, designers, and any creative professional looking for real, verified collaboration opportunities." },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>FAQ</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%", background: "none", border: "none", padding: "20px 0", textAlign: "left",
                color: "#fff", fontSize: 16, fontWeight: 500, cursor: "pointer", display: "flex",
                justifyContent: "space-between", alignItems: "center", fontFamily: "inherit",
              }}
            >
              {faq.q}
              <span style={{ color: "#ffd700", fontSize: 20, transition: "transform 0.2s", transform: open === i ? "rotate(45deg)" : "rotate(0)" }}>+</span>
            </button>
            {open === i && (
              <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,0.6)" }}>{faq.a}</p>
            )}
          </div>
        ))}
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
