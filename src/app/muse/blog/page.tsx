import type { Metadata } from "next";
import { getMuseUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Blog — Muse",
  description: "Updates, insights, and stories from the Muse creative community and WYZ Design.",
  alternates: { canonical: getMuseUrl() + "/blog" },
  openGraph: { title: "Blog — Muse", description: "Updates, insights, and stories from the Muse creative community and WYZ Design.", url: getMuseUrl() + "/blog", siteName: "Muse", type: "website" },
  twitter: { card: "summary", title: "Blog — Muse", description: "Updates, insights, and stories from the Muse creative community and WYZ Design." },
};

const POSTS = [
  { slug: "why-muse-exists", title: "Why Muse Exists", date: "2026-09-01", tag: "Product", excerpt: "Creative collaboration shouldn't require a middleman. Muse connects artists directly — securely, privately, and on their own terms." },
  { slug: "safety-by-design", title: "Safety by Design: How We Built Muse", date: "2026-08-20", tag: "Safety", excerpt: "Age verification, identity checks, and content moderation aren't afterthoughts — they're baked into the foundation." },
  { slug: "behind-the-scenes-verification", title: "Behind the Scenes: Identity Verification", date: "2026-08-10", tag: "Engineering", excerpt: "How Stripe Identity, AWS Rekognition, and Supabase work together to verify creators without exposing their data." },
  { slug: "community-guidelines", title: "Community Guidelines: Our Commitment", date: "2026-07-28", tag: "Community", excerpt: "What we expect from Muse creators and what you can expect from us." },
  { slug: "launch-recap", title: "Muse Launch Recap", date: "2026-07-15", tag: "News", excerpt: "Our first month: the numbers, the stories, and what's next for the platform." },
];

const TAG_COLORS: Record<string, string> = {
  Product: "#ffd700",
  Safety: "#ef4444",
  Engineering: "#3b82f6",
  Community: "#8b5cf6",
  News: "#10b981",
};

export default function BlogPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 8, color: "#ffd700" }}>Blog</h1>
      <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 48, fontSize: 14 }}>Updates, insights, and stories from the Muse team.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {POSTS.map((post) => (
          <article key={post.slug} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: TAG_COLORS[post.tag] || "#ffd700", background: `${TAG_COLORS[post.tag] || "#ffd700"}15`, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {post.tag}
              </span>
              <time style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{post.date}</time>
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fff", marginBottom: 8 }}>{post.title}</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7, fontSize: 14, margin: 0 }}>{post.excerpt}</p>
          </article>
        ))}
      </div>

      <div style={{ marginTop: 64, padding: 24, border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 }}>
          Want to write for us? <a href="mailto:blog@muse.wyzdesign.com" style={{ color: "#ffd700", textDecoration: "none" }}>Get in touch</a>.
        </p>
      </div>

      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Muse</a>
    </div>
  );
}
