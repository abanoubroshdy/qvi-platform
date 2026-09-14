import { PDFDocument } from "pdf-lib";

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function mergePdfFiles(files: File[]): Promise<Blob> {
  const output = await PDFDocument.create();

  for (const file of files) {
    const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const copied = await output.copyPages(source, source.getPageIndices());
    copied.forEach((page) => output.addPage(page));
  }

  const bytes = await output.save({ useObjectStreams: true });
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function optimizePdf(file: File): Promise<Blob> {
  const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, source.getPageIndices());
  copied.forEach((page) => output.addPage(page));
  const bytes = await output.save({ useObjectStreams: true });
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("jpeg"));
          return;
        }
        void blob.arrayBuffer().then(resolve, reject);
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function compressPdf(file: File, qualityPercent: number, onProgress?: (ratio: number) => void): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const output = await PDFDocument.create();
  const jpegQuality = Math.min(0.92, Math.max(0.4, qualityPercent / 100));
  const scale = qualityPercent >= 80 ? 1.6 : qualityPercent >= 65 ? 1.35 : 1.15;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("no-context");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const jpeg = await canvasToJpeg(canvas, jpegQuality);
    const image = await output.embedJpg(jpeg);
    const pdfPage = output.addPage([base.width, base.height]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
    onProgress?.(pageNumber / pdf.numPages);
  }

  const visualBytes = await output.save({ useObjectStreams: true });
  const visual = new Blob([new Uint8Array(visualBytes)], { type: "application/pdf" });
  const lossless = await optimizePdf(file);
  return visual.size < lossless.size ? visual : lossless;
}
