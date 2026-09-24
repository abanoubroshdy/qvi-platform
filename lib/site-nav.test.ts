import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { products } from "@/lib/products";
import {
  footerCompanyItems,
  footerExploreItems,
  headerNavItems,
  qv1Path,
} from "@/lib/site-nav";

const routeFiles: Record<string, string> = {
  "/": "app/(workspace)/page.tsx",
  "/studio": "app/(workspace)/studio/page.tsx",
  "/about": "app/about/page.tsx",
  "/contact": "app/contact/page.tsx",
  "/lab": "app/lab/page.tsx",
  "/tools": "app/tools/page.tsx",
  "/privacy-policy": "app/privacy-policy/page.tsx",
  "/terms": "app/terms/page.tsx",
  "/products/qv1": "app/products/qv1/page.tsx",
  "/products/neyora": "app/products/neyora/page.tsx",
};

const homepageSectionFiles = [
  "components/views/HomeView.tsx",
  "components/home/HomeLabSection.tsx",
  "components/home/HomeToolsCategories.tsx",
  "components/home/HomeSiteExplore.tsx",
];

function pageFor(href: string) {
  const route = href.split("#")[0] || "/";
  return routeFiles[route];
}

describe("primary navigation hrefs", () => {
  const hrefs = [
    ...headerNavItems.map((item) => item.href),
    qv1Path,
    ...footerExploreItems.map((item) => item.href),
    ...footerCompanyItems.map((item) => item.href),
    products.studio.href,
    products.qv1.href,
    products.neyora.href,
    "/tools",
  ];

  it("point at pages that exist in the app", () => {
    for (const href of hrefs) {
      const file = pageFor(href);
      expect(file, href).toBeTruthy();
      expect(fs.existsSync(path.join(process.cwd(), file!)), href).toBe(true);
    }
  });

  it("does not advertise docs, pricing, or a plugin marketplace", () => {
    for (const href of hrefs) {
      expect(href).not.toMatch(/\/(docs|pricing|plugins)(\/|$)/);
    }
  });

  it("homepage hash targets exist", () => {
    const source = homepageSectionFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    for (const id of ["products", "tools", "lab", "explore"]) {
      expect(source).toContain(`id="${id}"`);
    }
  });
});
