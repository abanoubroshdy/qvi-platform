/**
 * Phase 0 — PDF→Word measurement & page classification.
 * Pure metrics over raw PDF text, normalized text, and layout output.
 * Does not change conversion behavior.
 */

import {
  type LayoutBlock,
  type PageLayout,
  type PdfSpan,
  normalizePdfText,
  layoutPage,
  isRtlText,
  parsePdfFont,
  fontSizeFromTransform,
  type PdfDir,
} from "@/lib/pdf-to-word-layout";

// Same ranges as normalizePdfText / sanitizeXmlText — kept local so diagnostics
// stay importable without exporting every private regex from the layout module.
const XML_ILLEGAL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const FONT_GARBAGE_RE = /[\u0530-\u058F\u1400-\u167F\u18B0-\u18FF\uA000-\uA48F]/g;
const PUA_RE = /[\uE000-\uF8FF]/g;
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
/** Latin that often accompanies broken ToUnicode (B→%, T→7, etc.). */
const LATIN_CORRUPTION_RE = /%[A-Za-z]|[0-9][a-z]{3,}|\.[,.][A-Za-z]|\)[0-9A-Za-z]|[A-Za-z]\([A-Za-z]/g;

export type PageClass = "clean" | "partial_broken" | "needs_visual";

export type TextHealthMetrics = {
  rawCharCount: number;
  normalizedCharCount: number;
  arabicCharCount: number;
  latinCharCount: number;
  garbageRawCount: number;
  garbageLeftoverCount: number;
  xmlIllegalRawCount: number;
  xmlIllegalLeftoverCount: number;
  puaLeftoverCount: number;
  recoveryRatio: number;
  latinCorruptionCount: number;
  tabCount: number;
  checkboxCount: number;
};

export type PageDiagnostics = TextHealthMetrics & {
  pageIndex: number;
  class: PageClass;
  tableCount: number;
  formTableCount: number;
  textBlockCount: number;
  imageBlockCount: number;
  wordCount: number;
  useVisualFallback: boolean;
  reasons: string[];
};

export type DocumentDiagnostics = {
  pages: PageDiagnostics[];
  summary: {
    pageCount: number;
    cleanPages: number;
    partialBrokenPages: number;
    needsVisualPages: number;
    overallClass: PageClass;
    xmlValid: boolean;
    meanRecoveryRatio: number;
    totalGarbageLeftover: number;
    totalTables: number;
    totalFormTables: number;
    totalTabs: number;
    totalCheckboxes: number;
  };
};

export type RawPageText = {
  /** Concatenated raw item strings before normalizePdfText. */
  rawItems: string[];
  /** Optional pre-built spans; when omitted, diagnostics build spans from rawItems. */
  spans?: PdfSpan[];
  widthPt?: number;
  heightPt?: number;
  imageCount?: number;
};

function countMatches(text: string, re: RegExp) {
  const global = re.global ? re : new RegExp(re.source, `${re.flags}g`);
  return (text.match(global) ?? []).length;
}

function countLatin(text: string) {
  return (text.match(/[A-Za-z]/g) ?? []).length;
}

export function measureTextHealth(raw: string, normalized: string): TextHealthMetrics {
  const garbageRawCount = countMatches(raw, FONT_GARBAGE_RE);
  const garbageLeftoverCount = countMatches(normalized, FONT_GARBAGE_RE);
  const xmlIllegalRawCount = countMatches(raw, XML_ILLEGAL_RE);
  const xmlIllegalLeftoverCount = countMatches(normalized, XML_ILLEGAL_RE);
  const puaLeftoverCount = countMatches(normalized, PUA_RE);
  const recovered = Math.max(0, garbageRawCount - garbageLeftoverCount);
  const recoveryRatio =
    garbageRawCount === 0
      ? garbageLeftoverCount === 0 && puaLeftoverCount === 0
        ? 1
        : 0
      : Math.max(0, Math.min(1, recovered / garbageRawCount));

  return {
    rawCharCount: raw.replace(/\s+/g, "").length,
    normalizedCharCount: normalized.replace(/\s+/g, "").length,
    arabicCharCount: countMatches(normalized, ARABIC_RE),
    latinCharCount: countLatin(normalized),
    garbageRawCount,
    garbageLeftoverCount,
    xmlIllegalRawCount,
    xmlIllegalLeftoverCount,
    puaLeftoverCount,
    recoveryRatio,
    latinCorruptionCount: countMatches(normalized, LATIN_CORRUPTION_RE),
    tabCount: (normalized.match(/\t/g) ?? []).length,
    checkboxCount: (normalized.match(/[☐☑☒□■]/g) ?? []).length,
  };
}

export function classifyPage(input: {
  health: TextHealthMetrics;
  useVisualFallback: boolean;
  tableCount: number;
}): { class: PageClass; reasons: string[] } {
  const reasons: string[] = [];
  const { health, useVisualFallback, tableCount } = input;

  if (useVisualFallback) {
    reasons.push("visual_fallback");
    return { class: "needs_visual", reasons };
  }

  if (health.rawCharCount < 8 && health.arabicCharCount + health.latinCharCount < 4) {
    reasons.push("almost_empty_text");
    return { class: "needs_visual", reasons };
  }

  if (health.garbageRawCount >= 40 && health.recoveryRatio < 0.35) {
    reasons.push("low_recovery_ratio");
    return { class: "needs_visual", reasons };
  }

  if (health.garbageLeftoverCount > 0) {
    reasons.push("garbage_leftover");
  }
  if (health.xmlIllegalLeftoverCount > 0 || health.puaLeftoverCount > 0) {
    reasons.push("xml_or_pua_leftover");
  }
  if (health.recoveryRatio < 0.85 && health.garbageRawCount > 0) {
    reasons.push("incomplete_recovery");
  }
  if (health.latinCorruptionCount >= 2) {
    reasons.push("latin_corruption");
  }
  if (health.tabCount >= 3) {
    reasons.push("tab_heavy_layout");
  }
  if (health.checkboxCount >= 2 && tableCount === 0) {
    reasons.push("form_controls_without_tables");
  }
  if (tableCount === 0 && health.checkboxCount >= 4) {
    reasons.push("likely_lost_table_structure");
  }

  if (reasons.length) {
    return { class: "partial_broken", reasons };
  }

  return { class: "clean", reasons: ["healthy_text"] };
}

function layoutText(blocks: LayoutBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "image") return "";
      if (block.type === "table") {
        return block.rows
          .map((row) =>
            row.map((cell) => cell.runs.map((run) => (run.kind === "text" ? run.text : "")).join("")).join(" "),
          )
          .join("\n");
      }
      return block.runs.map((run) => (run.kind === "text" ? run.text : "")).join("");
    })
    .join("\n");
}

export function diagnosePage(
  pageIndex: number,
  rawItems: string[],
  layout: PageLayout,
  options?: { tableCount?: number },
): PageDiagnostics {
  const raw = rawItems.join("");
  const normalizedFromRaw = rawItems.map((item) => normalizePdfText(item, isRtlText(item) ? "rtl" : "ltr")).join("");
  const fromLayout = layoutText(layout.blocks);
  // Prefer layout text (what Word gets); fall back to per-item normalize for visual pages.
  const normalized = layout.useVisualFallback ? normalizedFromRaw : fromLayout || normalizedFromRaw;
  const health = measureTextHealth(raw, normalized);
  const tableCount = options?.tableCount ?? layout.tableCount ?? 0;
  const formTableCount = layout.formTableCount ?? 0;
  const { class: pageClass, reasons } = classifyPage({
    health,
    useVisualFallback: layout.useVisualFallback,
    tableCount,
  });

  return {
    pageIndex,
    class: pageClass,
    tableCount,
    formTableCount,
    textBlockCount: layout.blocks.filter((block) => block.type === "text").length,
    imageBlockCount: layout.blocks.filter((block) => block.type === "image").length,
    wordCount: layout.wordCount,
    useVisualFallback: layout.useVisualFallback,
    reasons,
    ...health,
  };
}

function worstClass(classes: PageClass[]): PageClass {
  if (classes.includes("needs_visual")) return "needs_visual";
  if (classes.includes("partial_broken")) return "partial_broken";
  return "clean";
}

export function diagnoseDocument(pages: PageDiagnostics[]): DocumentDiagnostics {
  const cleanPages = pages.filter((page) => page.class === "clean").length;
  const partialBrokenPages = pages.filter((page) => page.class === "partial_broken").length;
  const needsVisualPages = pages.filter((page) => page.class === "needs_visual").length;
  const meanRecoveryRatio =
    pages.length === 0 ? 1 : pages.reduce((sum, page) => sum + page.recoveryRatio, 0) / pages.length;
  const totalGarbageLeftover = pages.reduce((sum, page) => sum + page.garbageLeftoverCount + page.puaLeftoverCount, 0);
  const xmlValid = pages.every((page) => page.xmlIllegalLeftoverCount === 0);

  return {
    pages,
    summary: {
      pageCount: pages.length,
      cleanPages,
      partialBrokenPages,
      needsVisualPages,
      overallClass: worstClass(pages.map((page) => page.class)),
      xmlValid,
      meanRecoveryRatio,
      totalGarbageLeftover,
      totalTables: pages.reduce((sum, page) => sum + page.tableCount, 0),
      totalFormTables: pages.reduce((sum, page) => sum + page.formTableCount, 0),
      totalTabs: pages.reduce((sum, page) => sum + page.tabCount, 0),
      totalCheckboxes: pages.reduce((sum, page) => sum + page.checkboxCount, 0),
    },
  };
}

/** Diagnose a document from raw page extracts + optional layouts (builds layout if missing). */
export function diagnoseFromRawPages(pages: RawPageText[]): DocumentDiagnostics {
  const diagnosed = pages.map((page, index) => {
    const width = page.widthPt ?? 595;
    const height = page.heightPt ?? 842;
    const spans =
      page.spans ??
      page.rawItems
        .map((text, itemIndex) => {
          const hinted: PdfDir = isRtlText(text) ? "rtl" : "ltr";
          const normalized = normalizePdfText(text, hinted);
          if (!normalized.replace(/\s+/g, "").length) return null;
          return {
            text: normalized,
            x: 72,
            y: height - 72 - itemIndex * 14,
            width: Math.max(12, normalized.length * 6),
            height: 12,
            fontSize: 12,
            fontFamily: "Arial",
            bold: false,
            italic: false,
            color: "000000",
            dir: hinted,
          } satisfies PdfSpan;
        })
        .filter((span): span is PdfSpan => Boolean(span));

    const images = Array.from({ length: page.imageCount ?? 0 }, (_, i) => ({
      x: 72,
      y: 200 - i * 40,
      width: 120,
      height: 80,
    }));
    const layout = layoutPage(width, height, spans, images);
    return diagnosePage(index, page.rawItems, layout);
  });

  return diagnoseDocument(diagnosed);
}

/** Quick check that DOCX document.xml has no illegal XML 1.0 controls. */
export function diagnoseDocxXml(xml: string): { xmlValid: boolean; illegalCount: number } {
  const illegalCount = countMatches(xml, XML_ILLEGAL_RE);
  return { xmlValid: illegalCount === 0, illegalCount };
}

/**
 * Extract raw text items from a PDF in Node (no canvas).
 * Used by Phase 0 fixtures / baseline script — not the browser converter.
 */
export async function extractRawPagesFromPdf(data: Uint8Array): Promise<RawPageText[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data,
    disableWorker: true,
    useSystemFonts: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const pages: RawPageText[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const text = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false });
    const view = page.view as number[];
    const xMin = view[0] ?? 0;
    const yMin = view[1] ?? 0;
    const rawItems: string[] = [];
    const spans: PdfSpan[] = [];

    for (const item of text.items) {
      if (!("str" in item)) continue;
      const raw = item.str ?? "";
      rawItems.push(raw);
      const hinted: PdfDir = item.dir === "rtl" || isRtlText(raw) ? "rtl" : "ltr";
      const normalized = normalizePdfText(raw, hinted);
      if (!normalized.replace(/\s+/g, "").length) continue;
      const transform = item.transform ?? [1, 0, 0, 1, 0, 0];
      const fontSize = fontSizeFromTransform(transform);
      const fontName = item.fontName ?? "Arial";
      const parsed = parsePdfFont(fontName);
      const x = (transform[4] ?? 0) - xMin;
      const y = (transform[5] ?? 0) - yMin;
      spans.push({
        text: normalized,
        x,
        y,
        width: item.width ?? fontSize * normalized.length * 0.5,
        height: item.height ?? fontSize,
        fontSize,
        fontFamily: parsed.family,
        bold: parsed.bold,
        italic: parsed.italic,
        color: "000000",
        dir: hinted === "rtl" || isRtlText(normalized) ? "rtl" : "ltr",
      });
    }

    pages.push({
      rawItems,
      spans,
      widthPt: viewport.width,
      heightPt: viewport.height,
      imageCount: 0,
    });
  }

  return pages;
}

export function formatDiagnosticsReport(doc: DocumentDiagnostics, title = "PDF→Word Phase 0 baseline"): string {
  const lines: string[] = [
    `# ${title}`,
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Summary",
    "",
    `- Pages: ${doc.summary.pageCount}`,
    `- Overall class: **${doc.summary.overallClass}**`,
    `- Clean / partial_broken / needs_visual: ${doc.summary.cleanPages} / ${doc.summary.partialBrokenPages} / ${doc.summary.needsVisualPages}`,
    `- XML valid (no illegal controls in normalized text): ${doc.summary.xmlValid}`,
    `- Mean recovery ratio: ${doc.summary.meanRecoveryRatio.toFixed(3)}`,
    `- Garbage leftovers (font garbage + PUA): ${doc.summary.totalGarbageLeftover}`,
    `- Tables detected: ${doc.summary.totalTables}`,
    `- Form tables (checkbox grids): ${doc.summary.totalFormTables}`,
    `- Tabs in output: ${doc.summary.totalTabs}`,
    `- Checkbox glyphs: ${doc.summary.totalCheckboxes}`,
    "",
    "## Per-page",
    "",
    "| Page | Class | Recovery | Garbage left | Tabs | ☐ | Tables | Form | Reasons |",
    "| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const page of doc.pages) {
    lines.push(
      `| ${page.pageIndex + 1} | ${page.class} | ${page.recoveryRatio.toFixed(3)} | ${page.garbageLeftoverCount + page.puaLeftoverCount} | ${page.tabCount} | ${page.checkboxCount} | ${page.tableCount} | ${page.formTableCount} | ${page.reasons.join(", ")} |`,
    );
  }

  lines.push(
    "",
    "## Notes",
    "",
    "- `tableCount` includes Phase 2 column grids and Phase 3 form tables.",
    "- `formTableCount` counts bordered checkbox/option grids (`role: form`).",
    "- `recoveryRatio` = (raw font-garbage chars removed) / (raw font-garbage chars); 1.0 means full strip or no garbage.",
    "",
  );

  return lines.join("\n");
}
