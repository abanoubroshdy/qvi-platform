"use client";

import { useEffect, useRef, useState } from "react";
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

function isVideo(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
}

export function Mp4ToMp3() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AudioExportFormat>("mp3");
  const [settings, setSettings] = useState<AudioExportSettings>(defaultAudioExportSettings);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFormat, setResultFormat] = useState<AudioExportFormat>("mp3");
  const [phase, setPhase] = useState<"idle" | "loading" | "converting">("idle");
  const [progress, setProgress] = useState(0);
  const [errorKind, setErrorKind] = useState<"badFormat" | "engine" | "no-audio" | "memory" | "generic" | null>(null);
  const resultRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  function clearResult() {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    resultRef.current = null;
    setResult(null);
    setResultUrl(null);
  }

  function reset() {
    setErrorKind(null);
    setPhase("idle");
    setProgress(0);
    clearResult();
  }

  function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;
    if (!isVideo(next)) {
      setErrorKind("badFormat");
      return;
    }
    setFile(next);
    setErrorKind(null);
    setPhase("idle");
    clearResult();
  }

  function onFormat(next: AudioExportFormat) {
    setFormat(next);
    setSettings((current) => clampAudioExportSettings(next, current));
    setErrorKind(null);
    clearResult();
  }

  function onSettings(next: AudioExportSettings) {
    setSettings(clampAudioExportSettings(format, next));
    setErrorKind(null);
    clearResult();
  }

  async function convert() {
    if (!file) return;
    setErrorKind(null);
    setPhase("loading");
    setProgress(0);
    try {
      const inputName = inputNameFor(file);
      const spec = audioExportSpec(format, inputName, settings);
      const blob = await runFFmpeg({
        file,
        inputName,
        outputName: spec.outputName,
        mimeType: spec.mimeType,
        args: spec.args,
        fallbackArgs: spec.fallbackArgs,
        onLoadProgress: (ratio) => {
          setPhase("loading");
          setProgress(ratio);
        },
        onProgress: (ratio) => {
          setPhase("converting");
          setProgress(ratio);
        },
      });
      clearResult();
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult(blob);
      setResultUrl(url);
      setResultFormat(format);
      setProgress(1);
    } catch (error) {
      console.error("[mp4-to-mp3]", error, formatFFmpegError(error));
      clearResult();
      setErrorKind(classifyFFmpegFailure(error, { fileBytes: file.size }));
    } finally {
      setPhase("idle");
    }
  }

  const formatLabel = copy.mp4ToMp3.formats[result ? resultFormat : format];
  const error =
    errorKind === "badFormat"
      ? copy.mp4ToMp3.badFormat
      : errorKind === "engine"
        ? copy.mp4ToMp3.failedEngine
        : errorKind === "no-audio"
          ? copy.mp4ToMp3.failedNoAudio
          : errorKind === "memory"
            ? copy.mp4ToMp3.failedMemory
            : errorKind === "generic"
              ? copy.mp4ToMp3.failed
              : null;

  return (
    <ToolLayout
      accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
      onFiles={onFiles}
      dropTitle={file ? copy.mp4ToMp3.replaceTitle : copy.mp4ToMp3.dropTitle}
      dropHint={file ? copy.mp4ToMp3.replaceHint : copy.mp4ToMp3.dropHint}
      emptyPreviewText={copy.mp4ToMp3.empty}
      actionLabel={result ? copy.ffmpeg.newConversion : copy.mp4ToMp3.action}
      onAction={() => (result ? reset() : void convert())}
      actionDisabled={!file}
      actionLoading={phase !== "idle"}
      downloadLabel={interpolate(copy.mp4ToMp3.download, { format: formatLabel })}
      onDownload={() => {
        if (!result || !file) return;
        downloadBlob(result, `${file.name.replace(/\.[^.]+$/, "")}.${resultFormat}`);
      }}
      downloadDisabled={!result || phase !== "idle"}
      error={error}
      extra={
        <>
          {file && file.size >= FFMPEG_LARGE_FILE_BYTES ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-start text-sm text-muted-foreground">{copy.mp4ToMp3.largeFileHint}</p>
          ) : null}
          <FFmpegStatus phase={phase} progress={progress} />
        </>
      }
      leading={
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="space-y-3">
            <Label className="text-start">{copy.mp4ToMp3.format}</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label={copy.mp4ToMp3.format}>
              {audioExportFormats.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={format === item ? "default" : "outline"}
                  onClick={() => onFormat(item)}
                  disabled={phase !== "idle"}
                  aria-pressed={format === item}
                  dir="ltr"
                >
                  {copy.mp4ToMp3.formats[item]}
                </Button>
              ))}
            </div>
          </div>
          <AudioExportSettingsPanel format={format} settings={settings} disabled={phase !== "idle"} onChange={onSettings} />
        </div>
      }
      preview={
        file ? (
          <div className="space-y-4" aria-busy={phase !== "idle"}>
            <div className="min-w-0 space-y-1">
              <p className="text-start text-xs text-muted-foreground">{copy.mp4ToMp3.selectedFile}</p>
              <p className="truncate text-start text-sm font-medium" title={file.name}>
                {file.name}
              </p>
            </div>
            {resultUrl ? (
              <audio controls src={resultUrl} className="w-full" />
            ) : (
              <p className="text-start text-sm text-muted-foreground">
                {phase === "loading"
                  ? copy.ffmpeg.loadingEngine
                  : phase === "converting"
                    ? copy.ffmpeg.converting
                    : copy.mp4ToMp3.waiting}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Stat label={copy.mp4ToMp3.original} value={formatBytes(file.size)} valueDir="ltr" />
              <Stat
                label={interpolate(copy.mp4ToMp3.output, { format: formatLabel })}
                value={result ? formatBytes(result.size) : "—"}
                valueDir="ltr"
              />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
