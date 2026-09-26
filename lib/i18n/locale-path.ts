import type { Locale } from "@/lib/i18n";
import { getToolBySlug, isToolCategory, toolCategoryOrder, toolCategoryPath, tools } from "@/lib/tools";

const STATIC_INDEXABLE = [
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/qv1",
  "/qv1/models",
  "/products/qv1",
  "/products/neyora",
  "/tools",
  "/studio",
] as const;

const AUTH_ROUTES = new Set(["/login", "/account"]);

export function indexableEnglishPaths(): string[] {
  return [
    ...STATIC_INDEXABLE,
    ...toolCategoryOrder.map((category) => toolCategoryPath(category)),
    ...tools.map((tool) => tool.href),
  ];
}

function normalizePathname(pathname: string): string {
  const bare = (pathname.split("?")[0] ?? "").split("#")[0] || "/";
  const withSlash = bare.startsWith("/") ? bare : `/${bare}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

export function splitHref(href: string): { pathname: string; search: string; hash: string } {
  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = beforeHash.indexOf("?");
  const search = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";
  const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  return { pathname: pathname || "/", search, hash };
}

export function localeFromPath(pathname: string): Locale {
  const path = normalizePathname(pathname);
  return path === "/ar" || path.startsWith("/ar/") ? "ar" : "en";
}

export function stripLocale(pathname: string): string {
  const path = normalizePathname(pathname);
  if (path === "/ar") return "/";
  if (path.startsWith("/ar/")) return path.slice(3) || "/";
  return path;
}

export function isIndexableLocalizedPath(pathname: string): boolean {
  return indexableEnglishPaths().includes(stripLocale(pathname));
}

export function isLocalizedRoute(pathname: string): boolean {
  const bare = stripLocale(pathname);
  if (isIndexableLocalizedPath(bare)) return true;
  if (AUTH_ROUTES.has(bare)) return true;
  if (!bare.startsWith("/tools/")) return false;
  const slug = bare.slice("/tools/".length);
  if (!slug || slug.includes("/")) return false;
  return isToolCategory(slug) || Boolean(getToolBySlug(slug));
}

export function withLocale(path: string, locale: Locale): string {
  const { pathname, search, hash } = splitHref(path);
  const bare = stripLocale(pathname);
  const next = locale === "ar" ? (bare === "/" ? "/ar" : `/ar${bare}`) : bare;
  return `${next}${search}${hash}`;
}

/** English hrefs pass through unchanged. Arabic prefixes only real localized pages. */
export function localizeHref(href: string, locale: Locale): string {
  if (locale !== "ar") return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const { pathname, search, hash } = splitHref(href);
  const bare = stripLocale(pathname);
  if (!isLocalizedRoute(bare)) return href;
  return `${withLocale(bare, "ar")}${search}${hash}`;
}

export function alternatePath(pathname: string): string {
  const locale = localeFromPath(pathname);
  const bare = stripLocale(pathname);
  const target: Locale = locale === "ar" ? "en" : "ar";
  if (!isLocalizedRoute(bare)) return target === "ar" ? "/ar" : "/";
  return withLocale(bare, target);
}

export function hreflangLanguages(englishPath: string) {
  const en = stripLocale(englishPath);
  return {
    en,
    ar: withLocale(en, "ar"),
    "x-default": en,
  };
}
