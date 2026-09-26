import type { Metadata } from "next";
import { getLandingUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Muses by WYZ — Where Creatives Connect",
  description: "Muses by WYZ is the creative professional network. Discover and book photographers, models, filmmakers, musicians, and designers with verified identities, protected payments, and real trust. Join the waitlist for early access.",
  alternates: { canonical: getLandingUrl() },
  openGraph: {
    title: "Muses by WYZ — Where Creatives Connect",
    description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.",
    url: getLandingUrl(),
    siteName: "Muse",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Muses by WYZ — Where Creatives Connect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Muses by WYZ — Where Creatives Connect",
    description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.",
    images: ["/og-image.png"],
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
