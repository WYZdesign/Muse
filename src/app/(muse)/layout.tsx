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
      <link rel="manifest" href="/manifest.json" />
      <link rel="apple-touch-icon" href="/icons/muse-192.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/icons/muse-192.png" />
      <link rel="apple-touch-icon" sizes="192x192" href="/icons/muse-192.png" />
      <link rel="apple-touch-icon" sizes="512x512" href="/icons/muse-512.png" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Muse" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="theme-color" content="#0a0612" />
      <meta name="format-detection" content="telephone=no" />
      {children}
    </>
  );
}
