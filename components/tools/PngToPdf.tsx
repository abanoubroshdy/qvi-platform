"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/components/i18n/I18nProvider";

function isPng(file: File) {
  return file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
}

export function PngToPdf() {
  const { copy } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const previewUrlsRef = useRef<string[]>([]);
  const pdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  const convert = useCallback(async (sources: File[]) => {
    const current = ++requestId.current;
    setIsConverting(true);
    setError(null);

    try {
      const pdf = await PDFDocument.create();
      const maxSide = 842;

      for (const source of sources) {
        const bytes = await source.arrayBuffer();
        const image = await pdf.embedPng(bytes);
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = image.width * scale;
        const height = image.height * scale;
        const page = pdf.addPage([width, height]);
        page.drawImage(image, { x: 0, y: 0, width, height });
      }

      const pdfBytes = await pdf.save();
      if (current !== requestId.current) return;

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      setPdfBlob(blob);
      const nextUrl = URL.createObjectURL(blob);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = nextUrl;
      setPdfUrl(nextUrl);
    } catch {
      if (current !== requestId.current) return;
      setPdfBlob(null);
      setError(copy.png.failed);
    } finally {
      if (current === requestId.current) setIsConverting(false);
    }
  }, [copy.png.failed]);

  function onFiles(incoming: File[]) {
    const pngs = incoming.filter(isPng);
    if (!pngs.length) {
      setError(copy.png.badFormat);
      return;
    }

    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const nextPreviews = pngs.map((file) => URL.createObjectURL(file));
    previewUrlsRef.current = nextPreviews;
    setPreviews(nextPreviews);
    setFiles(pngs);
    setPdfBlob(null);
    setError(null);

    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = null;
    setPdfUrl(null);
  }

  useEffect(() => {
    if (!files.length) return;
    const timeout = window.setTimeout(() => {
      void convert(files);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [convert, files]);

  return (
    <ToolLayout
      accept="image/png,.png"
      multiple
      onFiles={onFiles}
      actionLabel={copy.png.action}
      onAction={() => files.length && convert(files)}
      actionDisabled={!files.length}
      actionLoading={isConverting}
      downloadLabel={copy.png.download}
      onDownload={() => {
        if (!pdfBlob) return;
        const baseName = files[0]?.name.replace(/\.[^.]+$/, "") || "image";
        const filename = files.length > 1 ? "images.pdf" : `${baseName}.pdf`;
        downloadBlob(pdfBlob, filename);
      }}
      downloadDisabled={!pdfBlob || isConverting}
      dropTitle={copy.png.dropTitle}
      dropHint={copy.png.dropHint}
      error={error}
      preview={
        files.length ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 content-start gap-3 sm:grid-cols-4">
              <Stat label={copy.png.images} value={`${files.length}`} />
              <Stat label={copy.png.pngSize} value={formatBytes(files.reduce((sum, file) => sum + file.size, 0))} />
              <Stat label={copy.png.pdfSize} value={pdfBlob ? formatBytes(pdfBlob.size) : isConverting ? copy.png.building : "—"} />
              <Stat label={copy.compressor.status} value={isConverting ? copy.png.converting : pdfBlob ? copy.png.ready : copy.png.waiting} />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">{copy.png.selected}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {files.map((file, index) => (
                  <figure key={`${file.name}-${index}`} className="overflow-hidden rounded-lg border bg-muted/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previews[index]} alt={file.name} className="h-32 w-full object-contain" />
                    <figcaption className="truncate px-2 py-1 text-xs text-muted-foreground">{file.name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
            {pdfUrl ? (
              <div>
                <p className="mb-2 text-sm font-bold">{copy.png.pdfPreview}</p>
                <iframe title={copy.png.pdfPreview} src={pdfUrl} className="h-80 w-full rounded-lg border bg-muted/30" />
              </div>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
