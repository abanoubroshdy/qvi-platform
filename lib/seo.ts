import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { toolCategoryOrder, toolCategoryPath } from "@/lib/tools";

const organizationId = `${siteConfig.url}/#organization`;
const websiteId = `${siteConfig.url}/#website`;

export function buildPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: `/${string}` | "/";
}): Metadata {
  const url = `${siteConfig.url}${path === "/" ? "" : path}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: {
        en: path,
        ar: path,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: siteConfig.fullName,
      locale: "en_US",
      alternateLocale: ["ar_EG"],
    },
  };
}

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": organizationId,
    name: siteConfig.fullName,
    url: siteConfig.url,
    slogan: siteConfig.tagline,
    description: siteConfig.description,
    email: siteConfig.supportEmail,
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    url: siteConfig.url,
    name: siteConfig.fullName,
    description: siteConfig.description,
    inLanguage: ["en", "ar"],
    publisher: { "@id": organizationId },
  };
}

export function siteNavigationItemListSchema() {
  const paths: { name: string; path: string }[] = [
    { name: "Home", path: "/" },
    { name: "QV1", path: "/products/qv1" },
    { name: "Neyora", path: "/products/neyora" },
    { name: "Lab", path: "/lab" },
    { name: "Free tools", path: "/tools" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
    { name: "Privacy Policy", path: "/privacy-policy" },
    { name: "Terms", path: "/terms" },
    ...toolCategoryOrder.map((category) => ({
      name: category,
      path: toolCategoryPath(category),
    })),
  ];

  return {
    "@type": "ItemList",
    "@id": `${siteConfig.url}/#site-map`,
    name: "QVI site navigation",
    numberOfItems: paths.length,
    itemListElement: paths.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: `${siteConfig.url}${entry.path === "/" ? "" : entry.path}`,
    })),
  };
}

export function homePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), websiteSchema(), siteNavigationItemListSchema()],
  };
}

export function contactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      {
        "@type": "ContactPage",
        "@id": `${siteConfig.url}/contact#webpage`,
        url: `${siteConfig.url}/contact`,
        name: "Contact QVI",
        description:
          "Contact QVI support about QV1, Neyora, waitlists, account questions, or free browser tools.",
        inLanguage: ["en", "ar"],
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
        mainEntity: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: siteConfig.supportEmail,
          availableLanguage: ["English", "Arabic"],
          areaServed: "Worldwide",
        },
      },
    ],
  };
}

export function aboutPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      {
        "@type": "AboutPage",
        "@id": `${siteConfig.url}/about#webpage`,
        url: `${siteConfig.url}/about`,
        name: "About QVI",
        description: siteConfig.description,
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
      },
    ],
  };
}
