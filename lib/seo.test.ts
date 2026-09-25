import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { pageMeta, toolPageMeta } from "@/lib/page-meta";
import {
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
    expect(app?.operatingSystem).toBe("Desktop-class first, web companion later");
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
  });
});

describe("page metadata", () => {
  it("does not emit hreflang alternates", () => {
    const metadata = buildPageMetadata({
      title: "Example",
      description: "Example description for a QVI page.",
      path: "/about",
    });
    expect(metadata.alternates).toEqual({ canonical: "/about" });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.openGraph).toMatchObject({ locale: "en_US", type: "website" });
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
    expect(tools).toHaveLength(17);
    expect(pageMeta.tools.description.startsWith("17 free browser tools")).toBe(true);
  });
});

describe("crawl files", () => {
  it("serves a sitemap without /lab and a robots file without a Host line", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith("/lab"))).toBe(false);
    expect(urls.some((url) => url.endsWith("/products/neyora"))).toBe(true);
    const rules = robots();
    expect(rules).not.toHaveProperty("host");
    expect(rules.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
    const agents = (Array.isArray(rules.rules) ? rules.rules : [rules.rules]).map((rule) => rule.userAgent);
    expect(agents).toContain("GPTBot");
    expect(agents).toContain("*");
  });
});
