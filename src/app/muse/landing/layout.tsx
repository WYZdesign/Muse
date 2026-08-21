import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Muse — Where Creatives Connect",
  description: "Muse is the creative professional network. Discover and book photographers, models, filmmakers, musicians, and designers with verified identities, protected payments, and real trust. Join the waitlist for early access.",
  alternates: { canonical: "https://muse.wyzdesign.com/muse/landing" },
  openGraph: {
    title: "Muse — Where Creatives Connect",
    description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.",
    url: "https://muse.wyzdesign.com/muse/landing",
    siteName: "Muse",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Muse — Where Creatives Connect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Muse — Where Creatives Connect",
    description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.",
    images: ["/og-image.png"],
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
