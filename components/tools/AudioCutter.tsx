"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WaveformPlayer } from "@/components/AudioWaveform";
import { FFmpegStatus } from "@/components/FFmpegStatus";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AudioExportSettingsPanel } from "@/components/tools/AudioExportSettings";
import {
  clampAudioExportSettings,
  defaultAudioExportSettings,
  sampleRatesFor,
  type AudioExportFormat,
  type AudioExportSettings,
} from "@/lib/audio-export";
import { buildTrimExportPlan, maxFadeSeconds } from "@/lib/audio-edit";
import {
  formatAudioExportSummary,
  formatAudioSourceSummary,
  inspectAudioBuffer,
  type AudioSourceInfo,
} from "@/lib/audio-inspect";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { inputNameFor, runFFmpeg } from "@/lib/ffmpeg";
import { interpolate } from "@/lib/i18n";
import { formatClock, parseClock, peaksFromBuffer } from "@/lib/time";

const cutterFormats = ["mp3", "wav"] as const satisfies readonly AudioExportFormat[];
type CutterFormat = (typeof cutterFormats)[number];

function isAudio(file: File) {
  return file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|oga|aac|flac)$/i.test(file.name);
}

function settingsFromSource(info: AudioSourceInfo, format: CutterFormat): AudioExportSettings {
  const channels: 1 | 2 = info.channels >= 2 ? 2 : 1;
  const rates = sampleRatesFor(format);
  const sampleRate = rates.includes(info.sampleRate)
    ? info.sampleRate
    : rates.includes(44100)
      ? 44100
      : rates[0] ?? 44100;
  const bitrate =
    info.estimatedKbps != null && [96, 128, 192, 256, 320].includes(info.estimatedKbps)
      ? info.estimatedKbps
      : 192;
  return clampAudioExportSettings(format, {
    ...defaultAudioExportSettings,
    sampleRate,
    channels,
    bitrate,
  });
}

export function AudioCutter() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<AudioSourceInfo | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [format, setFormat] = useState<CutterFormat>("mp3");
  const [settings, setSettings] = useState<AudioExportSettings>(defaultAudioExportSettings);
  const [baselineBitrate, setBaselineBitrate] = useState(192);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFormat, setResultFormat] = useState<CutterFormat>("mp3");
  const [phase, setPhase] = useState<"idle" | "loading" | "converting">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<string | null>(null);
  const resultRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  const selectionDuration = Math.max(0, end - start);
  const fadeCap = maxFadeSeconds(selectionDuration);
  const safeFadeIn = Math.min(fadeIn, fadeCap);
  const safeFadeOut = Math.min(fadeOut, fadeCap);

  const exportSummary = useMemo(() => {
    const clamped = clampAudioExportSettings(format, settings);
    return formatAudioExportSummary({
      sampleRate: clamped.sampleRate,
      format,
      bitrateKbps: format === "mp3" && clamped.mp3Mode === "cbr" ? clamped.bitrate : null,
      bitDepth: format === "wav" ? clamped.wavBitDepth : null,
    });
  }, [format, settings]);

  function clearResult() {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    resultRef.current = null;
    setResult(null);
    setResultUrl(null);
  }

  function reset() {
    setFile(null);
    setSourceInfo(null);
    setDuration(0);
    setStart(0);
    setEnd(0);
    setFadeIn(0);
    setFadeOut(0);
    setPeaks([]);
    setError(null);
    setPhase("idle");
    setProgress(0);
    setFormat("mp3");
    setSettings(defaultAudioExportSettings);
    setBaselineBitrate(192);
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    sourceRef.current = null;
    setSourceUrl(null);
    clearResult();
  }

  async function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;
    if (!isAudio(next)) {
      setError(copy.audioCutter.badFormat);
      return;
    }
    setError(null);
    setFile(next);
    clearResult();
    setPhase("idle");
    setFadeIn(0);
    setFadeOut(0);
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    const url = URL.createObjectURL(next);
    sourceRef.current = url;
    setSourceUrl(url);

    try {
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(await next.arrayBuffer());
      await context.close();
      const info = inspectAudioBuffer(next, buffer);
      const nextFormat: CutterFormat = info.format === "wav" ? "wav" : "mp3";
      const nextSettings = settingsFromSource(info, nextFormat);
      setSourceInfo(info);
      setDuration(buffer.duration);
      setStart(0);
      setEnd(buffer.duration);
      setPeaks(peaksFromBuffer(buffer));
      setFormat(nextFormat);
      setSettings(nextSettings);
      setBaselineBitrate(nextSettings.bitrate);
    } catch {
      setSourceInfo(null);
      setDuration(0);
      setPeaks([]);
      setError(copy.audioCutter.failedWaveform);
    }
  }

  function clampRange(nextStart: number, nextEnd: number) {
    const max = duration || nextEnd;
    const safeStart = Math.min(Math.max(0, nextStart), Math.max(0, max - 0.1));
    const safeEnd = Math.max(safeStart + 0.1, Math.min(max, nextEnd));
    setStart(safeStart);
    setEnd(safeEnd);
    const nextCap = maxFadeSeconds(safeEnd - safeStart);
    setFadeIn((value) => Math.min(value, nextCap));
    setFadeOut((value) => Math.min(value, nextCap));
    clearResult();
  }

  function onFormat(next: CutterFormat) {
    setFormat(next);
    setSettings((current) => clampAudioExportSettings(next, current));
    clearResult();
  }

  function onSettings(next: AudioExportSettings) {
    setSettings(clampAudioExportSettings(format, next));
    clearResult();
  }

  async function convert() {
    if (!file || end <= start) return;
    setError(null);
    setPhase("loading");
    setProgress(0);
    const inputName = inputNameFor(file);
    const plan = buildTrimExportPlan({
      inputName,
      start,
      end,
      fadeIn: safeFadeIn,
      fadeOut: safeFadeOut,
      format,
      settings,
      sourceSampleRate: sourceInfo?.sampleRate,
      sourceChannels: sourceInfo?.channels,
      bitrateUnchanged: format === "mp3" ? settings.bitrate === baselineBitrate && settings.mp3Mode === "cbr" : true,
    });

    try {
      let blob: Blob | null = null;
      if (plan.copyArgs) {
        try {
          blob = await runFFmpeg({
            file,
            inputName,
            outputName: plan.outputName,
            mimeType: plan.mimeType,
            args: plan.copyArgs,
            onLoadProgress: (ratio) => {
              setPhase("loading");
              setProgress(ratio);
            },
            onProgress: (ratio) => {
              setPhase("converting");
              setProgress(ratio);
            },
          });
        } catch {
          blob = null;
        }
      }
      if (!blob) {
        blob = await runFFmpeg({
          file,
          inputName,
          outputName: plan.outputName,
          mimeType: plan.mimeType,
          args: plan.args,
          fallbackArgs: plan.fallbackArgs,
          onLoadProgress: (ratio) => {
            setPhase("loading");
            setProgress(ratio);
          },
          onProgress: (ratio) => {
            setPhase("converting");
            setProgress(ratio);
          },
        });
      }
      clearResult();
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult(blob);
      setResultUrl(url);
      setResultFormat(plan.extension as CutterFormat);
      setProgress(1);
    } catch {
      clearResult();
      setError(copy.audioCutter.failed);
    } finally {
      setPhase("idle");
    }
  }

  const previewSrc = sourceUrl;
  const formatLabel = copy.mp4ToMp3.formats[result ? resultFormat : format];
  const busy = phase !== "idle";

  return (
    <ToolLayout
      accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/aac,.mp3,.wav,.m4a,.ogg,.oga,.aac,.flac"
      onFiles={(files) => void onFiles(files)}
      dropTitle={copy.audioCutter.dropTitle}
      dropHint={copy.audioCutter.dropHint}
      emptyPreviewText={copy.audioCutter.empty}
      actionLabel={result ? copy.ffmpeg.newConversion : copy.audioCutter.action}
      onAction={() => (result ? reset() : void convert())}
      actionDisabled={!file && !result}
      actionLoading={busy}
      downloadLabel={interpolate(copy.audioCutter.downloadFormat, { format: formatLabel })}
      onDownload={() => {
        if (!result || !file) return;
        downloadBlob(result, `${file.name.replace(/\.[^.]+$/, "")}-trim.${resultFormat}`);
      }}
      downloadDisabled={!result || busy}
      error={error}
      leading={
        file ? (
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <p className="text-start text-xs text-muted-foreground">{copy.audioCutter.sourceQuality}</p>
              <p className="text-start text-sm font-semibold" dir="ltr">
                {sourceInfo ? formatAudioSourceSummary(sourceInfo) : copy.audioCutter.sourceUnknown}
              </p>
              {sourceInfo ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label={copy.audioCutter.duration} value={formatClock(sourceInfo.duration)} valueDir="ltr" />
                  <Stat label={copy.audioCutter.fileSize} value={formatBytes(sourceInfo.bytes)} valueDir="ltr" />
                  <Stat
                    label={copy.mp4ToMp3.sampleRate}
                    value={interpolate(copy.mp4ToMp3.hz, { value: sourceInfo.sampleRate.toLocaleString("en-US") })}
                    valueDir="ltr"
                  />
                  <Stat
                    label={copy.mp4ToMp3.bitrate}
                    value={
                      sourceInfo.estimatedKbps != null
                        ? interpolate(copy.mp4ToMp3.kbps, { value: sourceInfo.estimatedKbps })
                        : "—"
                    }
                    valueDir="ltr"
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <Label className="text-start">{copy.audioCutter.outputFormat}</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label={copy.audioCutter.outputFormat}>
                {cutterFormats.map((item) => (
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

            <AudioExportSettingsPanel format={format} settings={settings} disabled={busy} onChange={onSettings} />

            <p className="text-start text-xs text-muted-foreground" dir="ltr">
              {interpolate(copy.audioCutter.qualityCompare, {
                source: sourceInfo ? formatAudioSourceSummary(sourceInfo) : "—",
                output: exportSummary,
              })}
            </p>
          </div>
        ) : null
      }
      extra={<FFmpegStatus phase={phase} progress={progress} />}
      preview={
        file && duration && previewSrc ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold">{resultUrl ? copy.audioCutter.trimmed : copy.audioCutter.preview}</p>
            <WaveformPlayer
              src={previewSrc}
              peaks={peaks}
              start={start}
              end={end}
              duration={duration}
              onRangeChange={clampRange}
              playLabel={copy.audioCutter.play}
              pauseLabel={copy.audioCutter.pause}
              startHandleLabel={copy.audioCutter.startHandle}
              endHandleLabel={copy.audioCutter.endHandle}
            />
            {resultUrl ? <audio controls src={resultUrl} className="w-full" /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cut-start">{copy.audioCutter.start}</Label>
                <Input
                  id="cut-start"
                  dir="ltr"
                  value={formatClock(start)}
                  disabled={busy}
                  onChange={(event) => clampRange(parseClock(event.target.value, start), end)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cut-end">{copy.audioCutter.end}</Label>
                <Input
                  id="cut-end"
                  dir="ltr"
                  value={formatClock(end)}
                  disabled={busy}
                  onChange={(event) => clampRange(start, parseClock(event.target.value, end))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="fade-in">{copy.audioCutter.fadeIn}</Label>
                  <span className="text-sm font-semibold tabular-nums text-primary" dir="ltr">
                    {safeFadeIn.toFixed(1)}s
                  </span>
                </div>
                <div dir="ltr">
                  <Slider
                    id="fade-in"
                    min={0}
                    max={Math.max(0.1, fadeCap)}
                    step={0.1}
                    value={[safeFadeIn]}
                    disabled={busy || fadeCap <= 0}
                    onValueChange={(value) => {
                      setFadeIn(Math.min(fadeCap, value[0] ?? 0));
                      clearResult();
                    }}
                    aria-label={copy.audioCutter.fadeIn}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="fade-out">{copy.audioCutter.fadeOut}</Label>
                  <span className="text-sm font-semibold tabular-nums text-primary" dir="ltr">
                    {safeFadeOut.toFixed(1)}s
                  </span>
                </div>
                <div dir="ltr">
                  <Slider
                    id="fade-out"
                    min={0}
                    max={Math.max(0.1, fadeCap)}
                    step={0.1}
                    value={[safeFadeOut]}
                    disabled={busy || fadeCap <= 0}
                    onValueChange={(value) => {
                      setFadeOut(Math.min(fadeCap, value[0] ?? 0));
                      clearResult();
                    }}
                    aria-label={copy.audioCutter.fadeOut}
                  />
                </div>
              </div>
            </div>
            <p className="text-start text-xs text-muted-foreground">{copy.audioCutter.fadeHint}</p>
          </div>
        ) : undefined
      }
    />
  );
}
