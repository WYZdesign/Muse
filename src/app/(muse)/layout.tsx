import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SplashScreen from "@/components/SplashScreen";
import KeyboardDelegate from "@/components/KeyboardDelegate";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0a0612",
  viewportFit: "cover",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Muses by WYZ — Where Creatives Connect",
  description: "Discover and connect with photographers, models, filmmakers, musicians, designers, and artists. The creative professional network.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/muse-icon.png", apple: "/apple-touch-icon.png", shortcut: "/muse-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Muses by WYZ", startupImage: "/apple-touch-icon.png" },
  openGraph: { title: "Muses by WYZ — Where Creatives Connect", description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.", url: "https://muse.wyzdesign.com/muse", siteName: "Muses by WYZ", type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Muses by WYZ — Where Creatives Connect" }] },
  twitter: { card: "summary_large_image", title: "Muses by WYZ — Where Creatives Connect", description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.", images: ["/og-image.png"] },
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function MuseLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <KeyboardDelegate />
      <SplashScreen />
      {children}
    </ErrorBoundary>
  );
}
