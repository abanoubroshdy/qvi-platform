export type PdfDir = "ltr" | "rtl";

export type PdfSpan = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  color: string;
  dir: PdfDir;
};

export type PdfImageRef = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextRunModel = {
  kind: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  color: string;
  rtl: boolean;
};

export type ImageRunModel = {
  kind: "image";
  imageIndex: number;
  widthPx: number;
  heightPx: number;
};

export type RunModel = TextRunModel | ImageRunModel;

export type TextBlock = {
  type: "text";
  alignment: "left" | "center" | "right" | "both";
  rtl: boolean;
  indentTwips: number;
  firstLineTwips: number;
  spaceBeforeTwips: number;
  spaceAfterTwips: number;
  lineTwips: number;
  runs: RunModel[];
};

export type ImageBlock = {
  type: "image";
  imageIndex: number;
  spaceBeforeTwips: number;
  widthPx: number;
  heightPx: number;
};

export type LayoutBlock = TextBlock | ImageBlock;

export type PageLayout = {
  widthPt: number;
  heightPt: number;
  margin: { top: number; right: number; bottom: number; left: number };
  blocks: LayoutBlock[];
  useVisualFallback: boolean;
  wordCount: number;
  imageCount: number;
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const HEBREW_RE = /[\u0590-\u05FF]/;
const LATIN_RE = /[A-Za-z]/;

const FAMILY_ALIASES: Array<[RegExp, string]> = [
  [/times/i, "Times New Roman"],
  [/helvetica/i, "Helvetica"],
  [/courier/i, "Courier New"],
  [/arial/i, "Arial"],
  [/calibri/i, "Calibri"],
  [/cambria/i, "Cambria"],
  [/georgia/i, "Georgia"],
  [/verdana/i, "Verdana"],
  [/tahoma/i, "Tahoma"],
  [/segoe/i, "Segoe UI"],
  [/garamond/i, "Garamond"],
  [/palatino/i, "Palatino Linotype"],
  [/symbol/i, "Symbol"],
  [/wingdings?/i, "Wingdings"],
  [/comic/i, "Comic Sans MS"],
  [/trebuchet/i, "Trebuchet MS"],
  [/naskh|traditional.?arabic|simplified.?arabic/i, "Arial"],
  [/noto\s*sans/i, "Noto Sans"],
  [/noto\s*serif/i, "Noto Serif"],
  [/roboto/i, "Roboto"],
  [/dejavu/i, "Arial"],
];

export function pointsToTwips(points: number) {
  return Math.max(0, Math.round(points * 20));
}

export function pointsToPx(points: number) {
  return Math.max(1, Math.round((points * 96) / 72));
}

export function pointsToHalfPoints(points: number) {
  return Math.max(8, Math.min(144, Math.round(points * 2)));
}

export function rgbToHex(r: number, g: number, b: number) {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return [clamp(r), clamp(g), clamp(b)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function cmykToHex(c: number, m: number, y: number, k: number) {
  const toRgb = (channel: number) => 255 * (1 - channel) * (1 - k);
  return rgbToHex(toRgb(c), toRgb(m), toRgb(y));
}

export function grayToHex(gray: number) {
  const value = gray * 255;
  return rgbToHex(value, value, value);
}

export function isRtlText(text: string) {
  let rtl = 0;
  let ltr = 0;
  for (const char of text) {
    if (ARABIC_RE.test(char) || HEBREW_RE.test(char)) rtl += 1;
    else if (LATIN_RE.test(char)) ltr += 1;
  }
  return rtl > 0 && rtl >= ltr;
}

export function parsePdfFont(fontName: string): { family: string; bold: boolean; italic: boolean } {
  const cleaned = fontName.replace(/^[A-Z0-9]{4,}\+/, "").replace(/^g_[a-z0-9]+_/i, "");
  const lower = cleaned.toLowerCase();
  const bold = /(bold|black|heavy|semibold|demibold|extrabold|ultra|fw[_-]?7|fw[_-]?8|fw[_-]?9)/i.test(lower);
  const italic = /(italic|oblique)/i.test(lower);
  const family = cleaned
    .replace(/[-_,]?(Bold|Italic|Oblique|Regular|Medium|Light|Black|Heavy|SemiBold|DemiBold|ExtraBold|Ultra|Roman|MT|PS|W[0-9]+|BoldMT|ItalicMT)+/gi, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, mapped] of FAMILY_ALIASES) {
    if (pattern.test(cleaned) || pattern.test(family)) {
      return { family: mapped, bold, italic };
    }
  }

  if (!family || /^f\d+$/i.test(family) || family.length < 2) {
    return { family: "Arial", bold, italic };
  }

  return { family, bold, italic };
}

export function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function fontSizeFromTransform(transform: number[]) {
  const a = transform[0] ?? 0;
  const b = transform[1] ?? 0;
  const scale = Math.hypot(a, b);
  if (scale > 0.5) return scale;
  const d = Math.abs(transform[3] ?? 0);
  return d > 0.5 ? d : 12;
}

type Line = {
  baseline: number;
  x: number;
  width: number;
  fontSize: number;
  rtl: boolean;
  items: Array<{ kind: "text"; span: PdfSpan } | { kind: "image"; imageIndex: number; x: number; width: number; height: number }>;
};

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const left = sorted[mid - 1] ?? sorted[mid] ?? 0;
  const right = sorted[mid] ?? left;
  return sorted.length % 2 === 0 ? (left + right) / 2 : right;
}

function sameStyle(a: PdfSpan, b: PdfSpan) {
  return (
    a.fontFamily === b.fontFamily &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.color === b.color &&
    Math.abs(a.fontSize - b.fontSize) < 0.35 &&
    a.dir === b.dir
  );
}

function insertGapText(prev: PdfSpan, next: PdfSpan) {
  const gap = next.x - (prev.x + prev.width);
  if (gap <= Math.max(0.12 * prev.fontSize, 0.4)) return "";
  if (/\s$/.test(prev.text) || /^\s/.test(next.text)) return "";
  if (gap > Math.max(24, prev.fontSize * 1.8)) return "\t";
  const spaces = Math.max(1, Math.min(6, Math.round(gap / Math.max(prev.fontSize * 0.38, 2))));
  return " ".repeat(spaces);
}

function lineAlignment(line: Line, pageWidth: number, marginLeft: number, marginRight: number): TextBlock["alignment"] {
  const contentWidth = Math.max(1, pageWidth - marginLeft - marginRight);
  const leftGap = line.x - marginLeft;
  const rightGap = pageWidth - marginRight - (line.x + line.width);
  if (Math.abs(leftGap - rightGap) < 16 && line.width < contentWidth * 0.78 && Math.min(leftGap, rightGap) > 18) {
    return "center";
  }
  if (line.rtl) {
    if (rightGap < 10 && leftGap > 28) return "right";
    return "right";
  }
  if (leftGap < 10 && rightGap > 36) return "left";
  if (rightGap < 10 && leftGap > 36) return "right";
  return line.rtl ? "right" : "left";
}

function isFullPageBackground(image: PdfImageRef, pageWidth: number, pageHeight: number) {
  const area = image.width * image.height;
  const pageArea = pageWidth * pageHeight;
  return area / pageArea > 0.82 && image.width > pageWidth * 0.88 && image.height > pageHeight * 0.88;
}

function yTopForSpan(span: PdfSpan, pageHeight: number) {
  return pageHeight - span.y - span.fontSize * 0.85;
}

function yTopForImage(image: PdfImageRef, pageHeight: number) {
  return pageHeight - image.y - image.height;
}

export function groupSpansIntoLines(spans: PdfSpan[]): Line[] {
  const usable = spans.filter((span) => span.text.replace(/\s+/g, "").length > 0);
  const sorted = [...usable].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];

  for (const span of sorted) {
    const last = lines[lines.length - 1];
    const tolerance = Math.max(2.2, (last?.fontSize ?? span.fontSize) * 0.34);
    if (last && Math.abs(last.baseline - span.y) <= tolerance) {
      last.items.push({ kind: "text", span });
      last.fontSize = Math.max(last.fontSize, span.fontSize);
      continue;
    }
    lines.push({
      baseline: span.y,
      x: span.x,
      width: span.width,
      fontSize: span.fontSize,
      rtl: span.dir === "rtl" || isRtlText(span.text),
      items: [{ kind: "text", span }],
    });
  }

  for (const line of lines) {
    const text = line.items
      .filter((item): item is { kind: "text"; span: PdfSpan } => item.kind === "text")
      .map((item) => item.span);
    line.rtl = isRtlText(text.map((span) => span.text).join("")) || text.filter((span) => span.dir === "rtl").length > text.length / 2;
    text.sort((a, b) => (line.rtl ? b.x - a.x : a.x - b.x));
    line.items = text.map((span) => ({ kind: "text" as const, span }));
    const first = text[0];
    const last = text[text.length - 1];
    if (!first || !last) continue;
    line.x = Math.min(...text.map((span) => span.x));
    const right = Math.max(...text.map((span) => span.x + span.width));
    line.width = right - line.x;
  }

  return lines;
}

function attachInlineImages(lines: Line[], images: Array<PdfImageRef & { index: number }>, pageHeight: number) {
  const remaining: Array<PdfImageRef & { index: number }> = [];

  for (const image of images) {
    const imageTop = yTopForImage(image, pageHeight);
    const imageBottom = imageTop + image.height;
    const host = lines.find((line) => {
      const top = pageHeight - line.baseline - line.fontSize * 0.85;
      const bottom = top + line.fontSize * 1.35;
      const overlap = Math.min(bottom, imageBottom) - Math.max(top, imageTop);
      return overlap > image.height * 0.35 && image.height <= line.fontSize * 2.4 && image.height < 42;
    });
    if (!host) {
      remaining.push(image);
      continue;
    }
    host.items.push({ kind: "image", imageIndex: image.index, x: image.x, width: image.width, height: image.height });
    host.items.sort((a, b) => {
      const ax = a.kind === "text" ? a.span.x : a.x;
      const bx = b.kind === "text" ? b.span.x : b.x;
      return host.rtl ? bx - ax : ax - bx;
    });
  }

  return remaining;
}

function lineRuns(line: Line): RunModel[] {
  const runs: RunModel[] = [];
  let previousSpan: PdfSpan | null = null;

  for (const item of line.items) {
    if (item.kind === "image") {
      previousSpan = null;
      runs.push({
        kind: "image",
        imageIndex: item.imageIndex,
        widthPx: pointsToPx(item.width),
        heightPx: pointsToPx(item.height),
      });
      continue;
    }

    const span = item.span;
    const gap = previousSpan ? insertGapText(previousSpan, span) : "";
    if (gap && runs.length) {
      const last = runs[runs.length - 1];
      if (last?.kind === "text") last.text += gap;
      else runs.push({ kind: "text", text: gap, fontSize: span.fontSize, fontFamily: span.fontFamily, bold: false, italic: false, color: span.color, rtl: line.rtl });
    }

    const last = runs[runs.length - 1];
    if (last?.kind === "text" && previousSpan && sameStyle(previousSpan, span)) {
      last.text += span.text;
    } else {
      runs.push({
        kind: "text",
        text: span.text,
        fontSize: span.fontSize,
        fontFamily: span.fontFamily,
        bold: span.bold,
        italic: span.italic,
        color: span.color,
        rtl: span.dir === "rtl" || isRtlText(span.text) || line.rtl,
      });
    }
    previousSpan = span;
  }

  return runs.filter((run) => run.kind === "image" || run.text.length > 0);
}

function linesBelongTogether(current: Line, next: Line) {
  const gap = current.baseline - next.baseline;
  if (gap > current.fontSize * 1.7) return false;
  if (Math.abs(current.fontSize - next.fontSize) / Math.max(current.fontSize, next.fontSize) > 0.22) return false;
  if (current.rtl !== next.rtl) return false;
  if (Math.abs(current.x - next.x) > Math.max(22, current.fontSize * 2.4)) return false;
  return gap <= current.fontSize * 1.55;
}

function isJustified(lines: Line[], pageWidth: number, marginLeft: number, marginRight: number) {
  if (lines.length < 2) return false;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const body = lines.slice(0, -1);
  return body.every((line) => {
    const leftGap = Math.abs(line.x - marginLeft);
    const right = line.x + line.width;
    const rightGap = Math.abs(pageWidth - marginRight - right);
    return leftGap < 10 && rightGap < 14 && line.width > contentWidth * 0.86;
  });
}

export function layoutPage(
  pageWidth: number,
  pageHeight: number,
  spans: PdfSpan[],
  images: PdfImageRef[],
  options?: { forceVisual?: boolean; forceEditable?: boolean },
): PageLayout {
  const textChars = spans.reduce((sum, span) => sum + span.text.replace(/\s+/g, "").length, 0);
  const contentImages = images
    .map((image, index) => ({ ...image, index }))
    .filter((image) => image.width >= 4 && image.height >= 4 && image.width * image.height >= 24);

  const foreground = contentImages.filter((image) => !isFullPageBackground(image, pageWidth, pageHeight));
  const pageArea = Math.max(1, pageWidth * pageHeight);
  const largeVisual = contentImages.some((image) => image.width * image.height > pageArea * 0.45);
  const scanned = textChars < 8 && largeVisual;
  const useVisualFallback = Boolean(options?.forceVisual) || (scanned && !options?.forceEditable);

  if (useVisualFallback) {
    return {
      widthPt: pageWidth,
      heightPt: pageHeight,
      margin: { top: 36, right: 36, bottom: 36, left: 36 },
      blocks: [],
      useVisualFallback: true,
      wordCount: countWords(spans.map((span) => span.text).join(" ")),
      imageCount: 1,
    };
  }

  const lines = groupSpansIntoLines(spans);
  const blockImages = attachInlineImages(lines, foreground, pageHeight);

  const xs = [
    ...spans.map((span) => span.x),
    ...blockImages.map((image) => image.x),
    ...lines.map((line) => line.x),
  ];
  const rights = [
    ...spans.map((span) => span.x + span.width),
    ...blockImages.map((image) => image.x + image.width),
    ...lines.map((line) => line.x + line.width),
  ];
  const tops = [
    ...spans.map((span) => yTopForSpan(span, pageHeight)),
    ...blockImages.map((image) => yTopForImage(image, pageHeight)),
  ];
  const bottoms = [
    ...spans.map((span) => yTopForSpan(span, pageHeight) + span.fontSize),
    ...blockImages.map((image) => yTopForImage(image, pageHeight) + image.height),
  ];

  const rawLeft = xs.length ? Math.min(...xs) : 72;
  const rawRight = rights.length ? pageWidth - Math.max(...rights) : 72;
  const rawTop = tops.length ? Math.min(...tops) : 72;
  const rawBottom = bottoms.length ? pageHeight - Math.max(...bottoms) : 72;
  const margin = {
    left: Math.max(18, Math.min(96, rawLeft)),
    right: Math.max(18, Math.min(96, rawRight)),
    top: Math.max(18, Math.min(96, rawTop)),
    bottom: Math.max(18, Math.min(96, rawBottom)),
  };

  type Flow =
    | { kind: "line"; yTop: number; line: Line }
    | { kind: "image"; yTop: number; image: PdfImageRef & { index: number } };

  const flow: Flow[] = [
    ...lines.map((line) => ({
      kind: "line" as const,
      yTop: pageHeight - line.baseline - line.fontSize * 0.85,
      line,
    })),
    ...blockImages.map((image) => ({
      kind: "image" as const,
      yTop: yTopForImage(image, pageHeight),
      image,
    })),
  ].sort((a, b) => a.yTop - b.yTop || (a.kind === "image" ? -1 : 1));

  const blocks: LayoutBlock[] = [];
  let previousBottom = margin.top;
  let paragraphLines: Line[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const first = paragraphLines[0];
    const last = paragraphLines[paragraphLines.length - 1];
    if (!first || !last) {
      paragraphLines = [];
      return;
    }

    const alignmentGuess = lineAlignment(first, pageWidth, margin.left, margin.right);
    const justified = alignmentGuess !== "center" && isJustified(paragraphLines, pageWidth, margin.left, margin.right);
    const alignment = justified ? "both" : alignmentGuess;
    const rtl = paragraphLines.filter((line) => line.rtl).length >= paragraphLines.length / 2;
    const fontSize = median(paragraphLines.map((line) => line.fontSize)) || first.fontSize;
    const firstTop = pageHeight - first.baseline - first.fontSize * 0.85;
    const spaceBefore = Math.max(0, firstTop - previousBottom);
    const indent = Math.max(0, first.x - margin.left);
    const bodyIndent = median(paragraphLines.map((line) => Math.max(0, line.x - margin.left)));
    const firstLine = Math.max(0, indent - bodyIndent);

    const runs: RunModel[] = [];
    paragraphLines.forEach((line, index) => {
      if (index > 0) {
        const prev = runs[runs.length - 1];
        if (prev?.kind === "text") prev.text += " ";
        else runs.push({ kind: "text", text: " ", fontSize: line.fontSize, fontFamily: "Arial", bold: false, italic: false, color: "000000", rtl });
      }
      runs.push(...lineRuns(line));
    });

    blocks.push({
      type: "text",
      alignment: rtl && alignment === "left" ? "right" : alignment,
      rtl,
      indentTwips: pointsToTwips(bodyIndent),
      firstLineTwips: pointsToTwips(firstLine),
      spaceBeforeTwips: Math.min(1440, pointsToTwips(spaceBefore)),
      spaceAfterTwips: 0,
      lineTwips: Math.max(240, pointsToTwips(fontSize * 1.18)),
      runs,
    });

    previousBottom = pageHeight - last.baseline + last.fontSize * 0.25;
    paragraphLines = [];
  };

  for (const item of flow) {
    if (item.kind === "image") {
      flushParagraph();
      const spaceBefore = Math.max(0, item.yTop - previousBottom);
      blocks.push({
        type: "image",
        imageIndex: item.image.index,
        spaceBeforeTwips: Math.min(1440, pointsToTwips(spaceBefore)),
        widthPx: pointsToPx(item.image.width),
        heightPx: pointsToPx(item.image.height),
      });
      previousBottom = item.yTop + item.image.height;
      continue;
    }

    const last = paragraphLines[paragraphLines.length - 1];
    if (last && !linesBelongTogether(last, item.line)) flushParagraph();
    paragraphLines.push(item.line);
  }
  flushParagraph();

  const wordCount = countWords(
    spans
      .map((span) => span.text)
      .join(" ")
      .replace(/\t/g, " "),
  );

  return {
    widthPt: pageWidth,
    heightPt: pageHeight,
    margin,
    blocks,
    useVisualFallback: false,
    wordCount,
    imageCount: blockImages.length + lines.reduce((sum, line) => sum + line.items.filter((item) => item.kind === "image").length, 0),
  };
}

export function previewTextFromLayouts(pages: PageLayout[]) {
  return pages
    .map((page, pageIndex) => {
      if (page.useVisualFallback) return `[Page ${pageIndex + 1} visual copy]`;
      return page.blocks
        .map((block) => {
          if (block.type === "image") return `[image ${block.imageIndex + 1}]`;
          return block.runs.map((run) => (run.kind === "text" ? run.text : `[image ${run.imageIndex + 1}]`)).join("");
        })
        .join("\n");
    })
    .join("\n\n")
    .trim();
}
