import { describe, expect, it } from "vitest";
import { ar } from "@/lib/i18n/ar";
import {
  alternatePath,
  hreflangLanguages,
  indexableEnglishPaths,
  localizeHref,
  localeFromPath,
  stripLocale,
  withLocale,
} from "@/lib/i18n/locale-path";
import { arabicSeoForPath } from "@/lib/page-meta-ar";
import { tools } from "@/lib/tools";

describe("locale paths", () => {
  it("keeps English hrefs identical and prefixes Arabic pages", () => {
    expect(localizeHref("/products/qv1", "en")).toBe("/products/qv1");
    expect(localizeHref("/#products", "en")).toBe("/#products");
    expect(localizeHref("/qv1/download", "en")).toBe("/qv1/download");
    expect(localizeHref("/products/qv1", "ar")).toBe("/ar/products/qv1");
    expect(localizeHref("/#products", "ar")).toBe("/ar#products");
    expect(localizeHref("/qv1/download", "ar")).toBe("/qv1/download");
    expect(localizeHref("https://example.com/qv1", "ar")).toBe("https://example.com/qv1");
  });

  it("toggles between the same page in each language", () => {
    expect(alternatePath("/tools/audio-cutter")).toBe("/ar/tools/audio-cutter");
    expect(alternatePath("/ar/studio")).toBe("/studio");
    expect(alternatePath("/ar")).toBe("/");
    expect(localeFromPath("/ar/qv1/models")).toBe("ar");
    expect(stripLocale("/ar/qv1/models")).toBe("/qv1/models");
    expect(withLocale("/", "ar")).toBe("/ar");
  });

  it("gives every indexable English page Arabic metadata and a self canonical pair", () => {
    for (const path of indexableEnglishPaths()) {
      expect(arabicSeoForPath(path), path).toBeTruthy();
      expect(arabicSeoForPath(path)?.title, path).toMatch(/[\u0600-\u06FF]/);
      expect(hreflangLanguages(path).ar).toBe(withLocale(path, "ar"));
      expect(hreflangLanguages(path)["x-default"]).toBe(path);
    }
    expect(tools.map((tool) => tool.slug)).toContain("video-converter");
    expect(ar.products.qv1.status).toBe("نسخة تقييم");
    expect(ar.products.neyora.status).toBe("قيد التطوير");
  });
});
