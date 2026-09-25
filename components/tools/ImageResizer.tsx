"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { canvasToBlob, loadImageFromFile } from "@/lib/image";

function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
}

function outputType(file: File) {
  if (file.type === "image/jpeg" || file.type === "image/jpg") return "image/jpeg";
  if (file.type === "image/webp") return "image/webp";
  if (file.type === "image/png") return "image/png";
  return "image/png";
}

function extensionFor(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}

export function ImageResizer() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const resultRef = useRef<string | null>(null);

  const ratio = originalSize.width && originalSize.height ? originalSize.width / originalSize.height : 1;

  const resize = useCallback(async () => {
    if (!file || width < 1 || height < 1) return;
    setIsResizing(true);
    setError(null);
    try {
      const image = await loadImageFromFile(file);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no-context");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const type = outputType(file);
      const blob = await canvasToBlob(canvas, type, type === "image/jpeg" ? 0.92 : undefined);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult(blob);
      setResultUrl(url);
    } catch {
      setResult(null);
      setError(copy.resizer.failed);
    } finally {
      setIsResizing(false);
    }
  }, [copy.resizer.failed, file, height, width]);

  useEffect(() => {
    if (!file || width < 1 || height < 1) return;
    const timeout = window.setTimeout(() => {
      void resize();
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [file, height, resize, width]);

  async function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;
    if (!isImage(next)) {
      setError(copy.resizer.badFormat);
      return;
    }
    setError(null);
    setFile(next);
    setResult(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setPreviewUrl(url);
    const image = await loadImageFromFile(next);
    setOriginalSize({ width: image.naturalWidth, height: image.naturalHeight });
    setWidth(image.naturalWidth);
    setHeight(image.naturalHeight);
  }

  function onWidth(nextWidth: number) {
    setWidth(nextWidth);
    if (lockRatio) setHeight(Math.max(1, Math.round(nextWidth / ratio)));
  }

  function onHeight(nextHeight: number) {
    setHeight(nextHeight);
    if (lockRatio) setWidth(Math.max(1, Math.round(nextHeight * ratio)));
  }

  return (
    <ToolLayout
      accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
      onFiles={onFiles}
      dropTitle={copy.resizer.dropTitle}
      dropHint={copy.resizer.dropHint}
      emptyPreviewText={copy.resizer.empty}
      actionLabel={copy.resizer.action}
      onAction={() => void resize()}
      actionDisabled={!file}
      actionLoading={isResizing}
      downloadLabel={copy.resizer.download}
      onDownload={() => {
        if (!result || !file) return;
        const base = file.name.replace(/\.[^.]+$/, "");
        downloadBlob(result, `${base}-${Math.round(width)}x${Math.round(height)}.${extensionFor(result.type)}`);
      }}
      downloadDisabled={!result || isResizing}
      error={error}
      settings={
        file ? (
          <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="resize-width">{copy.resizer.width}</Label>
                <Input
                  id="resize-width"
                  type="number"
                  min={1}
                  value={width || ""}
                  onChange={(event) => onWidth(Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resize-height">{copy.resizer.height}</Label>
                <Input
                  id="resize-height"
                  type="number"
                  min={1}
                  value={height || ""}
                  onChange={(event) => onHeight(Number(event.target.value) || 0)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={lockRatio}
                onChange={(event) => setLockRatio(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              {copy.resizer.lock}
            </label>
          </div>
        ) : null
      }
      preview={
        file ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold">{copy.resizer.preview}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultUrl || previewUrl || ""}
                alt={copy.resizer.alt}
                className="max-h-72 w-full rounded-lg border bg-muted/40 object-contain"
              />
            </div>
            <div className="grid grid-cols-2 content-start gap-3">
              <Stat label={`${copy.resizer.original} — ${copy.resizer.dimensions}`} value={`${originalSize.width}×${originalSize.height}`} />
              <Stat label={`${copy.resizer.resized} — ${copy.resizer.dimensions}`} value={width && height ? `${Math.round(width)}×${Math.round(height)}` : "—"} />
              <Stat label={`${copy.resizer.original} — ${copy.resizer.fileSize}`} value={formatBytes(file.size)} />
              <Stat
                label={`${copy.resizer.resized} — ${copy.resizer.fileSize}`}
                value={result ? formatBytes(result.size) : isResizing ? copy.resizer.resizing : "—"}
              />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
