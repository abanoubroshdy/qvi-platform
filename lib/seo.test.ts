import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { en } from "@/lib/i18n/en";
import { ar } from "@/lib/i18n/ar";
import { hreflangLanguages } from "@/lib/i18n/locale-path";
import { pageMeta, toolPageMeta } from "@/lib/page-meta";
import {
  buildArabicPageMetadata,
  buildPageMetadata,
  contactPageJsonLd,
  homePageJsonLd,
  neyoraPageJsonLd,
  organizationSchema,
  qv1PageJsonLd,
} from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { tools } from "@/lib/tools";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const arabic = /[\u0600-\u06FF]/;

describe("seo json-ld", () => {
  it("includes support email on the organization and omits placeholder social fields", () => {
    const organization = organizationSchema();
    expect(organization.email).toBe(siteConfig.supportEmail);
    expect(organization).not.toHaveProperty("sameAs");
    expect(organization).not.toHaveProperty("founder");
    expect(JSON.stringify(organization)).not.toMatch(/REPLACE|Abanoub/);
  });

  it("builds a home graph with website and navigation list", () => {
    const data = homePageJsonLd();
    expect(data["@graph"]).toHaveLength(3);
    const types = (data["@graph"] as { "@type": string }[]).map((node) => node["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(types).toContain("ItemList");
    const website = (data["@graph"] as { "@type": string; inLanguage?: string }[]).find(
      (node) => node["@type"] === "WebSite",
    );
    expect(website?.inLanguage).toBe("en");
    const list = (data["@graph"] as { "@type": string; itemListElement?: { item: string }[] }[]).find(
      (node) => node["@type"] === "ItemList",
    );
    expect(list?.itemListElement?.some((item) => item.item.endsWith("/lab"))).toBe(false);
  });

  it("builds contact page with ContactPage and support contact point", () => {
    const data = contactPageJsonLd();
    const contact = (data["@graph"] as Record<string, unknown>[]).find(
      (node) => node["@type"] === "ContactPage",
    );
    expect(contact).toBeTruthy();
    const mainEntity = contact?.mainEntity as { email?: string };
    expect(mainEntity.email).toBe("support@getqvi.com");
    expect(contact?.inLanguage).toBe("en");
  });

  it("matches QV1 FAQ schema to the English answers rendered on the page", () => {
    const data = qv1PageJsonLd();
    const faq = (data["@graph"] as { "@type": string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[]).find(
      (node) => node["@type"] === "FAQPage",
    );
    expect(faq?.mainEntity?.map((item) => item.name)).toEqual(en.products.qv1.faqs.map((item) => item.q));
    expect(faq?.mainEntity?.map((item) => item.acceptedAnswer.text)).toEqual(
      en.products.qv1.faqs.map((item) => item.a),
    );
    const app = (data["@graph"] as { "@type": string; operatingSystem?: string }[]).find(
      (node) => node["@type"] === "SoftwareApplication",
    );
    expect(app?.operatingSystem).toBe("Windows 10/11 x64");
    expect(JSON.stringify(data)).not.toMatch(/sameAs|founder|Windows, macOS/);
  });

  it("describes Neyora without a price or rating", () => {
    const data = neyoraPageJsonLd();
    const serialized = JSON.stringify(data);
    expect(serialized).not.toMatch(/aggregateRating|offers|sameAs|founder/);
    const app = (data["@graph"] as { "@type": string; name?: string; operatingSystem?: string }[]).find(
      (node) => node["@type"] === "SoftwareApplication",
    );
    expect(app?.name).toBe("Neyora");
    expect(app?.operatingSystem).toBe("Desktop");
    expect(JSON.stringify(data)).not.toMatch(/FAQPage/);
  });

  it("matches Arabic QV1 FAQ schema to the Arabic answers on the page", () => {
    const data = qv1PageJsonLd("ar");
    const faq = (data["@graph"] as { "@type": string; inLanguage?: string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[]).find(
      (node) => node["@type"] === "FAQPage",
    );
    expect(faq?.inLanguage).toBe("ar");
    expect(faq?.mainEntity?.map((item) => item.name)).toEqual(ar.products.qv1.faqs.map((item) => item.q));
    expect(faq?.mainEntity?.map((item) => item.acceptedAnswer.text)).toEqual(
      ar.products.qv1.faqs.map((item) => item.a),
    );
    const app = (data["@graph"] as { "@type": string; inLanguage?: string; url?: string; operatingSystem?: string }[]).find(
      (node) => node["@type"] === "SoftwareApplication",
    );
    expect(app?.inLanguage).toBe("ar");
    expect(app?.operatingSystem).toBe("Windows 10/11 x64");
    expect(app?.url).toBe(`${siteConfig.url}/ar/products/qv1`);
  });

  it("matches Arabic Neyora FAQ schema to the visible Arabic answers", () => {
    const data = neyoraPageJsonLd("ar");
    const faq = (data["@graph"] as { "@type": string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[]).find(
      (node) => node["@type"] === "FAQPage",
    );
    expect(faq?.mainEntity?.map((item) => item.acceptedAnswer.text)).toEqual(
      ar.products.neyora.faqs.map((item) => item.a),
    );
    const app = (data["@graph"] as { "@type": string; inLanguage?: string; releaseNotes?: string }[]).find(
      (node) => node["@type"] === "SoftwareApplication",
    );
    expect(app?.inLanguage).toBe("ar");
    expect(app?.releaseNotes).toBe("قيد التطوير");
  });
});

describe("page metadata", () => {
  it("emits hreflang pairs whose canonical stays on the English URL", () => {
    const metadata = buildPageMetadata({
      title: "Example",
      description: "Example description for a QVI page.",
      path: "/about",
    });
    expect(metadata.alternates).toEqual({
      canonical: "/about",
      languages: hreflangLanguages("/about"),
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.openGraph).toMatchObject({ locale: "en_US", type: "website" });
  });

  it("does not emit hreflang for pages without an indexable Arabic URL", () => {
    const metadata = buildPageMetadata({
      title: "Sign in",
      description: "Sign in or create your QVI account to download QV1 Evaluation and manage your waitlist spot.",
      path: "/login",
    });
    expect(metadata.alternates).toEqual({ canonical: "/login" });
  });

  it("points Arabic metadata at itself and pairs hreflang back to English", () => {
    const metadata = buildArabicPageMetadata({
      title: "عن QVI",
      description: "وصف عربي لصفحة عن QVI يشرح الاستوديو والمنتجات.",
      englishPath: "/about",
    });
    expect(metadata.alternates).toEqual({
      canonical: "/ar/about",
      languages: {
        en: "/about",
        ar: "/ar/about",
        "x-default": "/about",
      },
    });
    expect(metadata.openGraph).toMatchObject({ locale: "ar_AR" });
    const images = metadata.openGraph?.images;
    const image = Array.isArray(images) ? images[0] : images;
    expect(image).toMatchObject({ alt: expect.stringMatching(arabic) });
  });

  it("keeps indexable titles in English and within a typical title length", () => {
    const pages = [...Object.values(pageMeta), ...Object.values(toolPageMeta)];
    for (const page of pages) {
      expect(page.title, page.path).not.toMatch(arabic);
      expect(page.description, page.path).not.toMatch(arabic);
      expect(page.title.length, page.title).toBeLessThanOrEqual(60);
      expect(page.description.length, page.path).toBeGreaterThan(60);
      expect(page.description.length, page.description).toBeLessThanOrEqual(165);
    }
  });

  it("counts the free tools named in the tools hub description", () => {
    expect(tools).toHaveLength(18);
    expect(pageMeta.tools.description.startsWith("18 free browser tools")).toBe(true);
  });
});

describe("crawl files", () => {
  it("serves a sitemap without /lab and a robots file without a Host line", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith("/lab"))).toBe(false);
    expect(urls.some((url) => url.endsWith("/products/neyora"))).toBe(true);
    expect(urls).toContain(`${siteConfig.url}/ar`);
    expect(urls).toContain(`${siteConfig.url}/ar/products/qv1`);
    expect(urls).toContain(`${siteConfig.url}/ar/tools/mp4-to-mp3`);
    const home = sitemap().find((entry) => entry.url === `${siteConfig.url}/ar`);
    expect(home?.alternates?.languages).toMatchObject({
      en: siteConfig.url,
      ar: `${siteConfig.url}/ar`,
      "x-default": siteConfig.url,
    });
    const llms = readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");
    expect(llms).toMatch(/\/ar\/products\/qv1/);
    expect(llms).not.toMatch(/no separate Arabic URLs/);
    const rules = robots();
    expect(rules).not.toHaveProperty("host");
    expect(rules.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
    const agents = (Array.isArray(rules.rules) ? rules.rules : [rules.rules]).map((rule) => rule.userAgent);
    expect(agents).toContain("GPTBot");
    expect(agents).toContain("*");
  });
});
