"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { FFmpegStatus } from "@/components/FFmpegStatus";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AudioExportSettingsPanel } from "@/components/tools/AudioExportSettings";
import {
  audioExportFormats,
  audioExportSpec,
  clampAudioExportSettings,
  defaultAudioExportSettings,
  type AudioExportFormat,
  type AudioExportSettings,
} from "@/lib/audio-export";
import {
  batchConvertProgress,
  convertibleAudioAccept,
  convertedOutputName,
  isConvertibleAudioFile,
  uniqueConvertedName,
  zipAudioBlobs,
} from "@/lib/audio-convert";
import { downloadBlob } from "@/lib/download";
import {
  FFMPEG_LARGE_FILE_BYTES,
  classifyFFmpegFailure,
  formatFFmpegError,
  inputNameFor,
  runFFmpeg,
} from "@/lib/ffmpeg";
import { formatBytes } from "@/lib/format";
import { interpolate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ItemStatus = "ready" | "converting" | "done" | "error";

type QueueItem = {
  id: string;
  file: File;
  status: ItemStatus;
  errorKind?: "engine" | "no-audio" | "memory" | "generic";
  blob?: Blob;
  url?: string;
  resultFormat?: AudioExportFormat;
};

function nextId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Mp3ToWav() {
  const { copy } = useI18n();
  const t = copy.mp3ToWav;
  const listLabelId = useId();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [format, setFormat] = useState<AudioExportFormat>("wav");
  const [settings, setSettings] = useState<AudioExportSettings>(defaultAudioExportSettings);
  const [phase, setPhase] = useState<"idle" | "loading" | "converting">("idle");
  const [progress, setProgress] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        if (item.url) URL.revokeObjectURL(item.url);
      }
    };
  }, []);

  const busy = phase !== "idle" || zipping;
  const doneItems = items.filter((item) => item.status === "done" && item.blob);
  const hasResults = doneItems.length > 0;
  const largeFile = items.some((item) => item.file.size >= FFMPEG_LARGE_FILE_BYTES);
  const formatLabel = copy.mp4ToMp3.formats[format];

  function revokeItem(item: QueueItem) {
    if (item.url) URL.revokeObjectURL(item.url);
  }

  function clearResults() {
    setItems((current) =>
      current.map((item) => {
        revokeItem(item);
        return {
          id: item.id,
          file: item.file,
          status: "ready" as const,
        };
      }),
    );
  }

  function resetAll() {
    for (const item of items) revokeItem(item);
    setItems([]);
    setListError(null);
    setPhase("idle");
    setProgress(0);
  }

  function onFiles(files: File[]) {
    const accepted: QueueItem[] = [];
    let rejected = 0;
    for (const file of files) {
      if (!isConvertibleAudioFile(file)) {
        rejected += 1;
        continue;
      }
      accepted.push({ id: nextId(), file, status: "ready" });
    }
    if (!accepted.length) {
      setListError(t.badFormat);
      return;
    }
    setListError(rejected ? t.someSkipped : null);
    setItems((current) => {
      for (const item of current) {
        if (item.status === "done") revokeItem(item);
      }
      return [
        ...current.map((item) => ({
          id: item.id,
          file: item.file,
          status: "ready" as const,
        })),
        ...accepted,
      ];
    });
    setPhase("idle");
    setProgress(0);
  }

  function removeItem(id: string) {
    setItems((current) => {
      const next: QueueItem[] = [];
      for (const item of current) {
        if (item.id === id) {
          revokeItem(item);
          continue;
        }
        next.push(item);
      }
      return next;
    });
  }

  function onFormat(next: AudioExportFormat) {
    setFormat(next);
    setSettings((current) => clampAudioExportSettings(next, current));
    setListError(null);
    clearResults();
  }

  function onSettings(next: AudioExportSettings) {
    setSettings(clampAudioExportSettings(format, next));
    setListError(null);
    clearResults();
  }

  async function convertAll() {
    if (!items.length || busy) return;
    setListError(null);
    setPhase("loading");
    setProgress(0);

    const snapshot = items.map((item) => ({
      id: item.id,
      file: item.file,
      status: "ready" as const,
    }));
    for (const item of items) revokeItem(item);
    setItems(snapshot);

    const total = snapshot.length;
    let completed = 0;
    const updated: QueueItem[] = snapshot.map((item) => ({ ...item }));

    for (let index = 0; index < snapshot.length; index += 1) {
      const current = snapshot[index];
      updated[index] = { ...current, status: "converting" };
      setItems(updated.map((item) => ({ ...item })));

      try {
        const inputName = inputNameFor(current.file, `input${index}`);
        const spec = audioExportSpec(format, inputName, settings);
        const blob = await runFFmpeg({
          file: current.file,
          inputName,
          outputName: spec.outputName,
          mimeType: spec.mimeType,
          args: spec.args,
          fallbackArgs: spec.fallbackArgs,
          onLoadProgress: (ratio) => {
            setPhase("loading");
            setProgress(batchConvertProgress(completed, total, ratio * 0.15));
          },
          onProgress: (ratio) => {
            setPhase("converting");
            setProgress(batchConvertProgress(completed, total, 0.15 + ratio * 0.85));
          },
        });
        const url = URL.createObjectURL(blob);
        updated[index] = {
          id: current.id,
          file: current.file,
          status: "done",
          blob,
          url,
          resultFormat: format,
        };
      } catch (error) {
        console.error("[audio-convert]", error, formatFFmpegError(error));
        const kind = classifyFFmpegFailure(error, { fileBytes: current.file.size });
        updated[index] = {
          id: current.id,
          file: current.file,
          status: "error",
          errorKind: kind,
        };
      }

      completed += 1;
      setItems(updated.map((item) => ({ ...item })));
      setProgress(batchConvertProgress(completed, total, 0));
    }

    setPhase("idle");
    setProgress(1);
    const failed = updated.filter((item) => item.status === "error").length;
    if (failed && failed === total) setListError(t.failedAll);
    else if (failed) setListError(interpolate(t.failedSome, { failed, total }));
  }

  async function downloadAll() {
    if (!doneItems.length || busy) return;
    if (doneItems.length === 1) {
      const item = doneItems[0];
      if (!item.blob || !item.resultFormat) return;
      downloadBlob(item.blob, convertedOutputName(item.file.name, item.resultFormat));
      return;
    }
    setZipping(true);
    try {
      const used = new Set<string>();
      const entries = doneItems.map((item) => ({
        name: uniqueConvertedName(item.file.name, item.resultFormat ?? format, used),
        blob: item.blob!,
      }));
      const zip = await zipAudioBlobs(entries);
      downloadBlob(zip, `audio-convert-${format}.zip`);
    } catch (error) {
      console.error("[audio-convert-zip]", error);
      setListError(t.zipFailed);
    } finally {
      setZipping(false);
    }
  }

  function itemErrorText(kind: QueueItem["errorKind"]) {
    if (kind === "engine") return t.failedEngine;
    if (kind === "no-audio") return t.failedNoAudio;
    if (kind === "memory") return t.failedMemory;
    return t.failed;
  }

  function statusLabel(status: ItemStatus) {
    if (status === "converting") return t.statusConverting;
    if (status === "done") return t.statusDone;
    if (status === "error") return t.statusError;
    return t.statusReady;
  }

  return (
    <ToolLayout
      accept={convertibleAudioAccept}
      multiple
      onFiles={onFiles}
      dropTitle={items.length ? t.addMoreTitle : t.dropTitle}
      dropHint={items.length ? t.addMoreHint : t.dropHint}
      emptyPreviewText={t.empty}
      actionLabel={hasResults ? t.convertAgain : t.action}
      onAction={() => void convertAll()}
      actionDisabled={!items.length || busy}
      actionLoading={phase !== "idle"}
      downloadLabel={
        doneItems.length > 1
          ? interpolate(t.downloadZip, { count: doneItems.length })
          : interpolate(t.downloadFormat, { format: formatLabel })
      }
      onDownload={() => void downloadAll()}
      downloadDisabled={!hasResults || busy}
      error={listError}
      extra={
        <>
          {largeFile ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-start text-sm text-muted-foreground">
              {t.largeFileHint}
            </p>
          ) : null}
          <FFmpegStatus phase={phase} progress={progress} />
          {items.length ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {interpolate(t.filesCount, { count: items.length })}
                {hasResults
                  ? ` · ${interpolate(t.readyCount, { count: doneItems.length })}`
                  : null}
              </p>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={resetAll}>
                {t.clearAll}
              </Button>
            </div>
          ) : null}
        </>
      }
      settings={
        items.length ? (
          <AudioExportSettingsPanel format={format} settings={settings} disabled={busy} onChange={onSettings} />
        ) : null
      }
      trailing={
        <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
          <Label className="text-start">{t.outputFormat}</Label>
          <p className="text-sm text-muted-foreground">{t.unifiedHint}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.outputFormat}>
            {audioExportFormats.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={format === item ? "default" : "outline"}
                onClick={() => onFormat(item)}
                disabled={busy}
                aria-pressed={format === item}
                dir="ltr"
              >
                {copy.mp4ToMp3.formats[item]}
              </Button>
            ))}
          </div>
        </div>
      }
      preview={
        items.length ? (
          <div className="space-y-4" aria-busy={busy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={t.filesCountLabel} value={String(items.length)} />
              <Stat label={t.outputFormat} value={formatLabel} />
              <Stat
                label={t.output}
                value={
                  doneItems.length
                    ? formatBytes(doneItems.reduce((sum, item) => sum + (item.blob?.size ?? 0), 0))
                    : "—"
                }
              />
            </div>

            <ul className="space-y-3" aria-labelledby={listLabelId}>
              <li className="sr-only" id={listLabelId}>
                {t.queueLabel}
              </li>
              {items.map((item) => (
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
                        {statusLabel(item.status)}
                      </p>
                      {item.status === "error" ? (
                        <p className="text-sm text-destructive">{itemErrorText(item.errorKind)}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.status === "done" && item.blob && item.resultFormat ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            downloadBlob(item.blob!, convertedOutputName(item.file.name, item.resultFormat!))
                          }
                        >
                          <Download className="me-1 h-3.5 w-3.5" aria-hidden />
                          {interpolate(t.downloadOne, { format: copy.mp4ToMp3.formats[item.resultFormat] })}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={busy}
                        aria-label={t.removeFile}
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                  {item.url ? (
                    <audio controls src={item.url} className="mt-3 w-full" preload="metadata" />
                  ) : null}
                </li>
              ))}
            </ul>

            {hasResults && doneItems.length > 1 ? (
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void downloadAll()}>
                <Download className="me-2 h-4 w-4" aria-hidden />
                {interpolate(t.downloadZip, { count: doneItems.length })}
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
