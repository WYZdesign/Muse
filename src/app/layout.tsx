import type { Viewport, Metadata } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0a0612",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://muse.wyzdesign.com"),
  title: "Muse — Where Creatives Connect",
  description: "Find your creative match. AI-powered matchmaking for photographers, models, filmmakers, musicians, designers, and artists.",
  manifest: "/muse/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Muse", startupImage: "/apple-touch-icon.png" },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: { title: "Muse — Where Creatives Connect", description: "AI-powered matchmaking for creatives. Find your muse.", url: "https://muse.wyzdesign.com", siteName: "Muse", type: "website", images: [{ url: "/og-image.png", width: 1200, height: 1200, alt: "Muse — Where Creatives Connect" }] },
  twitter: { card: "summary_large_image", title: "Muse — Where Creatives Connect", description: "AI-powered matchmaking for creatives. Find your muse.", images: ["/og-image.png"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
<head>
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon-512x512.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Muse" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0a0612" />
        <meta name="format-detection" content="telephone=no" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
