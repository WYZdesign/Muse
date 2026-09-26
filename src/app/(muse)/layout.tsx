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
  // Deliberately NO openGraph/twitter here: this is the AUTHENTICATED app
  // layout (noindex, canonical null). Emitting generic preview metadata for
  // private routes risks link previews/snippets of app surfaces. The public
  // marketing pages under src/app/muse/* carry their own OG/Twitter metadata.
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
