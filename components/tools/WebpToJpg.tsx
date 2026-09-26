"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { canvasToBlob, loadImageFromFile } from "@/lib/image";
import { useI18n } from "@/components/i18n/I18nProvider";

function isWebp(file: File) {
  return file.type === "image/webp" || file.name.toLowerCase().endsWith(".webp");
}

export function WebpToJpg() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState(90);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const previewUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const convert = useCallback(async (source: File, qualityValue: number) => {
    const current = ++requestId.current;
    setIsConverting(true);
    setError(null);

    try {
      const image = await loadImageFromFile(source);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no-context");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      const blob = await canvasToBlob(canvas, "image/jpeg", qualityValue / 100);
      if (current !== requestId.current) return;

      setResult(blob);
      const nextUrl = URL.createObjectURL(blob);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = nextUrl;
      setResultUrl(nextUrl);
    } catch {
      if (current !== requestId.current) return;
      setResult(null);
      setError(copy.webp.failed);
    } finally {
      if (current === requestId.current) setIsConverting(false);
    }
  }, [copy.webp.failed]);

  function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;

    if (!isWebp(next)) {
      setError(copy.webp.badFormat);
      return;
    }

    setFile(next);
    setResult(null);
    setError(null);

    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResultUrl(null);

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = URL.createObjectURL(next);
    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview);
  }

  useEffect(() => {
    if (!file) return;
    const timeout = window.setTimeout(() => {
      void convert(file, quality);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [convert, file, quality]);

  return (
    <ToolLayout
      accept="image/webp,.webp"
      onFiles={onFiles}
      actionLabel={copy.webp.action}
      onAction={() => file && convert(file, quality)}
      actionDisabled={!file}
      actionLoading={isConverting}
      downloadLabel={copy.webp.download}
      onDownload={() => {
        if (!result || !file) return;
        const baseName = file.name.replace(/\.[^.]+$/, "");
        downloadBlob(result, `${baseName}.jpg`);
      }}
      downloadDisabled={!result || isConverting}
      dropTitle={copy.webp.dropTitle}
      dropHint={copy.webp.dropHint}
      error={error}
      settings={
        file ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Label htmlFor="jpg-quality" className="text-sm font-bold">
              {copy.webp.quality}
            </Label>
            <span className="text-sm font-semibold tabular-nums text-primary">{quality}%</span>
          </div>
          <div dir="ltr">
            <Slider
              id="jpg-quality"
              min={40}
              max={100}
              step={5}
              value={[quality]}
              onValueChange={(value) => setQuality(value[0] ?? 90)}
              aria-label={copy.webp.quality}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {copy.webp.qualityHint}
          </p>
        </div>
        ) : null
      }
      preview={
        file ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold">{copy.webp.preview}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultUrl || previewUrl || ""}
                alt={copy.webp.alt}
                className="max-h-72 w-full rounded-lg border bg-muted/40 object-contain"
              />
              <p className="mt-2 truncate text-xs text-muted-foreground">{file.name}</p>
            </div>
            <div className="grid grid-cols-2 content-start gap-3">
              <Stat label={copy.webp.webpSize} value={formatBytes(file.size)} />
              <Stat label={copy.webp.jpgSize} value={result ? formatBytes(result.size) : isConverting ? copy.webp.converting : "—"} />
              <Stat label={copy.webp.dimensions} value={resultUrl ? copy.webp.unchanged : "—"} />
              <Stat label={copy.compressor.status} value={isConverting ? copy.webp.convertingStatus : result ? copy.webp.ready : copy.webp.waiting} />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
