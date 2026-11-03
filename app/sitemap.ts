import type { MetadataRoute } from "next";
import { VAULTS } from "@/config/vaults";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/portfolio`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...VAULTS.map((vault) => ({
      url: `${base}/vaults/${vault.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];
}
