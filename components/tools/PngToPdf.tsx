"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";

function isPng(file: File) {
  return file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
}

export function PngToPdf() {
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
      setError("تعذر إنشاء ملف PDF. استخدم صور PNG صالحة وغير تالفة.");
    } finally {
      if (current === requestId.current) setIsConverting(false);
    }
  }, []);

  function onFiles(incoming: File[]) {
    const pngs = incoming.filter(isPng);
    if (!pngs.length) {
      setError("لم يُعثر على صور PNG. اختر ملفاً أو أكثر بصيغة PNG.");
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
      actionLabel="تحويل إلى PDF"
      onAction={() => files.length && convert(files)}
      actionDisabled={!files.length}
      actionLoading={isConverting}
      downloadLabel="تنزيل PDF"
      onDownload={() => {
        if (!pdfBlob) return;
        const baseName = files[0]?.name.replace(/\.[^.]+$/, "") || "image";
        const filename = files.length > 1 ? "images.pdf" : `${baseName}.pdf`;
        downloadBlob(pdfBlob, filename);
      }}
      downloadDisabled={!pdfBlob || isConverting}
      dropTitle="اسحب صور PNG هنا أو اضغط للاختيار"
      dropHint="يمكنك اختيار صورة واحدة أو عدة صور. كل صورة تصبح صفحة في ملف PDF، والمعالجة محلية بالكامل."
      error={error}
      preview={
        files.length ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 content-start gap-3 sm:grid-cols-4">
              <Stat label="عدد الصور" value={`${files.length}`} />
              <Stat label="حجم PNG" value={formatBytes(files.reduce((sum, file) => sum + file.size, 0))} />
              <Stat label="حجم PDF" value={pdfBlob ? formatBytes(pdfBlob.size) : isConverting ? "جارٍ الإنشاء..." : "—"} />
              <Stat label="الحالة" value={isConverting ? "جارٍ التحويل" : pdfBlob ? "جاهز للتنزيل" : "بانتظار الصور"} />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">الصور المختارة</p>
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
                <p className="mb-2 text-sm font-bold">معاينة PDF</p>
                <iframe title="معاينة ملف PDF" src={pdfUrl} className="h-80 w-full rounded-lg border bg-muted/30" />
              </div>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
