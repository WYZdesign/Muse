import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Muse",
    short_name: "Muse",
    description: "Creative connections & collaborations",
    start_url: "/muse",
    scope: "/muse/",
    display: "standalone",
    background_color: "#0a0612",
    theme_color: "#ffd700",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/muse-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/muse-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["social", "lifestyle", "productivity"],
    lang: "en",
    dir: "ltr",
  };
}