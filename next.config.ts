import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  compress: true,
  experimental: {
    optimizePackageImports: ["react-icons"],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;