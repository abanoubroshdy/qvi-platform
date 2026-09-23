import { describe, expect, it } from "vitest";
import { contactPageJsonLd, homePageJsonLd, organizationSchema } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

describe("seo json-ld", () => {
  it("includes support email on the organization", () => {
    expect(organizationSchema().email).toBe(siteConfig.supportEmail);
  });

  it("builds a home graph with website and navigation list", () => {
    const data = homePageJsonLd();
    expect(data["@graph"]).toHaveLength(3);
    const types = (data["@graph"] as { "@type": string }[]).map((node) => node["@type"]);
    expect(types).toContain("WebSite");
    expect(types).toContain("ItemList");
  });

  it("builds contact page with ContactPage and support contact point", () => {
    const data = contactPageJsonLd();
    const contact = (data["@graph"] as Record<string, unknown>[]).find(
      (node) => node["@type"] === "ContactPage",
    );
    expect(contact).toBeTruthy();
    const mainEntity = contact?.mainEntity as { email?: string };
    expect(mainEntity.email).toBe("support@getqvi.com");
  });
});
