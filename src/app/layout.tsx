import type { Viewport, Metadata } from "next";
import "./globals.css";

// Blank-screen watchdog — runs inline in <head>, before any app chunk loads.
// Detects two failure modes that previously produced a permanent blank screen:
//   1. A stale HTML shell (from SW/CDN) references /_next/ chunk URLs that 404
//      after a redeploy — the chunk <script> fires an "error" event.
//   2. React hydrated but never rendered any app content (no .phone / .muse-landing).
// In either case it unregisters the service worker, clears all caches, and reloads
// exactly once per session to avoid an infinite loop.
const BLANK_SCREEN_WATCHDOG = `(function () {
  try {
    var path = location.pathname;
    var isApp = path === "/muse" || path === "/muse/landing";
    if (!isApp) return;
    var RECOVER_KEY = "muse_wd_recovered";

    function appRendered() {
      return !!(document.querySelector(".phone") || document.querySelector(".muse-landing") || document.querySelector(".screen-el"));
    }

    function recover() {
      try {
        if (sessionStorage.getItem(RECOVER_KEY)) return;
        sessionStorage.setItem(RECOVER_KEY, "1");
      } catch (e) {}
      var reload = function () { try { location.reload(); } catch (e) {} };
      try {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            regs.forEach(function (r) { r.unregister(); });
            if (window.caches && window.caches.keys) {
              window.caches.keys().then(function (ks) {
                ks.forEach(function (k) { window.caches.delete(k); });
                reload();
              }).catch(reload);
            } else { reload(); }
          }).catch(reload);
        } else { reload(); }
      } catch (e) { reload(); }
    }

    // 1) Stale-chunk symptom: a /_next/ asset failed to load (404 after redeploy).
    window.addEventListener("error", function (e) {
      var el = e.target;
      var src = el && (el.src || el.href) || "";
      if (src.indexOf("/_next/") !== -1) recover();
    }, true);

    // 2) Grace-period check: React never rendered app content.
    setTimeout(function () {
      if (!appRendered()) recover();
    }, 8000);
  } catch (e) {}
})();`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0612",
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://muse.wyzdesign.com"),
  title: "Muse — Where Creatives Connect",
  description: "Discover and connect with photographers, models, filmmakers, musicians, designers, and artists. The creative professional network.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Muse", startupImage: "/apple-touch-icon.png" },
  icons: {
    icon: "/muse-icon.png",
    shortcut: "/muse-icon.png",
    apple: "/muse-icon.png",
  },
  openGraph: { title: "Muse — Where Creatives Connect", description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.", url: "https://muse.wyzdesign.com", siteName: "Muse", type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Muse — Where Creatives Connect" }] },
  twitter: { card: "summary_large_image", title: "Muse — Where Creatives Connect", description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.", images: ["/og-image.png"] },
  robots: { index: true, follow: true },
  keywords: ["creative network", "photographers", "models", "filmmakers", "musicians", "designers", "book creative shoots", "creative collaboration", "hire creatives"],
  alternates: { canonical: "https://muse.wyzdesign.com" },
};

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Muse",
    url: "https://muse.wyzdesign.com",
    logo: "https://muse.wyzdesign.com/muse-icon.png",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@wyzdesign.com",
      contactType: "customer support",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Muse",
    url: "https://muse.wyzdesign.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://muse.wyzdesign.com/muse?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Muse",
    url: "https://muse.wyzdesign.com/muse",
    applicationCategory: "SocialNetworkingApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
<head>
        <link rel="icon" type="image/png" sizes="192x192" href="/muse-icon.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/muse-icon.png" />
        <link rel="apple-touch-icon" href="/muse-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/muse-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Muse" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0a0612" />
        <meta name="format-detection" content="telephone=no" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <script dangerouslySetInnerHTML={{ __html: BLANK_SCREEN_WATCHDOG }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
