import type { Viewport, Metadata } from "next";
import "./globals.css";
import { getMuseUrl, getTermsUrl, getPrivacyUrl } from "@/lib/urls";

// Blank-screen / freeze watchdog — runs inline in <head>, before any app
// chunk loads. Detects failure modes that previously produced a permanent
// blank screen or an unresponsive tab:
//   1. A stale HTML shell (from SW/CDN) references /_next/ chunk URLs that 404
//      after a redeploy — the chunk <script> fires an "error" event.
//   2. React hydrated but never rendered any app content (no .phone / .muse-landing).
//   3. React rendered fine, then something (a runaway effect, a self-feeding
//      MutationObserver, an infinite re-render loop) froze the main thread
//      AFTER a successful initial render — the exact shape of the
//      "freezes after login" / "black screen ~2s into Discover" reports.
//      Mode (2) alone never caught this because it only checks once, 8s
//      after boot; a page that rendered fine at second 2 and froze at
//      second 4 passes that check and is never looked at again.
// In modes 1 and 2, and in the *detectable* cases of mode 3 (see caveat
// below), this unregisters the service worker, clears all caches, and
// reloads exactly once per session to avoid a reload loop.
//
// CAVEAT (be honest about what this can and can't do): a true self-feeding
// microtask storm — new microtasks scheduled faster than the queue can
// drain — blocks EVERYTHING on the main thread, including this watchdog's
// own rAF/timer callbacks. No in-page JS can detect or recover from that
// while it's happening; the only real fix is preventing it in the first
// place (see lib/safe-observer.ts's circuit breaker, now used by every
// MutationObserver in the app). What the heartbeat below *does* catch is
// the broader, more common class of "hung but not fully wedged" freeze —
// a slow-but-finite loop, a stuck await, a deadlocked state update — where
// the main thread still gets occasional turns. It also leaves a
// last-known-alive timestamp so a hang that outlives the page (the user
// force-closes/reloads the unresponsive tab, or Chrome's own "Page
// Unresponsive" dialog fires) is visible and reported on the *next* load,
// even though it couldn't be caught live.
const BLANK_SCREEN_WATCHDOG = `(function () {
  try {
    var path = location.pathname;
    var isApp = path === "/muse" || path === "/muse/landing";
    if (!isApp) return;
    var RECOVER_KEY = "muse_wd_recovered";
    var HEARTBEAT_KEY = "muse_wd_heartbeat";
    var HANG_MARK_KEY = "muse_wd_last_hang";

    function appRendered() {
      return !!(document.querySelector(".phone") || document.querySelector(".muse-landing") || document.querySelector(".screen-el"));
    }

    function report(kind, detail) {
      try {
        navigator.sendBeacon && navigator.sendBeacon("/api/muse", new Blob([JSON.stringify({
          action: "track-error", name: kind, params: detail || {},
        })], { type: "application/json" }));
      } catch (e) {}
    }

    function recover(reason) {
      try {
        if (sessionStorage.getItem(RECOVER_KEY)) return;
        sessionStorage.setItem(RECOVER_KEY, "1");
      } catch (e) {}
      try { localStorage.setItem(HANG_MARK_KEY, JSON.stringify({ reason: reason, at: Date.now(), path: path })); } catch (e) {}
      report("watchdog_recover", { reason: reason });
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

    // 0) On boot, surface (once) any hang the previous session recorded but
    // couldn't survive to report live — e.g. the user force-reloaded an
    // unresponsive tab, so recover() above never ran for it.
    try {
      var prevHang = localStorage.getItem(HANG_MARK_KEY);
      if (prevHang) {
        localStorage.removeItem(HANG_MARK_KEY);
        report("watchdog_prior_session_hang", JSON.parse(prevHang));
      }
    } catch (e) {}

    // 1) Stale-chunk symptom: a /_next/ asset failed to load (404 after redeploy).
    window.addEventListener("error", function (e) {
      var el = e.target;
      var src = el && (el.src || el.href) || "";
      if (src.indexOf("/_next/") !== -1) recover("stale_chunk_404");
    }, true);

    // 2) Grace-period check: React never rendered app content.
    setTimeout(function () {
      if (!appRendered()) recover("no_render_within_8s");
    }, 8000);

    // 3) Continuous post-render heartbeat. rAF is throttled/paused while the
    // tab is hidden (normal, not a bug) — skip the staleness check then.
    // Only starts once the app has actually rendered once, so it never
    // fights with check #2 above.
    var lastFrame = Date.now();
    function tick() {
      lastFrame = Date.now();
      requestAnimationFrame(tick);
    }
    var STALE_MS = 12000;
    var CHECK_EVERY_MS = 3000;
    var rendered = false;
    var heartbeatInterval = setInterval(function () {
      if (!rendered) {
        if (!appRendered()) return;
        rendered = true;
        requestAnimationFrame(tick);
      }
      if (document.visibilityState !== "visible") return;
      var staleFor = Date.now() - lastFrame;
      if (staleFor > STALE_MS) {
        clearInterval(heartbeatInterval);
        recover("post_render_freeze_" + staleFor + "ms");
      }
    }, CHECK_EVERY_MS);

    // Global error / unhandledrejection safety net — these previously went
    // completely unlogged (the React ErrorBoundary only sees errors thrown
    // during render; an error in an event handler, a timer, or a rejected
    // promise with no .catch skips it entirely and fails silently).
    window.addEventListener("error", function (e) {
      if (e && e.error) report("window_error", { message: String(e.message || "").slice(0, 500), stack: String(e.error && e.error.stack || "").slice(0, 2000) });
    });
    window.addEventListener("unhandledrejection", function (e) {
      var reason = e && e.reason;
      report("unhandled_rejection", { message: String((reason && reason.message) || reason || "").slice(0, 500), stack: String((reason && reason.stack) || "").slice(0, 2000) });
    });
  } catch (e) {}
})();`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0612",
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(getMuseUrl()),
  title: "Muse — Where Creatives Connect",
  description: "Discover and connect with photographers, models, filmmakers, musicians, designers, and artists. The creative professional network.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Muse", startupImage: "/apple-touch-icon.png" },
  icons: {
    icon: "/muse-icon.png",
    shortcut: "/muse-icon.png",
    apple: "/muse-icon.png",
  },
  openGraph: { title: "Muse — Where Creatives Connect", description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.", url: getMuseUrl(), siteName: "Muse", type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Muse — Where Creatives Connect" }] },
  twitter: { card: "summary_large_image", title: "Muse — Where Creatives Connect", description: "Book creative shoots safely. Verified photographers, models, and talent, protected payments, real trust. Find your muse.", images: ["/og-image.png"] },
  robots: { index: true, follow: true },
  keywords: ["creative network", "photographers", "models", "filmmakers", "musicians", "designers", "book creative shoots", "creative collaboration", "hire creatives"],
  alternates: { canonical: getMuseUrl() },
};

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Muse",
    url: getMuseUrl(),
    logo: getMuseUrl() + "/muse-icon.png",
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
    url: getMuseUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: getMuseUrl() + "/muse?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Muse",
    url: getMuseUrl() + "/muse",
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
