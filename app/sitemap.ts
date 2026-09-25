import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { toolCategoryOrder, toolCategoryPath, tools } from "@/lib/tools";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

const staticRouteConfig: Record<
  string,
  { changeFrequency: ChangeFrequency; priority: number }
> = {
  "": { changeFrequency: "weekly", priority: 1 },
  "/about": { changeFrequency: "monthly", priority: 0.75 },
  "/contact": { changeFrequency: "monthly", priority: 0.8 },
  "/privacy-policy": { changeFrequency: "monthly", priority: 0.65 },
  "/terms": { changeFrequency: "monthly", priority: 0.65 },
  "/products/qv1": { changeFrequency: "weekly", priority: 0.95 },
  "/products/neyora": { changeFrequency: "weekly", priority: 0.95 },
  "/tools": { changeFrequency: "weekly", priority: 0.9 },
  "/studio": { changeFrequency: "weekly", priority: 0.92 },
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = Object.entries(staticRouteConfig).map(
    ([path, config]) => ({
      url: `${siteConfig.url}${path || "/"}`,
      lastModified,
      changeFrequency: config.changeFrequency,
      priority: config.priority,
    }),
  );

  const categoryRoutes: MetadataRoute.Sitemap = toolCategoryOrder.map((category) => ({
    url: `${siteConfig.url}${toolCategoryPath(category)}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${siteConfig.url}${tool.href}`,
    lastModified,
    changeFrequency: "weekly",
    priority: tool.available ? 0.9 : 0.5,
  }));

  return [...staticRoutes, ...categoryRoutes, ...toolRoutes];
}
