"use client";

import { useCallback, useRef, useState } from "react";
import jsQR from "jsqr";
import { CopyButton } from "@/components/CopyButton";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { copyText } from "@/lib/clipboard";
import { downloadBlob } from "@/lib/download";

function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
}

export function QrReader() {
  const { copy } = useI18n();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const latestFile = useRef<File | null>(null);

  const decode = useCallback(
    async (file: File) => {
      setIsReading(true);
      setError(null);
      setResult(null);

      try {
        const bitmap = await createImageBitmap(file);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("no-context");
          context.drawImage(bitmap, 0, 0);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          if (!code?.data) {
            setError(copy.qrReader.failed);
            return;
          }
          setResult(code.data);
        } finally {
          bitmap.close();
        }
      } catch {
        setError(copy.qrReader.failed);
      } finally {
        setIsReading(false);
      }
    },
    [copy.qrReader.failed],
  );

  function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;
    if (!isImage(next)) {
      setError(copy.qrReader.badFormat);
      return;
    }
    latestFile.current = next;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setPreviewUrl(url);
    void decode(next);
  }

  return (
    <ToolLayout
      accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
      onFiles={onFiles}
      dropTitle={copy.qrReader.dropTitle}
      dropHint={copy.qrReader.dropHint}
      emptyPreviewText={copy.qrReader.empty}
      actionLabel={copy.qrReader.action}
      onAction={() => result && void copyText(result)}
      actionDisabled={!result}
      actionLoading={isReading}
      downloadLabel={copy.qrReader.download}
      onDownload={() => {
        if (!result) return;
        downloadBlob(new Blob([result], { type: "text/plain;charset=utf-8" }), "qr-result.txt");
      }}
      downloadDisabled={!result}
      error={error}
      preview={
        previewUrl ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold">{copy.qrReader.preview}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={copy.qrReader.alt} className="max-h-64 w-full rounded-lg border bg-muted/40 object-contain" />
            </div>
            <div className="space-y-3">
              <Stat
                label={copy.compressor.status}
                value={isReading ? copy.qrReader.waiting : result ? copy.qrReader.ready : copy.qrReader.none}
              />
              {result ? (
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{copy.qrReader.result}</p>
                    <CopyButton value={result} />
                  </div>
                  <p className="break-all text-sm leading-7" dir="auto">
                    {result}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
