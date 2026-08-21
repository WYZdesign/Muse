import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Muse",
  description: "Updates, insights, and stories from the Muse creative community and WYZ Design.",
  alternates: { canonical: "https://muse.wyzdesign.com/muse/blog" },
  openGraph: { title: "Blog — Muse", description: "Updates, insights, and stories from the Muse creative community and WYZ Design.", url: "https://muse.wyzdesign.com/muse/blog", siteName: "Muse", type: "website" },
  twitter: { card: "summary", title: "Blog — Muse", description: "Updates, insights, and stories from the Muse creative community and WYZ Design." },
};

export default function BlogPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Blog</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <p style={{ marginBottom: 24 }}>
          Coming soon. Stay tuned for updates on the Muse platform, creative industry insights, and community stories.
        </p>
        <p>
          We'll be sharing product updates, safety best practices, interviews with creatives, and behind-the-scenes
          looks at how we're building the future of creative collaboration.
        </p>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
