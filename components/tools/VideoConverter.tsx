"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { FFmpegStatus } from "@/components/FFmpegStatus";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { ConversionQueueList } from "@/components/tools/ConversionQueueList";
import { VideoConvertSettings } from "@/components/tools/VideoConvertSettings";
import { useConversionQueue, type QueueItem } from "@/components/tools/useConversionQueue";
import { downloadBlob } from "@/lib/download";
import { FFMPEG_LARGE_FILE_BYTES, inputNameFor, runFFmpeg } from "@/lib/ffmpeg";
import { formatBytes } from "@/lib/format";
import { interpolate } from "@/lib/i18n";
import { uniqueOutputName } from "@/lib/media-output";
import {
  clampVideoConvertSettings,
  defaultVideoConvertSettings,
  videoConvertSpec,
  type VideoConvertSettings as Settings,
} from "@/lib/video-convert";
import { isVideoFile, videoInputAccept } from "@/lib/video-input";

export function VideoConverter() {
  const { copy } = useI18n();
  const t = copy.videoConverter;
  const [settings, setSettings] = useState<Settings>(defaultVideoConvertSettings);
  const [listError, setListError] = useState<string | null>(null);
  const usedNames = useRef(new Set<string>());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const queue = useConversionQueue({
    acceptFile: isVideoFile,
    zipName: () => `video-convert-${settingsRef.current.container}.zip`,
    convertFile: async (file, index, ctx) => {
      const current = clampVideoConvertSettings(settingsRef.current);
      const inputName = inputNameFor(file, `in${index}`);
      const spec = videoConvertSpec(inputName, current);
      const blob = await runFFmpeg({
        file,
        inputName,
        outputName: spec.outputName,
        mimeType: spec.mimeType,
        args: spec.args,
        fallbackArgs: spec.fallbackArgs,
        onLoadProgress: ctx.onLoadProgress,
        onProgress: ctx.onProgress,
      });
      return {
        blob,
        downloadName: uniqueOutputName(file.name, spec.extension, usedNames.current, "video"),
      };
    },
  });

  const doneItems = queue.items.filter((item) => item.status === "done" && item.blob);
  const hasResults = doneItems.length > 0;
  const largeFile = queue.items.some((item) => item.file.size >= FFMPEG_LARGE_FILE_BYTES);
  const containerLabel = t.containers[settings.container];

  function onFiles(files: File[]) {
    const result = queue.addFiles(files);
    if (!result.accepted && result.rejected) {
      setListError(t.badFormat);
      return;
    }
    setListError(result.rejected ? t.someSkipped : null);
  }

  function onSettings(next: Settings) {
    setSettings(clampVideoConvertSettings(next));
    setListError(null);
    queue.clearResults();
  }

  async function convertAll() {
    usedNames.current = new Set();
    setListError(null);
    const summary = await queue.convertAll();
    if (!summary) return;
    if (summary.failed && summary.failed === summary.total) setListError(t.failedAll);
    else if (summary.failed) setListError(interpolate(t.failedSome, { failed: summary.failed, total: summary.total }));
  }

  async function downloadAll() {
    const result = await queue.downloadAll();
    if (result === "failed") setListError(t.zipFailed);
  }

  function downloadOne(item: QueueItem) {
    if (!item.blob || !item.downloadName) return;
    downloadBlob(item.blob, item.downloadName);
  }

  return (
    <ToolLayout
      accept={videoInputAccept}
      multiple
      onFiles={onFiles}
      dropTitle={queue.items.length ? t.addMoreTitle : t.dropTitle}
      dropHint={queue.items.length ? t.addMoreHint : t.dropHint}
      emptyPreviewText={t.empty}
      actionLabel={hasResults ? t.convertAgain : t.action}
      onAction={() => void convertAll()}
      actionDisabled={!queue.items.length || queue.busy}
      actionLoading={queue.phase !== "idle"}
      downloadLabel={
        doneItems.length > 1 ? interpolate(t.downloadZip, { count: doneItems.length }) : interpolate(t.download, { format: containerLabel })
      }
      onDownload={() => void downloadAll()}
      downloadDisabled={!hasResults || queue.busy}
      error={listError}
      extra={
        <>
          <p className="text-start text-sm text-muted-foreground">{t.privacy}</p>
          {largeFile ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-start text-sm text-muted-foreground">{t.largeFileHint}</p>
          ) : null}
          <FFmpegStatus phase={queue.phase} progress={queue.progress} />
          {queue.phase !== "idle" ? (
            <Button type="button" variant="outline" onClick={queue.cancelAll}>
              {t.cancel}
            </Button>
          ) : null}
          {queue.items.length ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {interpolate(t.filesCount, { count: queue.items.length })}
                {hasResults ? ` · ${interpolate(t.readyCount, { count: doneItems.length })}` : null}
              </p>
              <Button type="button" variant="outline" size="sm" disabled={queue.busy} onClick={queue.resetAll}>
                {t.clearAll}
              </Button>
            </div>
          ) : null}
        </>
      }
      leading={
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{t.unifiedHint}</p>
          <VideoConvertSettings settings={settings} disabled={queue.busy} onChange={onSettings} />
        </div>
      }
      preview={
        queue.items.length ? (
          <div className="space-y-4" aria-busy={queue.busy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={t.filesCountLabel} value={String(queue.items.length)} />
              <Stat label={t.container} value={containerLabel} />
              <Stat
                label={t.output}
                value={doneItems.length ? formatBytes(doneItems.reduce((sum, item) => sum + (item.blob?.size ?? 0), 0)) : "—"}
                valueDir="ltr"
              />
            </div>
            <ConversionQueueList
              items={queue.items}
              busy={queue.busy}
              copy={{
                queueLabel: t.queueLabel,
                removeFile: t.removeFile,
                cancelFile: t.cancelFile,
                download: t.downloadOne,
                statusReady: t.statusReady,
                statusConverting: t.statusConverting,
                statusDone: t.statusDone,
                statusError: t.statusError,
                statusCancelled: t.statusCancelled,
                failed: t.failed,
                failedEngine: t.failedEngine,
                failedNoAudio: t.failedNoAudio,
                failedMemory: t.failedMemory,
              }}
              onRemove={queue.removeItem}
              onCancel={queue.cancelItem}
              onDownload={downloadOne}
              renderPreview={(item) => {
                if (!item.url || !item.downloadName) return null;
                if (item.downloadName.toLowerCase().endsWith(".gif")) {
                  return <img src={item.url} alt="" className="mt-3 max-h-48 rounded-lg" />;
                }
                return <video controls src={item.url} className="mt-3 max-h-64 w-full rounded-lg" preload="metadata" />;
              }}
            />
            {hasResults && doneItems.length > 1 ? (
              <Button type="button" variant="secondary" disabled={queue.busy} onClick={() => void downloadAll()}>
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
