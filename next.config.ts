import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

// next.config is compiled to ESM by Next 16 — __dirname is undefined there.
const projectRoot = fileURLToPath(new URL(".", import.meta.url));

const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
  // Next.js/Turbopack requires inline script for hydration; inline styles are used app-wide (React style props)
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://browser.sentry-cdn.com https://js.sentry-cdn.com https://api.mapbox.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://res.cloudinary.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' blob: data: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.supabase.co https://api.openrouter.ai https://api.stripe.com https://js.stripe.com https://api.mapbox.com https://events.mapbox.com https://*.sentry.io`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  compress: true,
  experimental: {
    optimizePackageImports: ["react-icons"],
  },
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // HTML documents must never be cached — a stale shell references dead
      // /_next/ chunk URLs and renders a blank screen. Always revalidate.
      {
        source: "/muse",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/muse/landing",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "wyz-designtm",
  project: "javascript-nextjs-zh",
  silent: true,
  disableLogger: true,
  sourcemaps: {
    // Production stack traces should map back to real source files. Enabled
    // (disable: false) so Sentry reports aren't minified "chunk-abc123.js:1".
    disable: false,
  },
  widenClientFileUpload: true,
});