"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { downloadBlob } from "@/lib/download";
import { formatBytes, formatPercent } from "@/lib/format";
import { compressPdf, isPdfFile } from "@/lib/pdf";

export function PdfCompressor() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(70);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const resultRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  const run = useCallback(
    async (source: File, qualityValue: number) => {
      const current = ++requestId.current;
      setIsWorking(true);
      setError(null);
      setProgress(0);
      try {
        const blob = await compressPdf(source, qualityValue, (ratio) => {
          if (current === requestId.current) setProgress(ratio);
        });
        if (current !== requestId.current) return;
        if (resultRef.current) URL.revokeObjectURL(resultRef.current);
        const url = URL.createObjectURL(blob);
        resultRef.current = url;
        setResult(blob);
        setResultUrl(url);
        setProgress(1);
      } catch {
        if (current !== requestId.current) return;
        setResult(null);
        setError(copy.pdfCompressor.failed);
      } finally {
        if (current === requestId.current) setIsWorking(false);
      }
    },
    [copy.pdfCompressor.failed],
  );

  function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;
    if (!isPdfFile(next)) {
      setError(copy.pdfCompressor.badFormat);
      return;
    }
    setFile(next);
    setResult(null);
    setError(null);
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    resultRef.current = null;
    setResultUrl(null);
  }

  useEffect(() => {
    if (!file) return;
    const timeout = window.setTimeout(() => {
      void run(file, quality);
    }, 280);
    return () => window.clearTimeout(timeout);
  }, [file, quality, run]);

  const saved =
    file && result && file.size > result.size ? formatPercent(((file.size - result.size) / file.size) * 100) : "—";

  return (
    <ToolLayout
      accept="application/pdf,.pdf"
      onFiles={onFiles}
      dropTitle={copy.pdfCompressor.dropTitle}
      dropHint={copy.pdfCompressor.dropHint}
      emptyPreviewText={copy.pdfCompressor.empty}
      actionLabel={copy.pdfCompressor.action}
      onAction={() => file && void run(file, quality)}
      actionDisabled={!file}
      actionLoading={isWorking}
      downloadLabel={copy.pdfCompressor.download}
      onDownload={() => {
        if (!result || !file) return;
        downloadBlob(result, `${file.name.replace(/\.pdf$/i, "")}-compressed.pdf`);
      }}
      downloadDisabled={!result || isWorking}
      error={error}
      settings={
        file ? (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label htmlFor="pdf-quality">{copy.pdfCompressor.quality}</Label>
              <span className="text-sm font-semibold tabular-nums text-primary">{quality}%</span>
            </div>
            <div dir="ltr">
              <Slider
                id="pdf-quality"
                min={50}
                max={90}
                step={5}
                value={[quality]}
                onValueChange={(value) => setQuality(value[0] ?? 70)}
                aria-label={copy.pdfCompressor.quality}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{copy.pdfCompressor.qualityHint}</p>
          </div>
        ) : null
      }
      preview={
        file ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={copy.pdfCompressor.original} value={formatBytes(file.size)} />
              <Stat
                label={copy.pdfCompressor.compressed}
                value={result ? formatBytes(result.size) : isWorking ? copy.pdfCompressor.working : "—"}
              />
              <Stat label={copy.pdfCompressor.saved} value={saved} />
              <Stat label={copy.compressor.status} value={isWorking ? `${Math.round(progress * 100)}%` : result ? copy.pdfCompressor.ready : copy.pdfCompressor.waiting} />
            </div>
            {resultUrl ? (
              <iframe title={copy.pdfCompressor.preview} src={resultUrl} className="h-80 w-full rounded-lg border bg-muted/30" />
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
