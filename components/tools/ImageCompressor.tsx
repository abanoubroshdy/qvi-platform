"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatBytes, formatPercent } from "@/lib/format";
import { useI18n } from "@/components/i18n/I18nProvider";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/jpg"];

function isSupportedImage(file: File) {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  return /\.(jpe?g|png|webp|bmp)$/i.test(file.name);
}

export function ImageCompressor() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState(80);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const previewUrlRef = useRef<string | null>(null);
  const compressedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);
    };
  }, []);

  const compress = useCallback(async (source: File, qualityValue: number) => {
    const current = ++requestId.current;
    setIsCompressing(true);
    setError(null);

    try {
      const result = await imageCompression(source, {
        maxSizeMB: 50,
        initialQuality: qualityValue / 100,
        useWebWorker: true,
        alwaysKeepResolution: true,
        fileType: source.type === "image/png" ? "image/png" : "image/jpeg",
      });

      if (current !== requestId.current) return;

      setCompressedBlob(result);
      const nextUrl = URL.createObjectURL(result);
      if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);
      compressedUrlRef.current = nextUrl;
      setCompressedUrl(nextUrl);
    } catch {
      if (current !== requestId.current) return;
      setCompressedBlob(null);
      setError(copy.compressor.failed);
    } finally {
      if (current === requestId.current) setIsCompressing(false);
    }
  }, [copy.compressor.failed]);

  function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;

    if (!isSupportedImage(next)) {
      setError(copy.compressor.badFormat);
      return;
    }

    setFile(next);
    setCompressedBlob(null);
    setError(null);
    if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);
    compressedUrlRef.current = null;
    setCompressedUrl(null);

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = URL.createObjectURL(next);
    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview);
  }

  useEffect(() => {
    if (!file) return;
    const timeout = window.setTimeout(() => {
      void compress(file, quality);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [compress, file, quality]);

  function download() {
    if (!compressedBlob || !file) return;
    const extension = compressedBlob.type === "image/png" ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const link = document.createElement("a");
    link.href = compressedUrl ?? URL.createObjectURL(compressedBlob);
    link.download = `${baseName}-compressed.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const savings = useMemo(() => {
    if (!file || !compressedBlob) return null;
    const saved = file.size - compressedBlob.size;
    const percent = file.size ? (saved / file.size) * 100 : 0;
    return { saved, percent };
  }, [compressedBlob, file]);

  return (
    <ToolLayout
      accept="image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp"
      onFiles={onFiles}
      actionLabel={copy.compressor.action}
      onAction={() => file && compress(file, quality)}
      actionDisabled={!file}
      actionLoading={isCompressing}
      downloadLabel={copy.compressor.download}
      onDownload={download}
      downloadDisabled={!compressedBlob || isCompressing}
      dropTitle={copy.compressor.dropTitle}
      dropHint={copy.compressor.dropHint}
      error={error}
      settings={
        file ? (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label htmlFor="quality" className="text-sm font-bold">
                {copy.compressor.quality}
              </Label>
              <span className="text-sm font-semibold tabular-nums text-primary">{quality}%</span>
            </div>
            <div dir="ltr">
              <Slider
                id="quality"
                min={10}
                max={100}
                step={5}
                value={[quality]}
                onValueChange={(value) => setQuality(value[0] ?? 80)}
                aria-label={copy.compressor.quality}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{copy.compressor.qualityHint}</p>
          </div>
        ) : null
      }
      preview={
        file ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold">{copy.compressor.preview}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compressedUrl || previewUrl || ""}
                alt={copy.compressor.alt}
                className="max-h-72 w-full rounded-lg border object-contain bg-muted/40"
              />
              <p className="mt-2 truncate text-xs text-muted-foreground">{file.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 content-start">
              <Stat label={copy.compressor.original} value={formatBytes(file.size)} />
              <Stat
                label={copy.compressor.compressed}
                value={compressedBlob ? formatBytes(compressedBlob.size) : isCompressing ? copy.compressor.calculating : "—"}
              />
              <Stat
                label={copy.compressor.saved}
                value={
                  savings
                    ? `${formatBytes(Math.max(savings.saved, 0))} (${formatPercent(Math.max(savings.percent, 0))})`
                    : "—"
                }
              />
              <Stat
                label={copy.compressor.status}
                value={isCompressing ? copy.compressor.compressing : compressedBlob ? copy.compressor.ready : copy.compressor.waiting}
              />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
