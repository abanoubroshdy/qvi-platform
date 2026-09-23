/**
 * Header and footer destinations.
 * Every href must be a real App Router page (hash links scroll to homepage sections).
 * Docs, pricing, and plugin-marketplace paths are intentionally absent — those pages do not exist.
 */
export const headerNavItems = [
  { href: "/studio", labelKey: "studio" },
  { href: "/#products", labelKey: "products" },
  { href: "/#tools", labelKey: "tools" },
  { href: "/#lab", labelKey: "lab" },
  { href: "/about", labelKey: "about" },
  { href: "/contact", labelKey: "contact" },
] as const;

export const qv1Path = "/products/qv1";

export const footerExploreItems = [
  { href: "/", source: "footer", labelKey: "home" },
  { href: "/#products", source: "nav", labelKey: "products" },
  { href: "/#tools", source: "footer", labelKey: "freeTools" },
  { href: "/studio", source: "nav", labelKey: "studio" },
  { href: "/lab", source: "nav", labelKey: "lab" },
  { href: "/#explore", source: "footer", labelKey: "siteMap" },
] as const;

export const footerCompanyItems = [
  { href: "/about", labelKey: "about" },
  { href: "/privacy-policy", labelKey: "privacy" },
  { href: "/contact", labelKey: "contact" },
  { href: "/terms", labelKey: "terms" },
] as const;
