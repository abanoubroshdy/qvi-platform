"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/components/i18n/I18nProvider";

const MAX_CHARS = 1200;

export function QrGenerator() {
  const { copy, t } = useI18n();
  const [text, setText] = useState("");
  const [size, setSize] = useState(512);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const generate = useCallback(async (value: string, pixelSize: number) => {
    const content = value.trim();
    if (!content) {
      setDataUrl(null);
      setBlob(null);
      setError(null);
      return;
    }

    if (content.length > MAX_CHARS) {
      setError(t(copy.qr.tooLong, { max: MAX_CHARS }));
      return;
    }

    const current = ++requestId.current;
    setIsGenerating(true);
    setError(null);

    try {
      const url = await QRCode.toDataURL(content, {
        width: pixelSize,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#111827", light: "#ffffff" },
      });

      const response = await fetch(url);
      const nextBlob = await response.blob();
      if (current !== requestId.current) return;

      setDataUrl(url);
      setBlob(nextBlob);
    } catch {
      if (current !== requestId.current) return;
      setDataUrl(null);
      setBlob(null);
      setError(copy.qr.failed);
    } finally {
      if (current === requestId.current) setIsGenerating(false);
    }
  }, [copy.qr.failed, copy.qr.tooLong, t]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void generate(text, size);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [generate, size, text]);

  return (
    <ToolLayout
      hideDropzone
      emptyPreviewText={copy.qr.empty}
      actionLabel={copy.qr.action}
      onAction={() => generate(text, size)}
      actionDisabled={!text.trim() || text.trim().length > MAX_CHARS}
      actionLoading={isGenerating}
      downloadLabel={copy.qr.download}
      onDownload={() => {
        if (!blob) return;
        downloadBlob(blob, "qr-code.png");
      }}
      downloadDisabled={!blob || isGenerating}
      error={error}
      leading={
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <Label htmlFor="qr-text" className="text-sm font-bold">
            {copy.qr.label}
          </Label>
          <textarea
            id="qr-text"
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={copy.qr.placeholder}
            className="mt-2 flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {t(copy.qr.counter, { count: text.trim().length, max: MAX_CHARS })}
          </p>
        </div>
      }
      extra={
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Label htmlFor="qr-size" className="text-sm font-bold">
              {copy.qr.size}
            </Label>
            <span className="text-sm font-semibold tabular-nums text-primary">{size} px</span>
          </div>
          <div dir="ltr">
            <Slider
              id="qr-size"
              min={256}
              max={1024}
              step={64}
              value={[size]}
              onValueChange={(value) => setSize(value[0] ?? 512)}
              aria-label={copy.qr.size}
            />
          </div>
        </div>
      }
      preview={
        dataUrl ? (
          <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt={copy.qr.alt}
              className="mx-auto h-56 w-56 rounded-lg border bg-white object-contain p-2"
            />
            <div className="grid grid-cols-2 content-start gap-3">
              <Stat label={copy.qr.size} value={`${size}×${size}`} />
              <Stat label={copy.qr.fileSize} value={blob ? formatBytes(blob.size) : "—"} />
              <Stat label={copy.qr.correction} value={copy.qr.correctionValue} />
              <Stat label={copy.compressor.status} value={isGenerating ? copy.qr.generating : copy.qr.ready} />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
