/** Generates /sitemap.xml from the public route list. */
import type { MetadataRoute } from "next";
import { getCanonicalOrigin } from "@/lib/urls";

export default function sitemap(): MetadataRoute.Sitemap {
  // Canonical origin (muse.wyzdesign.com), NOT NEXT_PUBLIC_APP_URL, which is
  // www.wyzdesign.com for OAuth redirects and would make every URL redirect.
  // Paths below are full app paths (already include /muse); do not prefix again.
  const base = getCanonicalOrigin();
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/muse/landing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/muse/pricing", priority: 0.8, changeFrequency: "weekly" },
    { path: "/muse/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/muse/faq", priority: 0.7, changeFrequency: "monthly" },
    { path: "/muse/safety", priority: 0.7, changeFrequency: "monthly" },
    { path: "/muse/guidelines", priority: 0.5, changeFrequency: "monthly" },
    { path: "/muse/blog", priority: 0.5, changeFrequency: "weekly" },
    { path: "/muse/blog/why-muse-exists", priority: 0.4, changeFrequency: "monthly" },
    { path: "/muse/blog/safety-by-design", priority: 0.4, changeFrequency: "monthly" },
    { path: "/muse/blog/behind-the-scenes-verification", priority: 0.4, changeFrequency: "monthly" },
    { path: "/muse/blog/community-guidelines", priority: 0.4, changeFrequency: "monthly" },
    { path: "/muse/blog/launch-recap", priority: 0.4, changeFrequency: "monthly" },
    { path: "/muse/refund", priority: 0.3, changeFrequency: "monthly" },
    { path: "/muse/careers", priority: 0.4, changeFrequency: "monthly" },
    { path: "/muse/press", priority: 0.4, changeFrequency: "monthly" },
    { path: "/muse/terms", priority: 0.3, changeFrequency: "monthly" },
    { path: "/muse/privacy", priority: 0.3, changeFrequency: "monthly" },
    { path: "/dmca", priority: 0.3, changeFrequency: "monthly" },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
