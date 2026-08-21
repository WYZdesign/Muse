import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers — Join Muse / WYZ Design",
  description: "Help build the future of creative collaboration. Explore opportunities at WYZ Design.",
  alternates: { canonical: "https://muse.wyzdesign.com/muse/careers" },
  openGraph: { title: "Careers — Join Muse / WYZ Design", description: "Help build the future of creative collaboration. Explore opportunities at WYZ Design.", url: "https://muse.wyzdesign.com/muse/careers", siteName: "Muse", type: "website" },
  twitter: { card: "summary", title: "Careers — Join Muse / WYZ Design", description: "Help build the future of creative collaboration. Explore opportunities at WYZ Design." },
};

export default function CareersPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Careers</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <p style={{ marginBottom: 24 }}>
          We're building the future of creative collaboration. Interested in joining WYZ Design? Email us at{" "}
          <a href="mailto:info@wyzdesign.com" style={{ color: "#ffd700" }}>info@wyzdesign.com</a>
        </p>
        <p>
          We're a small, focused team working on hard problems — identity verification, trust systems, and
          building a platform that puts creator safety first. If that excites you, we'd love to hear from you.
        </p>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
