"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { downloadBlob } from "@/lib/download";
import { formatBytes, formatPercent } from "@/lib/format";
import { convertPdfToWord, wordFileName, type ConvertMode } from "@/lib/pdf-to-word";
import {
  formatResultSummary,
  progressStageFromRatio,
  summarizeConversionPages,
} from "@/lib/pdf-to-word-ux";
import { isPdfFile } from "@/lib/pdf";
import { cn } from "@/lib/utils";

const MODE_STORAGE_KEY = "qvi.pdf-to-word.mode";

function readStoredMode(): ConvertMode {
  if (typeof window === "undefined") return "auto";
  try {
    const value = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (value === "auto" || value === "editable" || value === "hybrid" || value === "visual") return value;
  } catch {
    // Ignore private-mode / blocked storage.
  }
  return "auto";
}

export function PdfToWord() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ConvertMode>("auto");
  const [result, setResult] = useState<Awaited<ReturnType<typeof convertPdfToWord>> | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const modeReady = useRef(false);

  useEffect(() => {
    setMode(readStoredMode());
    modeReady.current = true;
  }, []);

  useEffect(() => {
    if (!modeReady.current) return;
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore private-mode / blocked storage.
    }
  }, [mode]);

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

  const stage = progressStageFromRatio(progress, isWorking);
  const stageLabel =
    stage === "loading"
      ? copy.pdfToWord.progressLoading
      : stage === "pages"
        ? copy.pdfToWord.progressPages
        : stage === "packaging"
          ? copy.pdfToWord.progressPackaging
          : copy.pdfToWord.ready;

  const pageSummary = result
    ? summarizeConversionPages({
        pages: result.pages,
        visualPages: result.visualPages,
        hybridPages: result.hybridPages,
      })
    : null;

  const summaryText = pageSummary
    ? formatResultSummary(copy.pdfToWord.resultSummary, pageSummary)
    : null;

  return (
    <ToolLayout
      accept="application/pdf,.pdf"
      onFiles={onFiles}
      dropTitle={copy.pdfToWord.dropTitle}
      dropHint={copy.pdfToWord.dropHint}
      emptyPreviewText={copy.pdfToWord.empty}
      actionLabel={copy.pdfToWord.action}
      onAction={() => file && void run(file, mode)}
      actionDisabled={!file || isWorking}
      actionLoading={isWorking}
      downloadLabel={copy.pdfToWord.download}
      onDownload={() => {
        if (!result || !file) return;
        downloadBlob(result.blob, wordFileName(file.name));
      }}
      downloadDisabled={!result || isWorking}
      error={error}
      leading={
        <div className="space-y-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <Label htmlFor="pdf-to-word-mode">{copy.pdfToWord.mode}</Label>
            <NativeSelect
              id="pdf-to-word-mode"
              className="mt-2"
              value={mode}
              disabled={isWorking}
              onChange={(event) => setMode(event.target.value as ConvertMode)}
              aria-label={copy.pdfToWord.mode}
            >
              <option value="auto">{copy.pdfToWord.modeAuto}</option>
              <option value="editable">{copy.pdfToWord.modeEditable}</option>
              <option value="hybrid">{copy.pdfToWord.modeHybrid}</option>
              <option value="visual">{copy.pdfToWord.modeVisual}</option>
            </NativeSelect>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{copy.pdfToWord.modeHint}</p>
          </div>
          {isWorking ? (
            <div
              className="space-y-2 rounded-xl border bg-card p-4 shadow-sm"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <p className="text-start">{stageLabel}</p>
                <span className="tabular-nums text-primary" dir="ltr">
                  {formatPercent(Math.round(Math.min(1, Math.max(0, progress)) * 100))}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-primary/15"
                dir="ltr"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(1, Math.max(0, progress)) * 100)}
                aria-label={stageLabel}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
                />
              </div>
              <p className="text-start text-xs leading-5 text-muted-foreground">{copy.pdfToWord.progressHint}</p>
            </div>
          ) : null}
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
              <Stat
                label={copy.pdfToWord.status}
                value={isWorking ? stageLabel : result ? copy.pdfToWord.ready : copy.pdfToWord.waiting}
              />
            </div>

            {summaryText ? (
              <p
                className={cn(
                  "rounded-lg border px-3 py-2 text-start text-sm leading-6",
                  "border-primary/20 bg-primary/5 text-foreground",
                )}
              >
                <span className="font-semibold">{copy.pdfToWord.resultLabel}: </span>
                {summaryText}
              </p>
            ) : null}

            {result && pageSummary && pageSummary.hybridPages > 0 ? (
              <p className="text-start text-xs leading-5 text-muted-foreground">{copy.pdfToWord.tipHybrid}</p>
            ) : null}
            {result && pageSummary && pageSummary.visualOnlyPages > 0 ? (
              <p className="text-start text-xs leading-5 text-muted-foreground">{copy.pdfToWord.tipVisual}</p>
            ) : null}

            {preview ? (
              <div className="space-y-2">
                <p className="text-start text-sm font-semibold">{copy.pdfToWord.previewTitle}</p>
                <pre
                  className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-start text-xs leading-6"
                  dir={result?.rtlPreview ? "rtl" : "auto"}
                  lang={result?.rtlPreview ? "ar" : undefined}
                >
                  {preview}
                </pre>
              </div>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
