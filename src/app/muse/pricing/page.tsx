/** Public pricing page (plan tiers and CTAs). */
import type { Metadata } from "next";
import { getMuseUrl } from "@/lib/urls";

const PRICING_DESCRIPTION = "Musa by WYZ pricing: a free tier forever, Musa Pro at $9.99/month ($79.99/year), and Musa Studio at $29.99/month for hiring teams. Founding members get lifetime Pro free.";

export const metadata: Metadata = {
  title: "Pricing — Musa by WYZ",
  description: PRICING_DESCRIPTION,
  alternates: { canonical: getMuseUrl() + "/pricing" },
  openGraph: { title: "Pricing — Musa by WYZ", description: PRICING_DESCRIPTION, url: getMuseUrl() + "/pricing", siteName: "Musa by WYZ", type: "website" },
  twitter: { card: "summary", title: "Pricing — Musa by WYZ", description: PRICING_DESCRIPTION },
};

export default function PricingPage() {
  // Audit fix (2026-10-07): the previous copy claimed Pro unlocked "Advanced
  // search filters", "Portfolio analytics", a "5/week" free connection cap, and
  // "Priority in search results" — none of which are gated in code (analytics
  // and search filters are ungated; connect's rate limit is a flat per-IP cap
  // with no tier branch). This lists only what Pro actually gates today.
  const freeFeatures = [
    "Create your profile and portfolio",
    "Browse and discover creatives",
    "Join communities and the feed",
    "Message the people you match with",
    "Safety tools: reporting, blocking, check-ins",
  ];
  const proFeatures = [
    "See everyone who is interested in you",
    "Control who sees your age, distance, online status, and match %",
    "Unlimited likes, incognito, and read receipts",
    "Founding member perks",
  ];
  // Audit fix (2026-10-19): this is the only public, unauthenticated pricing
  // page — the industry side's Musa Studio tier ($29.99/mo, see
  // TIERS_BY_SIDE.industry in components/types.ts, the in-app Subscription
  // screen's source of truth) was never on it at all, so anyone researching
  // pricing before signing up had no way to learn Studio exists. Feature
  // copy kept identical to that in-app list rather than imported, matching
  // this file's own established pattern of a hand-maintained, audited copy
  // of what's actually gated (see the comment above) rather than a shared
  // import across the public-site/authenticated-app boundary.
  const studioFeatures = [
    "Everything in Musa Pro",
    "Boosted placement on every Brief you post",
    "Unlimited saved-talent lists",
    "Priority support",
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>Pricing</h1>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <p style={{ marginBottom: 48 }}>Free tier forever. Musa Pro at $9.99/mo. Musa Studio at $29.99/mo for hiring teams. Founding members get lifetime Pro free.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
          <div style={{ border: "1px solid rgba(255,215,0,0.2)", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 4, color: "#fff" }}>Free</h2>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#ffd700", marginBottom: 24 }}>$0<span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/forever</span></p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {freeFeatures.map((f, i) => (
                <li key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{f}</li>
              ))}
            </ul>
          </div>

          <div style={{ border: "1px solid rgba(255,215,0,0.5)", borderRadius: 12, padding: 32, background: "rgba(255,215,0,0.04)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 4, color: "#fff" }}>Pro</h2>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#ffd700", marginBottom: 24 }}>$9.99<span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/mo</span><br /><span style={{ fontSize: 14, color: "rgba(255,215,0,0.7)" }}>• $79.99/year (save 33%)</span></p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {proFeatures.map((f, i) => (
                <li key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{f}</li>
              ))}
            </ul>
          </div>

          <div style={{ border: "1px solid rgba(255,215,0,0.5)", borderRadius: 12, padding: 32, background: "rgba(255,215,0,0.04)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 4, color: "#fff" }}>Studio</h2>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#ffd700", marginBottom: 24 }}>$29.99<span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/mo</span></p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {studioFeatures.map((f, i) => (
                <li key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginTop: 16 }}>Musa Studio is built for agencies, casting directors, and brands hiring at scale on the industry side. All plans come with a 14-day money-back guarantee — see our <a href="/muse/refund" style={{ color: "rgba(255,215,0,0.7)" }}>refund policy</a>.</p>

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <a href="/muse/landing#join" style={{ display: "inline-block", padding: "14px 36px", borderRadius: 999, background: "#ffd700", color: "#000", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>Join the Waitlist</a>
        </div>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 24, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Musa by WYZ</a>
    </div>
  );
}
