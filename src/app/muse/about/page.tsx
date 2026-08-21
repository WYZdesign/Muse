import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Muse — The Creative Professional Network",
  description: "Muse is a creative professional network by WYZ Design. We connect photographers, models, filmmakers, musicians, and designers for real collaboration, booking, and community.",
  alternates: { canonical: "https://muse.wyzdesign.com/muse/about" },
  openGraph: { title: "About Muse — The Creative Professional Network", description: "Muse is a creative professional network by WYZ Design. We connect photographers, models, filmmakers, musicians, and designers for real collaboration, booking, and community.", url: "https://muse.wyzdesign.com/muse/about", siteName: "Muse", type: "website" },
  twitter: { card: "summary", title: "About Muse — The Creative Professional Network", description: "Muse is a creative professional network by WYZ Design. We connect photographers, models, filmmakers, musicians, and designers for real collaboration, booking, and community." },
};

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>About Muse</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <p style={{ marginBottom: 24 }}>
          Muse is a creative professional network built by WYZ Design. We connect photographers, models,
          filmmakers, musicians, designers, and artists for real collaboration.
        </p>
        <p style={{ marginBottom: 24 }}>
          The creative industry runs on trust. Every shoot, every project, every booking depends on knowing
          who you're working with. Muse was built to make that trust verifiable — not based on follower
          counts or filtered photos, but on real identity verification and community accountability.
        </p>
        <p>
          We're not a social media platform. We're a professional network where creatives find work,
          build teams, and collaborate safely.
        </p>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
