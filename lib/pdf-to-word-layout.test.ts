import { describe, expect, it } from "vitest";
import {
  countWords,
  fontSizeFromTransform,
  groupSpansIntoLines,
  isRtlText,
  layoutPage,
  looksVisuallyOrderedArabic,
  normalizePdfText,
  parsePdfFont,
  pointsToHalfPoints,
  previewTextFromLayouts,
  reverseArabicRuns,
  rgbToHex,
  type PdfSpan,
} from "@/lib/pdf-to-word-layout";
import { buildDocxFromPages, wordFileName } from "@/lib/pdf-to-word";

function span(partial: Partial<PdfSpan> & Pick<PdfSpan, "text" | "x" | "y">): PdfSpan {
  return {
    width: (partial.text.length || 1) * (partial.fontSize ?? 12) * 0.5,
    height: partial.fontSize ?? 12,
    fontSize: 12,
    fontFamily: "Arial",
    bold: false,
    italic: false,
    color: "000000",
    dir: "ltr",
    ...partial,
  };
}

describe("pdf to word layout", () => {
  it("parses PDF font names into family and weight", () => {
    expect(parsePdfFont("ABCDEF+TimesNewRomanPS-BoldMT")).toEqual({
      family: "Times New Roman",
      bold: true,
      italic: false,
    });
    expect(parsePdfFont("Helvetica-Oblique")).toEqual({
      family: "Helvetica",
      bold: false,
      italic: true,
    });
    expect(parsePdfFont("Arial-BoldItalic")).toMatchObject({ family: "Arial", bold: true, italic: true });
  });

  it("reads font size from the text transform matrix", () => {
    expect(fontSizeFromTransform([18, 0, 0, 18, 72, 700])).toBeCloseTo(18);
    expect(pointsToHalfPoints(11)).toBe(22);
    expect(rgbToHex(255, 0, 0)).toBe("ff0000");
  });

  it("groups single-column lines top to bottom and keeps bold runs", () => {
    const lines = groupSpansIntoLines(
      [
        span({ text: "Title", x: 72, y: 720, fontSize: 22, bold: true }),
        span({ text: "Hello", x: 72, y: 680, fontSize: 12 }),
        span({ text: "world", x: 110, y: 680, fontSize: 12, bold: true }),
      ],
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]?.items).toHaveLength(1);
    expect(lines[1]?.items).toHaveLength(2);
  });

  it("rebuilds Arabic lines in logical order and marks RTL", () => {
    expect(isRtlText("مرحبا بالعالم")).toBe(true);
    const page = layoutPage(
      595,
      842,
      [
        span({ text: "العالم", x: 200, y: 700, dir: "rtl", fontSize: 14, width: 70 }),
        span({ text: "مرحبا", x: 280, y: 700, dir: "rtl", fontSize: 14, width: 55 }),
      ],
      [],
    );
    const block = page.blocks[0];
    expect(block?.type).toBe("text");
    if (block?.type !== "text") return;
    expect(block.rtl).toBe(true);
    expect(block.alignment).toBe("right");
    const text = block.runs.map((run) => (run.kind === "text" ? run.text : "")).join("");
    expect(text).toContain("مرحبا");
    expect(text.indexOf("مرحبا")).toBeLessThan(text.indexOf("العالم"));
    // Geometric gap between boxes must insert a space after RTL sort.
    expect(text).toMatch(/مرحبا\s+العالم/);
  });

  it("normalizes Arabic presentation forms and strips illegal XML controls", async () => {
    const { sanitizeXmlText, fontForRun } = await import("@/lib/pdf-to-word-layout");
    // Arabic presentation form for "ب" (U+FE91) → base ب
    expect(normalizePdfText("\uFE91")).toBe("ب");
    expect(sanitizeXmlText("hi\u0000there\u0008")).toBe("hithere");
    expect(fontForRun("Courier New", "مرحبا", true)).toBe("Tahoma");
    expect(looksVisuallyOrderedArabic("لماشلا يتوصلا مييقتلا جذومن")).toBe(true);
    expect(looksVisuallyOrderedArabic("نموذج التقييم الصوتي الشامل")).toBe(false);
    expect(reverseArabicRuns("لماشلا يتوصلا مييقتلا جذومن")).toBe("نموذج التقييم الصوتي الشامل");
    // Broken font: reversed Arabic + Canadian Aboriginal garbage + controls
    const broken =
      "لماشلا يتوصلا مييقتلا جذومن՚՞ᓤᓚ\u0003ᓘᓪᓪᓎᒎᓕՕ\u0003اشلا يتوصلا مييقتلا جذومن";
    const repaired = normalizePdfText(broken, "rtl");
    expect(repaired).toContain("نموذج");
    expect(repaired).toContain("الشامل");
    expect(repaired).not.toMatch(/[\u1400-\u167F\u0530-\u058F\u0000-\u0008]/);
  });

  it("does not reverse already-logical Arabic", () => {
    const logical = "نموذج التقييم الصوتي الشامل";
    expect(normalizePdfText(logical, "rtl")).toBe(logical);
  });

  it("keeps mixed English islands readable inside an Arabic line", () => {
    const page = layoutPage(
      595,
      842,
      [
        span({ text: "منصة", x: 320, y: 700, dir: "rtl", fontSize: 14, width: 50 }),
        span({ text: "(Personalized)", x: 200, y: 700, dir: "ltr", fontSize: 14, width: 100 }),
        span({ text: "عالم", x: 120, y: 700, dir: "rtl", fontSize: 14, width: 45 }),
      ],
      [],
    );
    const block = page.blocks[0];
    expect(block?.type).toBe("text");
    if (block?.type !== "text") return;
    const text = block.runs.map((run) => (run.kind === "text" ? run.text : "")).join("");
    expect(text).toContain("منصة");
    expect(text).toContain("(Personalized)");
    expect(text).toContain("عالم");
    expect(text.indexOf("منصة")).toBeLessThan(text.indexOf("(Personalized)"));
    expect(text.indexOf("(Personalized)")).toBeLessThan(text.indexOf("عالم"));
  });

  it("centers a short heading and keeps a larger font size", () => {
    const page = layoutPage(
      595,
      842,
      [
        span({ text: "Annual Report", x: 180, y: 760, fontSize: 28, bold: true, width: 220 }),
        span({ text: "Body copy that fills the column of this simple PDF.", x: 72, y: 700, fontSize: 12, width: 450 }),
      ],
      [],
    );
    const heading = page.blocks[0];
    expect(heading?.type).toBe("text");
    if (heading?.type !== "text") return;
    expect(heading.alignment).toBe("center");
    expect(heading.runs[0]?.kind === "text" && heading.runs[0].bold).toBe(true);
    expect(heading.runs[0]?.kind === "text" && heading.runs[0].fontSize).toBe(28);
  });

  it("places a block image between paragraphs by vertical position", () => {
    const page = layoutPage(
      595,
      842,
      [
        span({ text: "Intro", x: 72, y: 760, fontSize: 14, width: 80 }),
        span({ text: "After image", x: 72, y: 400, fontSize: 14, width: 120 }),
      ],
      [{ x: 72, y: 480, width: 200, height: 120 }],
    );
    expect(page.blocks.map((block) => block.type)).toEqual(["text", "image", "text"]);
    expect(page.imageCount).toBe(1);
    expect(countWords("one two three")).toBe(3);
  });

  it("uses a visual fallback when the page is effectively scanned", () => {
    const page = layoutPage(595, 842, [], [{ x: 0, y: 0, width: 595, height: 842 }]);
    expect(page.useVisualFallback).toBe(true);
    expect(previewTextFromLayouts([page])).toContain("visual copy");
  });

  it("names the Word download from the PDF filename", () => {
    expect(wordFileName("Report.PDF")).toBe("Report.docx");
    expect(wordFileName("")).toBe("document.docx");
  });
});

describe("docx packaging", () => {
  it("writes bold text and an image into a valid docx zip", async () => {
    const png = Uint8Array.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 207, 192, 4, 0, 1, 1, 1, 0, 24, 221, 141, 24, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ]);
    const blob = await buildDocxFromPages(
      [
        {
          layout: {
            widthPt: 595,
            heightPt: 842,
            margin: { top: 72, right: 72, bottom: 72, left: 72 },
            useVisualFallback: false,
            wordCount: 2,
            imageCount: 1,
            blocks: [
              {
                type: "text",
                alignment: "left",
                rtl: false,
                indentTwips: 0,
                firstLineTwips: 0,
                spaceBeforeTwips: 0,
                spaceAfterTwips: 0,
                lineTwips: 276,
                runs: [
                  {
                    kind: "text",
                    text: "Hello",
                    fontSize: 18,
                    fontFamily: "Times New Roman",
                    bold: true,
                    italic: false,
                    color: "111111",
                    rtl: false,
                  },
                ],
              },
              {
                type: "image",
                imageIndex: 0,
                spaceBeforeTwips: 120,
                widthPx: 120,
                heightPx: 80,
              },
            ],
          },
          images: [{ bytes: png, type: "png" }],
        },
      ],
      "Hello",
    );

    expect(blob.type).toContain("wordprocessingml");
    const buffer = new Uint8Array(await blob.arrayBuffer());
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    const unzipper = await import("jszip");
    const zip = await unzipper.default.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")?.async("string");
    expect(xml).toContain("Hello");
    expect(xml).toMatch(/<w:b\b/);
    expect(Object.keys(zip.files).some((name) => name.startsWith("word/media/"))).toBe(true);
  });

  it("strips illegal control characters so Word Mobile can open the file", async () => {
    const blob = await buildDocxFromPages(
      [
        {
          layout: {
            widthPt: 595,
            heightPt: 842,
            margin: { top: 72, right: 72, bottom: 72, left: 72 },
            useVisualFallback: false,
            wordCount: 1,
            imageCount: 0,
            blocks: [
              {
                type: "text",
                alignment: "right",
                rtl: true,
                indentTwips: 0,
                firstLineTwips: 0,
                spaceBeforeTwips: 0,
                spaceAfterTwips: 0,
                lineTwips: 276,
                runs: [
                  {
                    kind: "text",
                    text: "مرحبا\u0000\u0008بالعالم",
                    fontSize: 14,
                    fontFamily: "Tahoma",
                    bold: false,
                    italic: false,
                    color: "000000",
                    rtl: true,
                  },
                ],
              },
            ],
          },
          images: [],
        },
      ],
      "Arabic",
    );
    const unzipper = await import("jszip");
    const zip = await unzipper.default.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");
    expect(xml).toBeTruthy();
    expect(xml).toContain("مرحبا");
    expect(xml).toContain("بالعالم");
    expect(xml).not.toMatch(/\u0000|\u0008/);
    expect(xml).toMatch(/<w:rtl\s*\/>|<w:rtl\b/);
    expect(xml).toContain("ar-SA");
  });
});
