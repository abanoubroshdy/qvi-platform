import { describe, expect, it } from "vitest";
import { products } from "@/lib/products";
import { qviStudioProduct, qviStudioSurfaces } from "@/lib/studio/definition";
import { tools } from "@/lib/tools";

describe("QVI Studio product listing", () => {
  it("points the homepage and the dedicated route at the same product", () => {
    expect(products.studio).toMatchObject({
      name: qviStudioProduct.name,
      href: qviStudioSurfaces.homepageRoute,
      workspaceHref: qviStudioSurfaces.workspaceRoute,
    });
    expect(qviStudioSurfaces.sameSessionOnHomeAndWorkspace).toBe(true);
    expect(qviStudioSurfaces.listedInToolsHub).toBe(false);
  });

  it("stays out of the free tools hub", () => {
    expect(tools.some((tool) => tool.href === products.studio.href || tool.href === products.studio.workspaceHref)).toBe(false);
  });
});
