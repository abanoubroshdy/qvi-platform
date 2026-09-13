import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { tools } from "@/lib/tools";

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
    "/lab",
  ].map((path) => ({
    url: `${siteConfig.url}${path || "/"}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/products") ? 0.95 : 0.7,
  }));

  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${siteConfig.url}${tool.href}`,
    lastModified,
    changeFrequency: "weekly",
    priority: tool.available ? 0.9 : 0.5,
  }));

  return [...staticRoutes, ...toolRoutes];
}
