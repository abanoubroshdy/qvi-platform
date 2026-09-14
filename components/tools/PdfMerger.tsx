"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { isPdfFile, mergePdfFiles } from "@/lib/pdf";

export function PdfMerger() {
  const { copy } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
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
    async (sources: File[]) => {
      if (sources.length < 2) {
        setResult(null);
        return;
      }
      const current = ++requestId.current;
      setIsWorking(true);
      setError(null);
      try {
        const blob = await mergePdfFiles(sources);
        if (current !== requestId.current) return;
        if (resultRef.current) URL.revokeObjectURL(resultRef.current);
        const url = URL.createObjectURL(blob);
        resultRef.current = url;
        setResult(blob);
        setResultUrl(url);
      } catch {
        if (current !== requestId.current) return;
        setResult(null);
        setError(copy.pdfMerger.failed);
      } finally {
        if (current === requestId.current) setIsWorking(false);
      }
    },
    [copy.pdfMerger.failed],
  );

  function onFiles(incoming: File[]) {
    const pdfs = incoming.filter(isPdfFile);
    if (!pdfs.length) {
      setError(copy.pdfMerger.badFormat);
      return;
    }
    setFiles(pdfs);
    setResult(null);
    setError(pdfs.length < 2 ? copy.pdfMerger.needTwo : null);
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    resultRef.current = null;
    setResultUrl(null);
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= files.length) return;
    const next = [...files];
    const current = next[index];
    const swap = next[nextIndex];
    if (!current || !swap) return;
    next[index] = swap;
    next[nextIndex] = current;
    setFiles(next);
  }

  useEffect(() => {
    if (files.length < 2) return;
    const timeout = window.setTimeout(() => {
      void run(files);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [files, run]);

  return (
    <ToolLayout
      accept="application/pdf,.pdf"
      multiple
      onFiles={onFiles}
      dropTitle={copy.pdfMerger.dropTitle}
      dropHint={copy.pdfMerger.dropHint}
      emptyPreviewText={copy.pdfMerger.empty}
      actionLabel={copy.pdfMerger.action}
      onAction={() => files.length >= 2 && void run(files)}
      actionDisabled={files.length < 2}
      actionLoading={isWorking}
      downloadLabel={copy.pdfMerger.download}
      onDownload={() => {
        if (!result) return;
        downloadBlob(result, "merged.pdf");
      }}
      downloadDisabled={!result || isWorking}
      error={error}
      extra={
        files.length ? (
          <ul className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {index + 1}. {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="icon" variant="outline" onClick={() => move(index, -1)} disabled={index === 0} aria-label={copy.pdfMerger.moveUp}>
                    <ChevronUp />
                  </Button>
                  <Button type="button" size="icon" variant="outline" onClick={() => move(index, 1)} disabled={index === files.length - 1} aria-label={copy.pdfMerger.moveDown}>
                    <ChevronDown />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null
      }
      preview={
        files.length ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={copy.pdfMerger.files} value={`${files.length}`} />
              <Stat label={copy.pdfMerger.original} value={formatBytes(files.reduce((sum, file) => sum + file.size, 0))} />
              <Stat label={copy.pdfMerger.output} value={result ? formatBytes(result.size) : isWorking ? copy.pdfMerger.working : "—"} />
            </div>
            {resultUrl ? (
              <iframe title={copy.pdfMerger.preview} src={resultUrl} className="h-80 w-full rounded-lg border bg-muted/30" />
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
