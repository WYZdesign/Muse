import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SplashScreen from "@/components/SplashScreen";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          try {
            var bid = window.__NEXT_DATA__ && window.__NEXT_DATA__.buildId;
            if (!bid) return;
            var prev = sessionStorage.getItem('muse_build');
            if (prev && prev !== bid) {
              sessionStorage.setItem('muse_build', bid);
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  regs.forEach(function(r) { r.unregister(); });
                  caches.keys().then(function(ks) {
                    ks.forEach(function(k) { caches.delete(k); });
                    window.location.reload();
                  });
                });
              } else {
                window.location.reload();
              }
              return;
            }
            sessionStorage.setItem('muse_build', bid);
          } catch(e) {}
        })();
      ` }} />
      <SplashScreen />
      {children}
    </ErrorBoundary>
  );
}
