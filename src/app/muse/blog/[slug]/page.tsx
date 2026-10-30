/** Blog post detail page — one route for every post in the index. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMuseUrl } from "@/lib/urls";

type Post = {
  slug: string;
  title: string;
  date: string;
  tag: string;
  excerpt: string;
  body: string[];
};

const TAG_COLORS: Record<string, string> = {
  Product: "#ffd700",
  Safety: "#ef4444",
  Engineering: "#3b82f6",
  Community: "#8b5cf6",
  News: "#10b981",
};

const POSTS: Post[] = [
  {
    slug: "why-muse-exists",
    title: "Why Musa by WYZ Exists",
    date: "2026-09-01",
    tag: "Product",
    excerpt: "Creative collaboration shouldn't require a middleman. Musa connects artists directly — securely, privately, and on their own terms.",
    body: [
      "Creative collaboration shouldn't require a middleman, a cut of your earnings, or a platform that treats you as inventory. Musa exists because we built the tool we wished existed.",
      "Photographers, models, filmmakers, musicians, and designers spend hours on platforms that bury their work behind algorithms, take 20% off the top, or worse, expose their personal contact information to strangers. Musa flips that model.",
      "Every connection starts with mutual interest. Every payment is protected. Every profile is verified before it goes live. The result is a creative network where the focus is on the work, not on the platform.",
      "We're building Musa for the working creative — someone who books real shoots, invoices real clients, and needs a professional network that respects their time and their craft.",
      "This is just the beginning. We have a lot more planned.",
    ],
  },
  {
    slug: "safety-by-design",
    title: "Safety by Design: How We Built Musa",
    date: "2026-08-20",
    tag: "Safety",
    excerpt: "Age verification, identity checks, and content moderation aren't afterthoughts — they're baked into the foundation.",
    body: [
      "Safety isn't a feature you bolt on at the end. It's a decision you make at the very beginning, and it shapes every single choice that follows.",
      "Musa was built from day one with age verification, identity checks, and content moderation as foundational requirements. Every profile that goes live passes through our verification pipeline before anyone else can see it.",
      "We use Stripe Identity for document verification, AWS Rekognition for age estimation, and a layered content moderation system that scans every upload before it reaches other users. None of these are optional — they're enforced by the backend, not just the UI.",
      "We also built a reporting system with a clear escalation path. Reports go into a queue that our moderation team reviews, with NCMec reporting automated for content that matches known CSAM databases.",
      "Safety by design means the platform protects you even when you don't know you need protection.",
    ],
  },
  {
    slug: "behind-the-scenes-verification",
    title: "Behind the Scenes: Identity Verification",
    date: "2026-08-10",
    tag: "Engineering",
    excerpt: "How Stripe Identity, AWS Rekognition, and Supabase work together to verify creators without exposing their data.",
    body: [
      "Identity verification is one of those features that's invisible when it works and infuriating when it doesn't. Here's how we built ours.",
      "The pipeline starts with a document upload — a driver's license or passport. We send it to Stripe Identity, which extracts the face photo and document details, then compares them against a live selfie the user takes in the browser.",
      "Stripe returns a verification result that we store in Supabase alongside the user's profile. The raw document never touches our servers — Stripe handles the sensitive data and returns only a pass/fail result plus the extracted face photo.",
      "For age estimation, we use AWS Rekognition's face comparison against the document photo. If Rekognition estimates the user is under 18, verification fails and the account is restricted.",
      "The whole flow takes about 30 seconds on a good connection. Users get a verified badge, and the rest of the community knows they're talking to a real person.",
    ],
  },
  {
    slug: "community-guidelines",
    title: "Community Guidelines: Our Commitment",
    date: "2026-07-28",
    tag: "Community",
    excerpt: "What we expect from Musa creators and what you can expect from us.",
    body: [
      "Musa is a professional creative network. That means we have expectations — and so should you.",
      "Be respectful. Treat every person on Musa the way you'd treat a collaborator on set. Harassment, discrimination, and hate speech have no place here.",
      "Be honest. Your profile should represent who you actually are. Misrepresenting your identity, your experience, or your intentions is grounds for removal.",
      "Be professional. Musa is for work, not for pickup lines. Unsolicited sexual messages, spam, and predatory behavior are reported and reviewed.",
      "We take reports seriously. Every report is reviewed by our moderation team, and serious violations result in immediate account suspension.",
      "In return, you can expect a platform that protects your privacy, pays you fairly, and takes your safety as seriously as you do.",
    ],
  },
  {
    slug: "launch-recap",
    title: "Musa Launch Recap",
    date: "2026-07-15",
    tag: "News",
    excerpt: "Our first month: the numbers, the stories, and what's next for the platform.",
    body: [
      "One month ago, we opened Musa to the public. Here's what happened.",
      "In our first month, we onboarded hundreds of verified creators across photography, modeling, film, music, and design. The most popular categories were portrait photography and fashion modeling, with Los Angeles leading as the top city.",
      "We processed our first protected payments, resolved our first disputes, and verified our first thousand profiles. Every one of those milestones taught us something about what creatives actually need.",
      "The most common feedback we received: \"Finally, a platform that doesn't take a cut.\" That tells us we're building the right thing.",
      "Next up: mobile apps, expanded payment options, and a deeper community features set. Stay tuned.",
    ],
  },
];

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return { title: "Post not found — Musa by WYZ" };
  return {
    title: `${post.title} — Musa Blog`,
    description: post.excerpt,
    alternates: { canonical: getMuseUrl() + `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, url: getMuseUrl() + `/blog/${post.slug}`, siteName: "Musa by WYZ", type: "article", publishedTime: post.date },
    twitter: { card: "summary", title: post.title, description: post.excerpt },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const color = TAG_COLORS[post.tag] || "#ffd700";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}15`, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{post.tag}</span>
        <time style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{post.date}</time>
      </div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#fff", lineHeight: 1.3 }}>{post.title}</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.9, fontSize: 16 }}>
        {post.body.map((para, i) => (
          <p key={i} style={{ marginBottom: 20 }}>{para}</p>
        ))}
      </div>
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <a href="/muse/blog" style={{ color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; All posts</a>
      </div>
    </div>
  );
}
