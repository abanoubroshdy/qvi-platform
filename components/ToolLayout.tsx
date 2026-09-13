"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { Download, Loader2, UploadCloud } from "lucide-react";
import { AdPlaceholder } from "@/components/AdPlaceholder";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToolLayoutProps = {
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  hideDropzone?: boolean;
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
  dropTitle = "اسحب الملف هنا أو اضغط للاختيار",
  dropHint = "المعالجة تتم على جهازك فقط. لا يُرفع أي ملف إلى الخادم.",
  emptyPreviewText = "ستظهر معاينة الملف هنا بعد اختياره.",
  error,
}: ToolLayoutProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length) onFiles?.(files);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      handleFiles(event.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-4">
      <AdPlaceholder position="top" />

      {leading}

      {hideDropzone ? null : (
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
          <p className="text-base font-bold">{dropTitle}</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{dropHint}</p>
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
        </button>
      )}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">{preview}</div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {emptyPreviewText}
        </div>
      )}

      {extra}

      <AdPlaceholder position="middle" />

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

      <AdPlaceholder position="bottom" />
    </div>
  );
}
