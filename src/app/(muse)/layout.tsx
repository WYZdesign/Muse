import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0a0612",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Muse — Where Creatives Connect",
  description: "Find your creative match. AI-powered matchmaking for photographers, models, filmmakers, musicians, designers, and artists.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Muse" },
  openGraph: { title: "Muse — Where Creatives Connect", description: "AI-powered matchmaking for creatives. Find your muse.", url: "https://muse.wyzdesign.com/muse", siteName: "Muse", type: "website" },
  robots: { index: true, follow: true },
};

export default function MuseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
