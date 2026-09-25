"use client";

import type { ReactNode } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QueueItem } from "@/components/tools/useConversionQueue";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export type QueueCopy = {
  queueLabel: string;
  removeFile: string;
  cancelFile: string;
  download: string;
  statusReady: string;
  statusConverting: string;
  statusDone: string;
  statusError: string;
  statusCancelled: string;
  failed: string;
  failedEngine: string;
  failedNoAudio: string;
  failedMemory: string;
};

function statusLabel(copy: QueueCopy, status: QueueItem["status"]) {
  if (status === "converting") return copy.statusConverting;
  if (status === "done") return copy.statusDone;
  if (status === "error") return copy.statusError;
  if (status === "cancelled") return copy.statusCancelled;
  return copy.statusReady;
}

function errorText(copy: QueueCopy, kind: QueueItem["errorKind"]) {
  if (kind === "engine") return copy.failedEngine;
  if (kind === "no-audio") return copy.failedNoAudio;
  if (kind === "memory") return copy.failedMemory;
  return copy.failed;
}

export function ConversionQueueList({
  items,
  busy,
  copy,
  onRemove,
  onCancel,
  onDownload,
  renderPreview,
}: {
  items: QueueItem[];
  busy: boolean;
  copy: QueueCopy;
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
  onDownload: (item: QueueItem) => void;
  renderPreview?: (item: QueueItem) => ReactNode;
}) {
  return (
    <ul className="space-y-3" aria-label={copy.queueLabel}>
      {items.map((item) => {
        const percent = Math.round(Math.min(1, Math.max(0, item.progress)) * 100);
        const canCancel = busy && (item.status === "ready" || item.status === "converting");
        return (
          <li
            key={item.id}
            className={cn(
              "rounded-xl border bg-background/60 p-3",
              item.status === "error" && "border-destructive/40",
              item.status === "done" && "border-primary/30",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium" title={item.file.name} dir="auto">
                  {item.file.name}
                </p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {formatBytes(item.file.size)}
                  {item.blob ? ` → ${formatBytes(item.blob.size)}` : ""}
                  {" · "}
                  {statusLabel(copy, item.status)}
                  {item.status === "converting" ? ` ${percent}%` : ""}
                </p>
                {item.status === "error" ? <p className="text-sm text-destructive">{errorText(copy, item.errorKind)}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status === "done" && item.blob ? (
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onDownload(item)}>
                    <Download className="me-1 h-3.5 w-3.5" aria-hidden />
                    {copy.download}
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onCancel(item.id)}>
                    {copy.cancelFile}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={busy}
                    aria-label={copy.removeFile}
                    onClick={() => onRemove(item.id)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </div>
            {item.status === "converting" ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15" dir="ltr" aria-hidden>
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
              </div>
            ) : null}
            {renderPreview?.(item)}
          </li>
        );
      })}
    </ul>
  );
}
