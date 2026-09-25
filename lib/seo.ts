import type { Metadata } from "next";
import { en } from "@/lib/i18n/en";
import { siteConfig } from "@/lib/site";
import { toolCategoryOrder, toolCategoryPath } from "@/lib/tools";

const organizationId = `${siteConfig.url}/#organization`;
const websiteId = `${siteConfig.url}/#website`;

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const ogByPath: Record<string, { url: string; alt: string }> = {
  "/": {
    url: "/og/home.png",
    alt: "QVI – on-device AI stem separation and audio tools",
  },
  "/qv1": {
    url: "/og/qv1.png",
    alt: "QV1 Evaluation – AI stem separation for Windows",
  },
  "/products/qv1": {
    url: "/og/qv1.png",
    alt: "QV1 – AI stem separation and vocal remover",
  },
  "/products/neyora": {
    url: "/og/neyora.png",
    alt: "Neyora – AI instrument from text, voice, or MIDI",
  },
  "/studio": {
    url: "/og/studio.png",
    alt: "QVI Studio – free online multitrack mixer",
  },
};

const toolsOg = {
  url: "/og/tools.png",
  alt: "QVI free browser tools for audio, PDF, and images — no upload",
};

export function openGraphImage(path: string) {
  const image = path.startsWith("/tools") ? toolsOg : (ogByPath[path] ?? ogByPath["/"]);
  return { url: image.url, width: OG_WIDTH, height: OG_HEIGHT, alt: image.alt };
}

export function buildPageMetadata({
  title,
  description,
  path,
  absolute = false,
}: {
  title: string;
  description: string;
  path: string;
  absolute?: boolean;
}): Metadata {
  const url = `${siteConfig.url}${path === "/" ? "" : path}`;
  const image = openGraphImage(path);

  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: siteConfig.fullName,
      locale: "en_US",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": organizationId,
    name: siteConfig.name,
    alternateName: [siteConfig.fullName, "Quality Virtual Instruments", "getqvi"],
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: `${siteConfig.url}/icon-512.png`,
      width: 512,
      height: 512,
    },
    slogan: siteConfig.tagline,
    description:
      "QVI is an audio software studio building on-device AI audio tools: QV1 (AI stem separation and audio processing) and Neyora (DDSP instrument synthesis from text, voice, or MIDI), plus free browser tools that process files on your device.",
    email: siteConfig.supportEmail,
    knowsAbout: [
      "AI stem separation",
      "vocal removal",
      "DDSP",
      "neural audio synthesis",
      "on-device audio processing",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: siteConfig.supportEmail,
      contactType: "customer support",
      availableLanguage: ["English", "Arabic"],
    },
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    url: siteConfig.url,
    name: siteConfig.name,
    alternateName: siteConfig.fullName,
    description: siteConfig.description,
    inLanguage: "en",
    publisher: { "@id": organizationId },
  };
}

export function siteNavigationItemListSchema() {
  const paths: { name: string; path: string }[] = [
    { name: "Home", path: "/" },
    { name: "QVI Studio", path: "/studio" },
    { name: "QV1 Evaluation", path: "/qv1" },
    { name: "QV1 model sources", path: "/qv1/models" },
    { name: "QV1", path: "/products/qv1" },
    { name: "Neyora", path: "/products/neyora" },
    { name: "Lab", path: "/#lab" },
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

function breadcrumb(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function qv1PageJsonLd() {
  const page = en.products.qv1;
  const platform = page.specs.find(([label]) => label === "Platform")?.[1] ?? "Desktop";

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      {
        "@type": "SoftwareApplication",
        "@id": `${siteConfig.url}/products/qv1#software`,
        name: "QV1",
        alternateName: "QV1 by QVI",
        url: `${siteConfig.url}/products/qv1`,
        image: `${siteConfig.url}/og/qv1.png`,
        applicationCategory: "MultimediaApplication",
        applicationSubCategory: "AI stem separation and vocal remover",
        operatingSystem: platform,
        description: `${page.description} ${page.extra}`,
        featureList: page.cards.map((card) => `${card.title}: ${card.text}`),
        releaseNotes: page.status,
        publisher: { "@id": organizationId },
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Products", path: "/#products" },
        { name: "QV1", path: "/products/qv1" },
      ]),
    ],
  };
}

export function neyoraPageJsonLd() {
  const page = en.products.neyora;

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      {
        "@type": "SoftwareApplication",
        "@id": `${siteConfig.url}/products/neyora#software`,
        name: "Neyora",
        url: `${siteConfig.url}/products/neyora`,
        image: `${siteConfig.url}/og/neyora.png`,
        applicationCategory: "MultimediaApplication",
        applicationSubCategory: "AI virtual instrument / DDSP synthesis",
        operatingSystem: "Desktop",
        description: `${page.description} ${page.ddspBody}`,
        featureList: page.steps.map((step) => `${step.title}: ${step.text}`),
        releaseNotes: page.status,
        publisher: { "@id": organizationId },
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Products", path: "/#products" },
        { name: "Neyora", path: "/products/neyora" },
      ]),
    ],
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
        inLanguage: "en",
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
        inLanguage: "en",
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
      },
    ],
  };
}
