"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";

const MAX_CHARS = 1200;

export function QrGenerator() {
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
      setError(`Text is longer than the ${MAX_CHARS}-character limit. Shorten it and try again.`);
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
      setError("Could not create a QR code. Try shorter text or remove unsupported characters.");
    } finally {
      if (current === requestId.current) setIsGenerating(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void generate(text, size);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [generate, size, text]);

  return (
    <ToolLayout
      hideDropzone
      emptyPreviewText="Enter a URL or some text above to generate a QR code here."
      actionLabel="Create code"
      onAction={() => generate(text, size)}
      actionDisabled={!text.trim() || text.trim().length > MAX_CHARS}
      actionLoading={isGenerating}
      downloadLabel="Download PNG"
      onDownload={() => {
        if (!blob) return;
        downloadBlob(blob, "qr-code.png");
      }}
      downloadDisabled={!blob || isGenerating}
      error={error}
      leading={
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <Label htmlFor="qr-text" className="text-sm font-bold">
            Text or URL
          </Label>
          <textarea
            id="qr-text"
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="https://example.com or any text"
            className="mt-2 flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {text.trim().length} / {MAX_CHARS} characters · Generated on your device only. Nothing is sent to a server.
          </p>
        </div>
      }
      extra={
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Label htmlFor="qr-size" className="text-sm font-bold">
              Image size
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
              aria-label="QR code size"
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
              alt="Generated QR code"
              className="mx-auto h-56 w-56 rounded-lg border bg-white object-contain p-2"
            />
            <div className="grid grid-cols-2 content-start gap-3">
              <Stat label="Size" value={`${size}×${size}`} />
              <Stat label="File size" value={blob ? formatBytes(blob.size) : "—"} />
              <Stat label="Correction" value="Medium (M)" />
              <Stat label="Status" value={isGenerating ? "Generating" : "Ready to download"} />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
