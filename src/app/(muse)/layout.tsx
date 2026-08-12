import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SplashScreen from "@/components/SplashScreen";

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
  description: "Discover and connect with photographers, models, filmmakers, musicians, designers, and artists. The creative professional network.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/muse-icon.png", apple: "/apple-touch-icon.png", shortcut: "/muse-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Muse", startupImage: "/apple-touch-icon.png" },
  openGraph: { title: "Muse — Where Creatives Connect", description: "Discover and connect with creative professionals. Your network for collaboration, bookings, and creative growth.", url: "https://muse.wyzdesign.com/muse", siteName: "Muse", type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Muse — Where Creatives Connect" }] },
  twitter: { card: "summary_large_image", title: "Muse — Where Creatives Connect", description: "Discover and connect with creative professionals. Your network for collaboration, bookings, and creative growth.", images: ["/og-image.png"] },
  robots: { index: true, follow: true },
};

export default function MuseLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SplashScreen />
      {children}
    </ErrorBoundary>
  );
}
