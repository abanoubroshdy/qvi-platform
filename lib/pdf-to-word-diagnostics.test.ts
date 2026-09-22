import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  classifyPage,
  diagnoseDocxXml,
  diagnoseDocument,
  diagnoseFromRawPages,
  diagnosePage,
  extractRawPagesFromPdf,
  formatDiagnosticsReport,
  measureTextHealth,
  type PageDiagnostics,
} from "@/lib/pdf-to-word-diagnostics";
import { layoutPage, normalizePdfText } from "@/lib/pdf-to-word-layout";
import { buildDocxFromPages } from "@/lib/pdf-to-word";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "fixtures", "pdf-to-word");

function loadSample(name: string) {
  return JSON.parse(readFileSync(join(fixtures, "samples", name), "utf8")) as {
    id: string;
    pages: Array<{ widthPt: number; heightPt: number; rawItems: string[] }>;
  };
}

describe("pdf-to-word diagnostics metrics", () => {
  it("reports full recovery when broken-font garbage is stripped", () => {
    const raw =
      "لماشلا يتوصلا مييقتلا جذومن՚՞ᓤᓚ\u0003ᓘᓪᓪᓎᒎᓕՕ\u0003اشلا يتوصلا مييقتلا جذومن";
    const normalized = normalizePdfText(raw, "rtl");
    const health = measureTextHealth(raw, normalized);
    expect(health.garbageRawCount).toBeGreaterThan(5);
    expect(health.garbageLeftoverCount).toBe(0);
    expect(health.xmlIllegalLeftoverCount).toBe(0);
    expect(health.recoveryRatio).toBe(1);
    expect(normalized).toContain("نموذج");
  });

  it("scores clean logical Arabic as recovery 1 with no garbage", () => {
    const raw = "نموذج التقييم الصوتي الشامل";
    const health = measureTextHealth(raw, normalizePdfText(raw, "rtl"));
    expect(health.garbageRawCount).toBe(0);
    expect(health.recoveryRatio).toBe(1);
    expect(health.arabicCharCount).toBeGreaterThan(10);
  });

  it("classifies pages: clean / partial_broken / needs_visual", () => {
    expect(
      classifyPage({
        health: measureTextHealth("Hello world", "Hello world"),
        useVisualFallback: false,
        tableCount: 0,
      }).class,
    ).toBe("clean");

    const form = measureTextHealth(
      "☐ A\t☐ B\t☐ C\t☐ D",
      "☐ A\t☐ B\t☐ C\t☐ D",
    );
    expect(
      classifyPage({ health: form, useVisualFallback: false, tableCount: 0 }).class,
    ).toBe("partial_broken");

    expect(
      classifyPage({
        health: measureTextHealth("", ""),
        useVisualFallback: true,
        tableCount: 0,
      }).class,
    ).toBe("needs_visual");
  });

  it("diagnoses synthetic clean / broken / form fixtures", () => {
    const clean = diagnoseFromRawPages(loadSample("clean-arabic.json").pages);
    expect(clean.summary.overallClass).toBe("clean");
    expect(clean.summary.xmlValid).toBe(true);
    expect(clean.summary.meanRecoveryRatio).toBe(1);

    const broken = diagnoseFromRawPages(loadSample("broken-font-arabic.json").pages);
    expect(broken.summary.xmlValid).toBe(true);
    expect(broken.pages[0]!.garbageRawCount).toBeGreaterThan(0);
    expect(broken.pages[0]!.recoveryRatio).toBeGreaterThan(0.9);
    expect(broken.pages[0]!.latinCorruptionCount).toBe(0);
    // Checkboxes without tables → partial_broken even after Latin cleanup
    expect(broken.summary.overallClass).toBe("partial_broken");
    expect(broken.pages[0]!.reasons).not.toContain("latin_corruption");

    const form = diagnoseFromRawPages(loadSample("form-checkboxes-tabs.json").pages);
    expect(form.summary.overallClass).toBe("partial_broken");
    expect(form.summary.totalTables).toBe(0);
    expect(form.summary.totalTabs).toBeGreaterThanOrEqual(3);
    expect(form.summary.totalCheckboxes).toBeGreaterThanOrEqual(4);
  });

  it("aggregates document summary from page diagnostics", () => {
    const pages: PageDiagnostics[] = [
      {
        pageIndex: 0,
        class: "clean",
        tableCount: 0,
        textBlockCount: 1,
        imageBlockCount: 0,
        wordCount: 3,
        useVisualFallback: false,
        reasons: ["healthy_text"],
        rawCharCount: 10,
        normalizedCharCount: 10,
        arabicCharCount: 0,
        latinCharCount: 10,
        garbageRawCount: 0,
        garbageLeftoverCount: 0,
        xmlIllegalRawCount: 0,
        xmlIllegalLeftoverCount: 0,
        puaLeftoverCount: 0,
        recoveryRatio: 1,
        latinCorruptionCount: 0,
        tabCount: 0,
        checkboxCount: 0,
      },
      {
        pageIndex: 1,
        class: "partial_broken",
        tableCount: 0,
        textBlockCount: 2,
        imageBlockCount: 0,
        wordCount: 5,
        useVisualFallback: false,
        reasons: ["tab_heavy_layout"],
        rawCharCount: 20,
        normalizedCharCount: 20,
        arabicCharCount: 0,
        latinCharCount: 18,
        garbageRawCount: 0,
        garbageLeftoverCount: 0,
        xmlIllegalRawCount: 0,
        xmlIllegalLeftoverCount: 0,
        puaLeftoverCount: 0,
        recoveryRatio: 1,
        latinCorruptionCount: 0,
        tabCount: 4,
        checkboxCount: 0,
      },
    ];
    const doc = diagnoseDocument(pages);
    expect(doc.summary.overallClass).toBe("partial_broken");
    expect(doc.summary.cleanPages).toBe(1);
    expect(doc.summary.partialBrokenPages).toBe(1);
  });

  it("flags illegal controls in DOCX XML", () => {
    expect(diagnoseDocxXml("<w:t>مرحبا</w:t>")).toEqual({ xmlValid: true, illegalCount: 0 });
    expect(diagnoseDocxXml("bad\u0000xml").xmlValid).toBe(false);
  });
});

describe("vocal assessment form fixture", () => {
  it("extracts 4 pages and classifies layout debt after Phase 1–2 cleanup", async () => {
    const data = new Uint8Array(readFileSync(join(fixtures, "vocal_assessment_form.pdf")));
    const rawPages = await extractRawPagesFromPdf(data);
    expect(rawPages).toHaveLength(4);
    expect(rawPages[0]!.rawItems.join("")).toMatch(/[\u1400-\u167F\u0530-\u058F]/);

    const diagnosed = diagnoseFromRawPages(rawPages);
    expect(diagnosed.summary.pageCount).toBe(4);
    expect(diagnosed.summary.xmlValid).toBe(true);
    expect(diagnosed.summary.meanRecoveryRatio).toBeGreaterThan(0.9);
    expect(diagnosed.summary.totalGarbageLeftover).toBe(0);
    // Phase 2: borderless column tables replace most tab gutters.
    expect(diagnosed.summary.totalTables).toBeGreaterThan(0);
    expect(diagnosed.summary.totalTabs).toBeLessThan(10);
    expect(diagnosed.pages.every((page) => !page.reasons.includes("latin_corruption"))).toBe(true);
    expect(diagnosed.pages.every((page) => !page.reasons.includes("tab_heavy_layout"))).toBe(true);
    expect(diagnosed.pages.every((page) => page.class !== "needs_visual")).toBe(true);

    const report = formatDiagnosticsReport(diagnosed, "vocal_assessment_form.pdf");
    expect(report).toMatch(/Tables detected: [1-9]/);
  });

  it("builds Word-safe DOCX XML from the first vocal page layout", async () => {
    const data = new Uint8Array(readFileSync(join(fixtures, "vocal_assessment_form.pdf")));
    const rawPages = await extractRawPagesFromPdf(data);
    const first = rawPages[0]!;
    const layout = layoutPage(first.widthPt ?? 595, first.heightPt ?? 842, first.spans ?? [], []);
    const pageDiag = diagnosePage(0, first.rawItems, layout);
    expect(pageDiag.recoveryRatio).toBeGreaterThan(0.9);

    const blob = await buildDocxFromPages([{ layout, images: [] }], "vocal-page-1");
    const unzipper = await import("jszip");
    const zip = await unzipper.default.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");
    expect(xml).toBeTruthy();
    expect(diagnoseDocxXml(xml!).xmlValid).toBe(true);
    expect(xml).toContain("نموذج");
    expect(xml).not.toMatch(/[\u1400-\u167F\u0530-\u058F]/);
  });
});

describe("simple english PDF extract", () => {
  it("reads the synthetic English form PDF", async () => {
    const data = new Uint8Array(readFileSync(join(fixtures, "simple-english-form.pdf")));
    const pages = await extractRawPagesFromPdf(data);
    expect(pages).toHaveLength(1);
    const joined = pages[0]!.rawItems.join(" ");
    expect(joined).toContain("Basic Information");
    const diagnosed = diagnoseFromRawPages(pages);
    expect(diagnosed.summary.xmlValid).toBe(true);
  });
});
