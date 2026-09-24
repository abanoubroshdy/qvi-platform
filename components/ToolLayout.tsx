"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { Download, Loader2, UploadCloud } from "lucide-react";
import { AdSenseScript, ToolAd } from "@/components/ToolAd";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type ToolLayoutProps = {
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  hideDropzone?: boolean;
  /** When the large dropzone is hidden, show a compact replace-file control. */
  replaceLabel?: string;
  /** Skip the dashed empty preview box when `preview` is unset. */
  hideEmptyPreview?: boolean;
  leading?: ReactNode;
  preview?: ReactNode;
  extra?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  downloadLabel: string;
  onDownload: () => void;
  downloadDisabled?: boolean;
  dropTitle?: string;
  dropHint?: string;
  emptyPreviewText?: string;
  error?: string | null;
};

export function ToolLayout({
  accept,
  multiple = false,
  onFiles,
  hideDropzone = false,
  replaceLabel,
  hideEmptyPreview = false,
  leading,
  preview,
  extra,
  actionLabel,
  onAction,
  actionDisabled,
  actionLoading,
  downloadLabel,
  onDownload,
  downloadDisabled,
  dropTitle,
  dropHint,
  emptyPreviewText,
  error,
}: ToolLayoutProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { copy } = useI18n();
  const resolvedDropTitle = dropTitle ?? copy.layout.dropTitle;
  const resolvedDropHint = dropHint ?? copy.layout.dropHint;
  const resolvedEmpty = emptyPreviewText ?? copy.layout.emptyPreview;

  function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length) onFiles?.(files);
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      handleFiles(event.dataTransfer.files);
    }
  }

  const fileInput = onFiles ? (
    <input
      ref={inputRef}
      type="file"
      className="sr-only"
      accept={accept}
      multiple={multiple}
      onChange={(event) => {
        if (event.target.files?.length) handleFiles(event.target.files);
        event.target.value = "";
      }}
    />
  ) : null;

  return (
    <div className="space-y-4">
      <AdSenseScript />
      <ToolAd position="top" />

      {leading}

      {hideDropzone ? null : (
        <div className="relative">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-primary/30 bg-card hover:border-primary hover:bg-primary/5",
            )}
          >
            <UploadCloud className="mb-3 h-10 w-10 text-primary" aria-hidden />
            <p className="text-base font-bold">{resolvedDropTitle}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{resolvedDropHint}</p>
          </button>
          {fileInput}
        </div>
      )}

      {hideDropzone && onFiles && replaceLabel ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={actionLoading}>
            {replaceLabel}
          </Button>
          {fileInput}
        </div>
      ) : null}

      {hideDropzone && onFiles && !replaceLabel ? fileInput : null}

      {error ? (
        <p className="whitespace-pre-wrap break-words rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">{preview}</div>
      ) : hideEmptyPreview ? null : (
        <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {resolvedEmpty}
        </div>
      )}

      {extra}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          size="lg"
          className="flex-1"
          onClick={onAction}
          disabled={actionDisabled || actionLoading}
        >
          {actionLoading ? <Loader2 className="animate-spin" /> : null}
          {actionLabel}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="flex-1"
          onClick={onDownload}
          disabled={downloadDisabled}
        >
          <Download />
          {downloadLabel}
        </Button>
      </div>

      <ToolAd position="bottom" />
    </div>
  );
}
