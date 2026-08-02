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
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png", shortcut: "/favicon.ico" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Muse", startupImage: "/apple-touch-icon.png" },
  openGraph: { title: "Muse — Where Creatives Connect", description: "AI-powered matchmaking for creatives. Find your muse.", url: "https://muse.wyzdesign.com/muse", siteName: "Muse", type: "website", images: [{ url: "https://muse.wyzdesign.com/og-image.png", width: 1200, height: 1200, alt: "Muse — Where Creatives Connect" }] },
  twitter: { card: "summary_large_image", title: "Muse — Where Creatives Connect", description: "AI-powered matchmaking for creatives. Find your muse.", images: ["https://muse.wyzdesign.com/og-image.png"] },
  robots: { index: true, follow: true },
};

export default function MuseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
