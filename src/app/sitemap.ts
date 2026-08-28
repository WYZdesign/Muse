import type { MetadataRoute } from "next";
import { getMuseUrl } from "@/lib/urls";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getMuseUrl();
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/muse", priority: 1.0, changeFrequency: "daily" },
    { path: "/muse/landing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/muse/pricing", priority: 0.8, changeFrequency: "weekly" },
    { path: "/muse/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/muse/faq", priority: 0.7, changeFrequency: "monthly" },
    { path: "/muse/safety", priority: 0.7, changeFrequency: "monthly" },
    { path: "/muse/guidelines", priority: 0.5, changeFrequency: "monthly" },
    { path: "/muse/blog", priority: 0.5, changeFrequency: "weekly" },
    { path: "/muse/careers", priority: 0.4, changeFrequency: "monthly" },
    { path: "/muse/press", priority: 0.4, changeFrequency: "monthly" },
    { path: "/muse/terms", priority: 0.3, changeFrequency: "monthly" },
    { path: "/muse/privacy", priority: 0.3, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
    { path: "/dmca", priority: 0.3, changeFrequency: "monthly" },
    { path: "/safety", priority: 0.4, changeFrequency: "monthly" },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
