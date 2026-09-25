import type { Metadata } from "next";
import { messages, type Locale } from "@/lib/i18n";
import { ar } from "@/lib/i18n/ar";
import { hreflangLanguages, isIndexableLocalizedPath, stripLocale, withLocale } from "@/lib/i18n/locale-path";
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

const ogAltAr: Record<string, string> = {
  "/": "QVI – فصل المسارات بالذكاء الاصطناعي وأدوات الصوت على الجهاز",
  "/qv1": "QV1 Evaluation – فصل المسارات بالذكاء الاصطناعي لويندوز",
  "/products/qv1": "QV1 – فصل المسارات وإزالة الفوكال بالذكاء الاصطناعي",
  "/products/neyora": "Neyora – آلة بالذكاء الاصطناعي من نص أو صوت أو MIDI",
  "/studio": "QVI Studio – مكسر متعدد المسارات مجاني عبر الإنترنت",
};

const toolsOgAltAr = "أدوات QVI المجانية في المتصفح للصوت وPDF والصور — بلا رفع";

export function openGraphImage(path: string, locale: Locale = "en") {
  const englishPath = stripLocale(path);
  const image = englishPath.startsWith("/tools") ? toolsOg : (ogByPath[englishPath] ?? ogByPath["/"]);
  const alt =
    locale === "ar"
      ? englishPath.startsWith("/tools")
        ? toolsOgAltAr
        : (ogAltAr[englishPath] ?? ogAltAr["/"])
      : image.alt;
  return { url: image.url, width: OG_WIDTH, height: OG_HEIGHT, alt };
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
  const languages = isIndexableLocalizedPath(path) ? hreflangLanguages(path) : undefined;

  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: {
      canonical: path,
      ...(languages ? { languages } : {}),
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

export function buildArabicPageMetadata({
  title,
  description,
  englishPath,
  indexable = true,
}: {
  title: string;
  description: string;
  englishPath: string;
  indexable?: boolean;
}): Metadata {
  const path = withLocale(englishPath, "ar");
  const url = `${siteConfig.url}${path === "/" ? "" : path}`;
  const image = openGraphImage(englishPath, "ar");
  const languages = indexable ? hreflangLanguages(englishPath) : undefined;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: siteConfig.fullName,
      locale: "ar_AR",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
    robots: indexable ? undefined : { index: false, follow: false },
  };
}

const organizationDescription = {
  en: "QVI is an audio software studio building on-device AI audio tools: QV1 (AI stem separation and audio processing) and Neyora (DDSP instrument synthesis from text, voice, or MIDI), plus free browser tools that process files on your device.",
  ar: "QVI استوديو برامج صوت يبني أدوات ذكاء اصطناعي تعمل على الجهاز: QV1 لفصل المسارات ومعالجة الصوت، وNeyora لتخليق الآلات بتقنية DDSP من نص أو صوت أو MIDI، مع أدوات متصفح مجانية تعالج الملفات على جهازك.",
};

export function organizationSchema(locale: Locale = "en") {
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
    description: organizationDescription[locale],
    email: siteConfig.supportEmail,
    knowsAbout:
      locale === "ar"
        ? ["فصل المسارات بالذكاء الاصطناعي", "إزالة الفوكال", "DDSP", "تخليق الصوت العصبي", "معالجة الصوت على الجهاز"]
        : ["AI stem separation", "vocal removal", "DDSP", "neural audio synthesis", "on-device audio processing"],
    contactPoint: {
      "@type": "ContactPoint",
      email: siteConfig.supportEmail,
      contactType: "customer support",
      availableLanguage: ["English", "Arabic"],
    },
  };
}

export function websiteSchema(locale: Locale = "en") {
  const home = withLocale("/", locale);
  return {
    "@type": "WebSite",
    "@id": websiteId,
    url: `${siteConfig.url}${home === "/" ? "" : home}`,
    name: siteConfig.name,
    alternateName: siteConfig.fullName,
    description: locale === "ar" ? ar.home.lead : siteConfig.description,
    inLanguage: locale,
    publisher: { "@id": organizationId },
  };
}

export function siteNavigationItemListSchema(locale: Locale = "en") {
  const copy = messages[locale];
  const paths: { name: string; path: string }[] =
    locale === "ar"
      ? [
          { name: copy.nav.home, path: "/" },
          { name: copy.products.studio.name, path: "/studio" },
          { name: copy.qv1Page.shortName, path: "/qv1" },
          { name: copy.qv1Models.title, path: "/qv1/models" },
          { name: "QV1", path: "/products/qv1" },
          { name: "Neyora", path: "/products/neyora" },
          { name: copy.nav.lab, path: "/#lab" },
          { name: copy.footer.freeTools, path: "/tools" },
          { name: copy.footer.about, path: "/about" },
          { name: copy.footer.contact, path: "/contact" },
          { name: copy.footer.privacy, path: "/privacy-policy" },
          { name: copy.footer.terms, path: "/terms" },
          ...toolCategoryOrder.map((category) => ({
            name: copy.toolGroups[category].title,
            path: toolCategoryPath(category),
          })),
        ]
      : [
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
    "@id": `${siteConfig.url}${locale === "ar" ? "/ar" : ""}/#site-map`,
    name: locale === "ar" ? "تنقل موقع QVI" : "QVI site navigation",
    numberOfItems: paths.length,
    itemListElement: paths.map((entry, index) => {
      const path = withLocale(entry.path, locale);
      return {
        "@type": "ListItem",
        position: index + 1,
        name: entry.name,
        item: `${siteConfig.url}${path === "/" ? "" : path}`,
      };
    }),
  };
}

export function homePageJsonLd(locale: Locale = "en") {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(locale), websiteSchema(locale), siteNavigationItemListSchema(locale)],
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

function absoluteUrl(path: string) {
  return `${siteConfig.url}${path === "/" ? "" : path}`;
}

export function qv1PageJsonLd(locale: Locale = "en") {
  const page = messages[locale].products.qv1;
  const path = withLocale("/products/qv1", locale);
  const platform = page.specs.find(([, value]) => value === "Windows 10/11 x64")?.[1] ?? "Windows 10/11 x64";
  const homeName = locale === "ar" ? messages.ar.nav.home : "Home";
  const productsName = locale === "ar" ? messages.ar.nav.products : "Products";

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(locale),
      {
        "@type": "SoftwareApplication",
        "@id": `${absoluteUrl(path)}#software`,
        name: "QV1",
        alternateName: "QV1 by QVI",
        url: absoluteUrl(path),
        image: `${siteConfig.url}/og/qv1.png`,
        applicationCategory: "MultimediaApplication",
        applicationSubCategory:
          locale === "ar" ? "فصل المسارات وإزالة الفوكال بالذكاء الاصطناعي" : "AI stem separation and vocal remover",
        operatingSystem: platform,
        inLanguage: locale,
        description: `${page.description} ${page.extra}`,
        featureList: page.cards.map((card) => `${card.title}: ${card.text}`),
        releaseNotes: page.status,
        publisher: { "@id": organizationId },
      },
      {
        "@type": "FAQPage",
        inLanguage: locale,
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
      breadcrumb([
        { name: homeName, path: withLocale("/", locale) },
        { name: productsName, path: withLocale("/#products", locale) },
        { name: "QV1", path },
      ]),
    ],
  };
}

export function neyoraPageJsonLd(locale: Locale = "en") {
  const page = messages[locale].products.neyora;
  const path = withLocale("/products/neyora", locale);
  const homeName = locale === "ar" ? messages.ar.nav.home : "Home";
  const productsName = locale === "ar" ? messages.ar.nav.products : "Products";
  const software = {
    "@type": "SoftwareApplication",
    "@id": `${absoluteUrl(path)}#software`,
    name: "Neyora",
    url: absoluteUrl(path),
    image: `${siteConfig.url}/og/neyora.png`,
    applicationCategory: "MultimediaApplication",
    applicationSubCategory:
      locale === "ar" ? "آلة افتراضية بالذكاء الاصطناعي / تخليق DDSP" : "AI virtual instrument / DDSP synthesis",
    operatingSystem: locale === "ar" ? "سطح المكتب" : "Desktop",
    inLanguage: locale,
    description: `${page.description} ${page.ddspBody}`,
    featureList: page.steps.map((step) => `${step.title}: ${step.text}`),
    releaseNotes: page.status,
    publisher: { "@id": organizationId },
  };
  const crumbs = breadcrumb([
    { name: homeName, path: withLocale("/", locale) },
    { name: productsName, path: withLocale("/#products", locale) },
    { name: "Neyora", path },
  ]);
  const faq =
    locale === "ar"
      ? {
          "@type": "FAQPage",
          inLanguage: "ar",
          mainEntity: page.faqs.map((faqItem) => ({
            "@type": "Question",
            name: faqItem.q,
            acceptedAnswer: { "@type": "Answer", text: faqItem.a },
          })),
        }
      : null;

  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(locale), software, ...(faq ? [faq] : []), crumbs],
  };
}

export function contactPageJsonLd(locale: Locale = "en") {
  const path = withLocale("/contact", locale);
  const arabic = locale === "ar";
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(locale),
      {
        "@type": "ContactPage",
        "@id": `${absoluteUrl(path)}#webpage`,
        url: absoluteUrl(path),
        name: arabic ? "تواصل مع QVI" : "Contact QVI",
        description: arabic
          ? "تواصل مع دعم QVI بخصوص QV1 أو Neyora أو قوائم الانتظار أو أسئلة الحساب أو الأدوات المجانية."
          : "Contact QVI support about QV1, Neyora, waitlists, account questions, or free browser tools.",
        inLanguage: locale,
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

export function aboutPageJsonLd(locale: Locale = "en") {
  const path = withLocale("/about", locale);
  const arabic = locale === "ar";
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(locale),
      {
        "@type": "AboutPage",
        "@id": `${absoluteUrl(path)}#webpage`,
        url: absoluteUrl(path),
        name: arabic ? "عن QVI" : "About QVI",
        description: arabic ? ar.home.lead : siteConfig.description,
        inLanguage: locale,
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
      },
    ],
  };
}
