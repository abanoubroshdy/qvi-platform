import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { toolCategoryOrder, toolCategoryPath, tools } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/privacy-policy",
    "/contact",
    "/terms",
    "/products/qv1",
    "/products/neyora",
    "/tools",
    "/lab",
  ].map((path) => ({
    url: `${siteConfig.url}${path || "/"}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/products") ? 0.95 : 0.7,
  }));

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
