"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { convertPdfToWord, wordFileName, type ConvertMode } from "@/lib/pdf-to-word";
import { isPdfFile } from "@/lib/pdf";

export function PdfToWord() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ConvertMode>("auto");
  const [result, setResult] = useState<Awaited<ReturnType<typeof convertPdfToWord>> | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const run = useCallback(
    async (source: File, convertMode: ConvertMode) => {
      const current = ++requestId.current;
      setIsWorking(true);
      setError(null);
      setProgress(0);
      setResult(null);
      try {
        const next = await convertPdfToWord(source, {
          mode: convertMode,
          onProgress: (ratio) => {
            if (current === requestId.current) setProgress(ratio);
          },
        });
        if (current !== requestId.current) return;
        setResult(next);
        setProgress(1);
      } catch {
        if (current !== requestId.current) return;
        setResult(null);
        setError(copy.pdfToWord.failed);
      } finally {
        if (current === requestId.current) setIsWorking(false);
      }
    },
    [copy.pdfToWord.failed],
  );

  function onFiles(incoming: File[]) {
    const pdf = incoming.find(isPdfFile) ?? null;
    if (!pdf) {
      setError(copy.pdfToWord.badFormat);
      return;
    }
    setFile(pdf);
    setResult(null);
    setError(null);
  }

  useEffect(() => {
    if (!file) return;
    const timeout = window.setTimeout(() => {
      void run(file, mode);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [file, mode, run]);

  const preview = useMemo(() => {
    if (!result?.preview) return "";
    return result.preview.length > 4000 ? `${result.preview.slice(0, 4000)}…` : result.preview;
  }, [result]);

  return (
    <ToolLayout
      accept="application/pdf,.pdf"
      onFiles={onFiles}
      dropTitle={copy.pdfToWord.dropTitle}
      dropHint={copy.pdfToWord.dropHint}
      emptyPreviewText={copy.pdfToWord.empty}
      actionLabel={copy.pdfToWord.action}
      onAction={() => file && void run(file, mode)}
      actionDisabled={!file}
      actionLoading={isWorking}
      downloadLabel={copy.pdfToWord.download}
      onDownload={() => {
        if (!result || !file) return;
        downloadBlob(result.blob, wordFileName(file.name));
      }}
      downloadDisabled={!result || isWorking}
      error={error}
      leading={
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <Label htmlFor="pdf-to-word-mode">{copy.pdfToWord.mode}</Label>
          <NativeSelect
            id="pdf-to-word-mode"
            className="mt-2"
            value={mode}
            onChange={(event) => setMode(event.target.value as ConvertMode)}
            aria-label={copy.pdfToWord.mode}
          >
            <option value="auto">{copy.pdfToWord.modeAuto}</option>
            <option value="editable">{copy.pdfToWord.modeEditable}</option>
            <option value="hybrid">{copy.pdfToWord.modeHybrid}</option>
            <option value="visual">{copy.pdfToWord.modeVisual}</option>
          </NativeSelect>
          <p className="mt-2 text-xs text-muted-foreground">{copy.pdfToWord.modeHint}</p>
        </div>
      }
      preview={
        file ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={copy.pdfToWord.file} value={file.name} valueDir="ltr" />
              <Stat label={copy.pdfToWord.pages} value={result ? `${result.pages}` : isWorking ? copy.pdfToWord.working : "—"} />
              <Stat label={copy.pdfToWord.words} value={result ? `${result.words}` : "—"} />
              <Stat
                label={copy.pdfToWord.output}
                value={result ? formatBytes(result.blob.size) : isWorking ? `${Math.round(progress * 100)}%` : "—"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={copy.pdfToWord.images} value={result ? `${result.images}` : "—"} />
              <Stat label={copy.pdfToWord.visualPages} value={result ? `${result.visualPages}` : "—"} />
              <Stat label={copy.pdfToWord.hybridPages} value={result ? `${result.hybridPages}` : "—"} />
              <Stat label={copy.pdfToWord.status} value={isWorking ? copy.pdfToWord.working : result ? copy.pdfToWord.ready : copy.pdfToWord.waiting} />
            </div>
            {preview ? (
              <pre
                className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-start text-xs leading-6"
                dir={result?.rtlPreview ? "rtl" : "auto"}
                lang={result?.rtlPreview ? "ar" : undefined}
              >
                {preview}
              </pre>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
