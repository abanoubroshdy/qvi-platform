import type { MetadataRoute } from "next";
import { indexableEnglishPaths, withLocale } from "@/lib/i18n/locale-path";
import { siteConfig } from "@/lib/site";
import { getToolBySlug, isToolCategory, toolCategoryOrder } from "@/lib/tools";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

const staticRouteConfig: Record<string, { changeFrequency: ChangeFrequency; priority: number }> = {
  "/": { changeFrequency: "weekly", priority: 1 },
  "/about": { changeFrequency: "monthly", priority: 0.75 },
  "/contact": { changeFrequency: "monthly", priority: 0.8 },
  "/privacy-policy": { changeFrequency: "monthly", priority: 0.65 },
  "/terms": { changeFrequency: "monthly", priority: 0.65 },
  "/qv1": { changeFrequency: "weekly", priority: 0.95 },
  "/qv1/models": { changeFrequency: "monthly", priority: 0.7 },
  "/products/qv1": { changeFrequency: "weekly", priority: 0.95 },
  "/products/neyora": { changeFrequency: "weekly", priority: 0.95 },
  "/tools": { changeFrequency: "weekly", priority: 0.9 },
  "/studio": { changeFrequency: "weekly", priority: 0.92 },
};

function absolute(path: string) {
  return path === "/" ? siteConfig.url : `${siteConfig.url}${path}`;
}

function languageAlternates(englishPath: string) {
  const en = absolute(englishPath);
  const ar = absolute(withLocale(englishPath, "ar"));
  return { languages: { en, ar, "x-default": en } };
}

function pair(
  englishPath: string,
  config: { changeFrequency: ChangeFrequency; priority: number },
  lastModified: Date,
): MetadataRoute.Sitemap {
  const alternates = languageAlternates(englishPath);
  return [
    {
      url: absolute(englishPath),
      lastModified,
      changeFrequency: config.changeFrequency,
      priority: config.priority,
      alternates,
    },
    {
      url: absolute(withLocale(englishPath, "ar")),
      lastModified,
      changeFrequency: config.changeFrequency,
      priority: config.priority,
      alternates,
    },
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries = indexableEnglishPaths().flatMap((path) => {
    if (staticRouteConfig[path]) return pair(path, staticRouteConfig[path], lastModified);
    if (path.startsWith("/tools/")) {
      const slug = path.slice("/tools/".length);
      if (isToolCategory(slug) && toolCategoryOrder.includes(slug)) {
        return pair(path, { changeFrequency: "weekly", priority: 0.85 }, lastModified);
      }
      const tool = getToolBySlug(slug);
      if (tool) {
        return pair(path, { changeFrequency: "weekly", priority: tool.available ? 0.9 : 0.5 }, lastModified);
      }
    }
    return [];
  });

  return entries;
}
