import { describe, expect, it } from "vitest";
import { products } from "@/lib/products";
import { qviStudioProduct, qviStudioSurfaces } from "@/lib/studio/definition";
import { tools } from "@/lib/tools";

describe("QVI Studio product listing", () => {
  it("points the studio product at its own page", () => {
    expect(products.studio).toMatchObject({
      name: qviStudioProduct.name,
      href: qviStudioSurfaces.workspaceRoute,
      workspaceHref: qviStudioSurfaces.workspaceRoute,
    });
    expect(products.studio.href).not.toBe(qviStudioSurfaces.homepageRoute);
    expect(qviStudioSurfaces.sameSessionOnHomeAndWorkspace).toBe(false);
    expect(qviStudioSurfaces.listedInToolsHub).toBe(false);
  });

  it("stays out of the free tools hub", () => {
    expect(tools.some((tool) => tool.href === products.studio.href || tool.href === products.studio.workspaceHref)).toBe(false);
  });
});
