import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  LineRuleType,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  type PageLayout,
  type PdfImageRef,
  type PdfSpan,
  type RunModel,
  type PdfDir,
  type TableBlock,
  cmykToHex,
  fontSizeFromTransform,
  grayToHex,
  isRtlText,
  layoutPage,
  normalizePdfText,
  parsePdfFont,
  pointsToHalfPoints,
  pointsToPx,
  pointsToTwips,
  previewTextFromLayouts,
  rgbToHex,
  sanitizeXmlText,
} from "@/lib/pdf-to-word-layout";

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ConvertMode = "auto" | "editable" | "visual" | "hybrid";

export type ConvertedImage = {
  bytes: Uint8Array;
  type: "png" | "jpg" | "gif" | "bmp";
};

export type PdfToWordResult = {
  blob: Blob;
  pages: number;
  words: number;
  images: number;
  visualPages: number;
  /** Pages that kept editable text and also attached a visual reference (Phase 4). */
  hybridPages: number;
  preview: string;
  /** True when preview content is predominantly Arabic/Hebrew — UI should force RTL. */
  rtlPreview: boolean;
};

type PdfJsModule = typeof import("pdfjs-dist");
type PdfPage = Awaited<ReturnType<Awaited<ReturnType<PdfJsModule["getDocument"]>["promise"]>["getPage"]>>;

const MAX_PAGE_PT = 22 * 72;
const WORKER_SRC = "/pdf.worker.min.mjs";
const CMAP_URL = "/pdfjs/cmaps/";
const STANDARD_FONT_URL = "/pdfjs/standard_fonts/";

function multiply(a: number[], b: number[]) {
  return [
    a[0]! * b[0]! + a[2]! * b[1]!,
    a[1]! * b[0]! + a[3]! * b[1]!,
    a[0]! * b[2]! + a[2]! * b[3]!,
    a[1]! * b[2]! + a[3]! * b[3]!,
    a[0]! * b[4]! + a[2]! * b[5]! + a[4]!,
    a[1]! * b[4]! + a[3]! * b[5]! + a[5]!,
  ];
}

function identity() {
  return [1, 0, 0, 1, 0, 0];
}

function hexFromFill(color: number[] | undefined, fallback = "000000") {
  if (!color?.length) return fallback;
  if (color.length === 1) return grayToHex(color[0] ?? 0);
  if (color.length === 3) return rgbToHex((color[0] ?? 0) * 255, (color[1] ?? 0) * 255, (color[2] ?? 0) * 255);
  if (color.length >= 4) return cmykToHex(color[0] ?? 0, color[1] ?? 0, color[2] ?? 0, color[3] ?? 0);
  return fallback;
}

function nearestColor(x: number, y: number, samples: Array<{ x: number; y: number; color: string }>, fallback: string) {
  let best = fallback;
  let bestDist = 14;
  for (const sample of samples) {
    const dist = Math.hypot(sample.x - x, sample.y - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = sample.color;
    }
  }
  return best;
}

function getObj<T>(objs: { get: (id: string, callback?: (value: T) => void) => T | undefined }, id: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("image-timeout")), 12000);
    try {
      const value = objs.get(id, (resolved) => {
        window.clearTimeout(timer);
        resolve(resolved);
      });
      if (value) {
        window.clearTimeout(timer);
        resolve(value);
      }
    } catch (error) {
      window.clearTimeout(timer);
      reject(error);
    }
  });
}

function unpackGray1Bpp(src: Uint8Array, width: number, height: number) {
  const dest = new Uint8ClampedArray(width * height * 4);
  const rowBytes = (width + 7) >> 3;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const byte = src[y * rowBytes + (x >> 3)] ?? 0;
      const bit = (byte >> (7 - (x & 7))) & 1;
      const value = bit ? 0 : 255;
      const index = (y * width + x) * 4;
      dest[index] = value;
      dest[index + 1] = value;
      dest[index + 2] = value;
      dest[index + 3] = 255;
    }
  }
  return dest;
}

function rgbToRgba(src: Uint8Array, width: number, height: number) {
  const dest = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, j = 0; i < src.length && j < dest.length; i += 3, j += 4) {
    dest[j] = src[i] ?? 0;
    dest[j + 1] = src[i + 1] ?? 0;
    dest[j + 2] = src[i + 2] ?? 0;
    dest[j + 3] = 255;
  }
  return dest;
}

async function canvasPng(draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void | Promise<void>) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("no-context");
  await draw(ctx, canvas);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("png"))), "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function pixelsToPng(width: number, height: number, rgba: Uint8ClampedArray) {
  return canvasPng((ctx, canvas) => {
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    imageData.data.set(rgba);
    ctx.putImageData(imageData, 0, 0);
  });
}

type PdfImageObject = {
  width?: number;
  height?: number;
  kind?: number;
  data?: Uint8Array | Uint8ClampedArray | ArrayBuffer;
  bitmap?: CanvasImageSource;
};

async function pdfImageToPng(image: PdfImageObject): Promise<ConvertedImage | null> {
  if (image.bitmap) {
    const bytes = await canvasPng((ctx, canvas) => {
      const source = image.bitmap as CanvasImageSource;
      const width = "width" in source && typeof source.width === "number" ? source.width : image.width ?? 1;
      const height = "height" in source && typeof source.height === "number" ? source.height : image.height ?? 1;
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    });
    return { bytes, type: "png" };
  }

  const width = Math.max(1, Math.floor(image.width ?? 0));
  const height = Math.max(1, Math.floor(image.height ?? 0));
  if (!image.data || !width || !height) return null;
  const data = image.data instanceof ArrayBuffer ? new Uint8Array(image.data) : new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength);

  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { bytes: data.slice(), type: "jpg" };
  }

  let rgba: Uint8ClampedArray;
  if (image.kind === 3 || data.length === width * height * 4) {
    rgba = new Uint8ClampedArray(data);
  } else if (image.kind === 2 || data.length === width * height * 3) {
    rgba = rgbToRgba(data, width, height);
  } else if (image.kind === 1) {
    rgba = unpackGray1Bpp(data, width, height);
  } else if (data.length === width * height) {
    rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; i < data.length; i += 1, j += 4) {
      const value = data[i] ?? 0;
      rgba[j] = value;
      rgba[j + 1] = value;
      rgba[j + 2] = value;
      rgba[j + 3] = 255;
    }
  } else {
    return null;
  }

  return { bytes: await pixelsToPng(width, height, rgba), type: "png" };
}

async function extractGraphics(pdfjs: PdfJsModule, page: PdfPage, view: number[]) {
  const ops = await page.getOperatorList();
  const images: Array<PdfImageRef & { converted?: ConvertedImage | null; name?: string }> = [];
  const colors: Array<{ x: number; y: number; color: string }> = [];
  const stack: number[][] = [];
  let ctm = identity();
  let fill: number[] = [0, 0, 0];
  let textMatrix = identity();
  let textLineMatrix = identity();
  const xMin = view[0] ?? 0;
  const yMin = view[1] ?? 0;

  const paintImage = async (name: unknown, inline?: PdfImageObject) => {
    const widthVecX = ctm[0] ?? 0;
    const widthVecY = ctm[1] ?? 0;
    const heightVecX = ctm[2] ?? 0;
    const heightVecY = ctm[3] ?? 0;
    const originX = ctm[4] ?? 0;
    const originY = ctm[5] ?? 0;
    const xs = [originX, originX + widthVecX, originX + heightVecX, originX + widthVecX + heightVecX];
    const ys = [originY, originY + widthVecY, originY + heightVecY, originY + widthVecY + heightVecY];
    const x = Math.min(...xs) - xMin;
    const y = Math.min(...ys) - yMin;
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    if (!(width > 1 && height > 1)) return;

    let converted: ConvertedImage | null = null;
    try {
      if (inline) converted = await pdfImageToPng(inline);
      else if (typeof name === "string") {
        const obj = await getObj<PdfImageObject>(page.objs, name);
        converted = await pdfImageToPng(obj);
      }
    } catch {
      converted = null;
    }
    images.push({ x, y, width, height, converted, name: typeof name === "string" ? name : undefined });
  };

  const recordText = () => {
    const combined = multiply(ctm, textMatrix);
    colors.push({
      x: (combined[4] ?? 0) - xMin,
      y: (combined[5] ?? 0) - yMin,
      color: hexFromFill(fill),
    });
  };

  for (let index = 0; index < ops.fnArray.length; index += 1) {
    const fn = ops.fnArray[index];
    const args = (ops.argsArray[index] ?? []) as unknown[];
    if (fn === pdfjs.OPS.save) {
      stack.push(ctm.slice());
    } else if (fn === pdfjs.OPS.restore) {
      ctm = stack.pop() ?? identity();
    } else if (fn === pdfjs.OPS.transform && args.length >= 6) {
      ctm = multiply(ctm, args as number[]);
    } else if (fn === pdfjs.OPS.setFillRGBColor || fn === pdfjs.OPS.setFillGray || fn === pdfjs.OPS.setFillCMYKColor || fn === pdfjs.OPS.setFillColor) {
      fill = args as number[];
    } else if (fn === pdfjs.OPS.setTextMatrix && args.length >= 6) {
      textMatrix = args as number[];
      textLineMatrix = textMatrix.slice();
    } else if (fn === pdfjs.OPS.moveText && args.length >= 2) {
      textLineMatrix = multiply(textLineMatrix, [1, 0, 0, 1, args[0] as number, args[1] as number]);
      textMatrix = textLineMatrix.slice();
    } else if (fn === pdfjs.OPS.nextLine) {
      textLineMatrix = multiply(textLineMatrix, [1, 0, 0, 1, 0, -1]);
      textMatrix = textLineMatrix.slice();
    } else if (fn === pdfjs.OPS.showText || fn === pdfjs.OPS.showSpacedText) {
      recordText();
    } else if (fn === pdfjs.OPS.nextLineShowText) {
      textLineMatrix = multiply(textLineMatrix, [1, 0, 0, 1, 0, -1]);
      textMatrix = textLineMatrix.slice();
      recordText();
    } else if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintImageXObjectRepeat) {
      await paintImage(args[0]);
    } else if (fn === pdfjs.OPS.paintInlineImageXObject) {
      await paintImage(undefined, args[0] as PdfImageObject);
    }
  }

  return { images, colors };
}

function spansFromTextContent(
  items: Array<{ str?: string; dir?: string; transform?: number[]; width?: number; height?: number; fontName?: string; hasEOL?: boolean }>,
  styles: Record<string, { fontFamily?: string }>,
  colors: Array<{ x: number; y: number; color: string }>,
  view: number[],
  fontNames: Map<string, string>,
): PdfSpan[] {
  const xMin = view[0] ?? 0;
  const yMin = view[1] ?? 0;
  const spans: PdfSpan[] = [];

  for (const item of items) {
    const raw = item.str ?? "";
    const hintedDir: PdfDir = item.dir === "rtl" || isRtlText(raw) ? "rtl" : "ltr";
    const text = normalizePdfText(raw, hintedDir);
    if (!text.replace(/\s+/g, "").length) continue;
    const transform = item.transform ?? [1, 0, 0, 1, 0, 0];
    const fontSize = fontSizeFromTransform(transform);
    const fontName = fontNames.get(item.fontName ?? "") ?? item.fontName ?? styles[item.fontName ?? ""]?.fontFamily ?? "Arial";
    const parsed = parsePdfFont(fontName);
    const x = (transform[4] ?? 0) - xMin;
    const y = (transform[5] ?? 0) - yMin;
    const dir: PdfDir = hintedDir === "rtl" || isRtlText(text) ? "rtl" : "ltr";
    spans.push({
      text,
      x,
      y,
      width: item.width ?? fontSize * text.length * 0.5,
      height: item.height ?? fontSize,
      fontSize,
      fontFamily: parsed.family,
      bold: parsed.bold,
      italic: parsed.italic,
      color: nearestColor(x, y, colors, "000000"),
      dir,
    });
  }

  return spans;
}

function alignmentOf(block: Extract<LayoutBlock, { type: "text" }>) {
  if (block.alignment === "center") return AlignmentType.CENTER;
  if (block.alignment === "right") return AlignmentType.RIGHT;
  if (block.alignment === "both") return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function imageRun(image: ConvertedImage, widthPx: number, heightPx: number) {
  const max = 1280;
  const scale = Math.min(1, max / Math.max(widthPx, heightPx));
  return new ImageRun({
    type: image.type,
    data: image.bytes,
    transformation: {
      width: Math.max(1, Math.round(widthPx * scale)),
      height: Math.max(1, Math.round(heightPx * scale)),
    },
    altText: { title: "PDF image", description: "Image extracted from PDF", name: "PDF image" },
  });
}

function runsToChildren(runs: RunModel[], images: Array<ConvertedImage | null>) {
  const children: Array<ImageRun | TextRun> = [];
  for (const run of runs) {
    if (run.kind === "image") {
      const image = images[run.imageIndex];
      if (image) children.push(imageRun(image, run.widthPx, run.heightPx));
      continue;
    }
    const half = pointsToHalfPoints(run.fontSize);
    const text = sanitizeXmlText(run.text);
    if (!text.length) continue;
    children.push(
      new TextRun({
        text,
        bold: run.bold,
        boldComplexScript: run.bold,
        italics: run.italic,
        italicsComplexScript: run.italic,
        size: half,
        sizeComplexScript: half,
        font: {
          ascii: run.fontFamily,
          hAnsi: run.fontFamily,
          cs: run.fontFamily,
          eastAsia: run.fontFamily,
        },
        color: run.color,
        rightToLeft: run.rtl,
        language: run.rtl ? { value: "ar-SA", bidirectional: "ar-SA" } : { value: "en-US" },
      }),
    );
  }
  return children;
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function tableBlockToDocx(block: TableBlock, images: Array<ConvertedImage | null>, contentWidthTwips: number) {
  const colCount = Math.max(1, ...block.rows.map((row) => row.length));
  const colWidth = Math.max(200, Math.floor(contentWidthTwips / colCount));
  return new Table({
    width: { size: contentWidthTwips, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: Array.from({ length: colCount }, () => colWidth),
    rows: block.rows.map(
      (row) =>
        new TableRow({
          children: Array.from({ length: colCount }, (_, index) => {
            const cell = row[index];
            return new TableCell({
              borders: block.borders ? undefined : NO_BORDERS,
              width: { size: colWidth, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment:
                    cell?.alignment === "center"
                      ? AlignmentType.CENTER
                      : cell?.alignment === "right" || cell?.rtl
                        ? AlignmentType.RIGHT
                        : AlignmentType.LEFT,
                  bidirectional: cell?.rtl,
                  children: cell ? runsToChildren(cell.runs, images) : [],
                }),
              ],
            });
          }),
        }),
    ),
  });
}

export async function buildDocxFromPages(
  pages: Array<{ layout: PageLayout; images: Array<ConvertedImage | null>; visual?: ConvertedImage | null }>,
  title: string,
): Promise<Blob> {
  const sections = pages.map(({ layout, images, visual }) => {
    const width = Math.min(MAX_PAGE_PT, Math.max(300, layout.widthPt));
    const height = Math.min(MAX_PAGE_PT, Math.max(300, layout.heightPt));
    const children: Array<Paragraph | Table> = [];
    const contentWidthTwips = pointsToTwips(width - layout.margin.left - layout.margin.right);

    if (layout.useVisualFallback && visual) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            imageRun(
              visual,
              pointsToPx(width - layout.margin.left - layout.margin.right),
              pointsToPx(height - layout.margin.top - layout.margin.bottom),
            ),
          ],
        }),
      );
    } else {
      for (const block of layout.blocks) {
        if (block.type === "image") {
          const image = images[block.imageIndex];
          if (!image) continue;
          children.push(
            new Paragraph({
              spacing: { before: block.spaceBeforeTwips, after: 80 },
              children: [imageRun(image, block.widthPx, block.heightPx)],
            }),
          );
          continue;
        }
        if (block.type === "table") {
          if (block.spaceBeforeTwips > 0) {
            children.push(
              new Paragraph({
                spacing: { before: block.spaceBeforeTwips, after: 0 },
                children: [],
              }),
            );
          }
          children.push(tableBlockToDocx(block, images, contentWidthTwips));
          continue;
        }
        children.push(
          new Paragraph({
            alignment: alignmentOf(block),
            bidirectional: block.rtl,
            indent: {
              left: block.indentTwips,
              firstLine: block.firstLineTwips,
            },
            spacing: {
              before: block.spaceBeforeTwips,
              after: block.spaceAfterTwips,
              line: block.lineTwips,
              lineRule: LineRuleType.AT_LEAST,
            },
            children: runsToChildren(block.runs, images),
          }),
        );
      }

      // Phase 4 — editable content + scaled page preview for verification.
      if (layout.includeVisualReference && visual) {
        const rtlPage = layout.blocks.some((block) => block.type === "text" && block.rtl);
        children.push(
          new Paragraph({
            spacing: { before: 240, after: 80 },
            bidirectional: rtlPage,
            children: [
              new TextRun({
                text: rtlPage ? "مرجع بصري (الصفحة الأصلية)" : "Visual reference (original page)",
                italics: true,
                size: 18,
                color: "666666",
                rightToLeft: rtlPage,
                language: rtlPage ? { value: "ar-SA", bidirectional: "ar-SA" } : { value: "en-US" },
              }),
            ],
          }),
        );
        const previewWidthPx = pointsToPx(width - layout.margin.left - layout.margin.right);
        const previewHeightPx = Math.max(
          120,
          Math.round(previewWidthPx * ((height - layout.margin.top - layout.margin.bottom) / Math.max(1, width - layout.margin.left - layout.margin.right))),
        );
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [imageRun(visual, previewWidthPx, previewHeightPx)],
          }),
        );
      }
    }

    if (!children.length) {
      children.push(new Paragraph({ text: "" }));
    }

    return {
      properties: {
        page: {
          size: {
            width: pointsToTwips(width),
            height: pointsToTwips(height),
          },
          margin: {
            top: pointsToTwips(layout.margin.top),
            right: pointsToTwips(layout.margin.right),
            bottom: pointsToTwips(layout.margin.bottom),
            left: pointsToTwips(layout.margin.left),
          },
        },
      },
      children,
    };
  });

  const document = new Document({
    title,
    creator: "QVI PDF to Word",
    description: "Converted locally in the browser. The file was never uploaded.",
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 22,
          },
        },
      },
    },
    sections,
  });

  const blob = await Packer.toBlob(document);
  return new Blob([blob], { type: DOCX_MIME });
}

async function renderPagePng(page: PdfPage, scale = 2): Promise<ConvertedImage> {
  const viewport = page.getViewport({ scale });
  const bytes = await canvasPng(async (ctx, canvas) => {
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
  });
  return { bytes, type: "png" };
}

async function originalFontNames(page: PdfPage, fontIds: string[]) {
  const names = new Map<string, string>();
  for (const id of fontIds) {
    try {
      const font = page.commonObjs.get(id) as { name?: string } | undefined;
      if (font?.name) names.set(id, font.name);
    } catch {
      // Fonts may still be loading; parsed names from the text item remain usable.
    }
  }
  return names;
}

export async function convertPdfToWord(
  file: File,
  options?: { mode?: ConvertMode; onProgress?: (ratio: number) => void },
): Promise<PdfToWordResult> {
  const mode = options?.mode ?? "auto";
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;

  options?.onProgress?.(0.02);
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: STANDARD_FONT_URL,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  options?.onProgress?.(0.08);

  const built: Array<{ layout: PageLayout; images: Array<ConvertedImage | null>; visual?: ConvertedImage | null }> = [];
  let words = 0;
  let imageCount = 0;
  let visualPages = 0;
  let hybridPages = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const view = page.view;
    const text = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false });
    const fontIds = Array.from(
      new Set(text.items.map((item) => ("fontName" in item ? item.fontName : "")).filter(Boolean)),
    );
    const fonts = await originalFontNames(page, fontIds);
    const { images: rawImages, colors } = await extractGraphics(pdfjs, page, view);
    const textItems = text.items.filter((item): item is (typeof text.items)[number] & { str: string } => "str" in item);
    const spans = spansFromTextContent(textItems, text.styles, colors, view, fonts);
    const imageRefs: PdfImageRef[] = rawImages.map(({ x, y, width, height }) => ({ x, y, width, height }));
    const layout = layoutPage(viewport.width, viewport.height, spans, imageRefs, {
      forceVisual: mode === "visual",
      forceEditable: mode === "editable",
      forceHybrid: mode === "hybrid",
    });

    let visual: ConvertedImage | null = null;
    if (layout.useVisualFallback || layout.includeVisualReference) {
      // Hybrid reference uses a lighter render scale to keep Word files smaller.
      visual = await renderPagePng(page, layout.includeVisualReference && !layout.useVisualFallback ? 1.35 : 2.2);
      visualPages += 1;
      imageCount += 1;
      if (layout.includeVisualReference) hybridPages += 1;
    }

    const converted = rawImages.map((image) => image.converted ?? null);
    imageCount += converted.filter(Boolean).length;
    words += layout.wordCount;
    built.push({ layout, images: converted, visual });
    options?.onProgress?.(0.08 + (pageNumber / pdf.numPages) * 0.82);
  }

  options?.onProgress?.(0.93);
  const blob = await buildDocxFromPages(built, file.name.replace(/\.pdf$/i, ""));
  options?.onProgress?.(1);

  const preview = previewTextFromLayouts(built.map((page) => page.layout));
  return {
    blob,
    pages: pdf.numPages,
    words,
    images: imageCount,
    visualPages,
    hybridPages,
    preview,
    rtlPreview: isRtlText(preview),
  };
}

export function wordFileName(pdfName: string) {
  const base = pdfName.replace(/\.pdf$/i, "").trim() || "document";
  return `${base}.docx`;
}
