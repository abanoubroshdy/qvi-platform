"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WaveformPlayer } from "@/components/AudioWaveform";
import { FFmpegStatus } from "@/components/FFmpegStatus";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { AudioClipList } from "@/components/tools/AudioClipList";
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
import {
  DEFAULT_GAIN_DB,
  DEFAULT_SPLICE_FADE,
  MAX_GAIN_DB,
  MAX_SPLICE_FADE,
  MIN_GAIN_DB,
  buildAmixExportPlan,
  buildConcatExportPlan,
  buildTrimExportPlan,
  clampGainDb,
  clampSpliceFade,
  estimateAmixDuration,
  estimateConcatDuration,
  maxFadeSeconds,
  trimFadeFilter,
} from "@/lib/audio-edit";
import {
  formatAudioExportSummary,
  formatAudioSourceSummary,
  inspectAudioBuffer,
  type AudioContainerFormat,
  type AudioSourceInfo,
} from "@/lib/audio-inspect";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { FFMPEG_LARGE_FILE_BYTES, inputNameFor, runFFmpeg, runFFmpegFiles } from "@/lib/ffmpeg";
import { interpolate } from "@/lib/i18n";
import { formatClock, parseClock, peaksFromBuffer } from "@/lib/time";

const cutterFormats = ["mp3", "wav"] as const satisfies readonly AudioExportFormat[];
type CutterFormat = (typeof cutterFormats)[number];
type ExportMode = "clip" | "concat" | "mix";

type AudioClip = {
  id: string;
  file: File;
  url: string;
  duration: number;
  sampleRate: number;
  channels: number;
  estimatedKbps: number | null;
  container: AudioContainerFormat;
  bytes: number;
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
  /** Mix-mode gain in dB (0 = unity). */
  gainDb: number;
  peaks: number[];
  decodeFailed: boolean;
};

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

function clipToSourceInfo(clip: AudioClip): AudioSourceInfo {
  return {
    duration: clip.duration,
    sampleRate: clip.sampleRate,
    channels: clip.channels,
    format: clip.container,
    bytes: clip.bytes,
    estimatedKbps: clip.estimatedKbps,
  };
}

function qualityLabelFor(clip: AudioClip) {
  if (clip.decodeFailed || !clip.sampleRate) return "—";
  return formatAudioSourceSummary(clipToSourceInfo(clip));
}

async function decodeClip(file: File): Promise<AudioClip> {
  const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 9)}`;
  const url = URL.createObjectURL(file);
  try {
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    await context.close();
    const info = inspectAudioBuffer(file, buffer);
    return {
      id,
      file,
      url,
      duration: info.duration,
      sampleRate: info.sampleRate,
      channels: info.channels,
      estimatedKbps: info.estimatedKbps,
      container: info.format,
      bytes: info.bytes,
      start: 0,
      end: info.duration,
      fadeIn: 0,
      fadeOut: 0,
      gainDb: DEFAULT_GAIN_DB,
      peaks: peaksFromBuffer(buffer),
      decodeFailed: false,
    };
  } catch {
    return {
      id,
      file,
      url,
      duration: 0,
      sampleRate: 0,
      channels: 0,
      estimatedKbps: null,
      container: "unknown",
      bytes: file.size,
      start: 0,
      end: 0,
      fadeIn: 0,
      fadeOut: 0,
      gainDb: DEFAULT_GAIN_DB,
      peaks: [],
      decodeFailed: true,
    };
  }
}

function patchClip(clips: AudioClip[], id: string, patch: Partial<AudioClip>) {
  return clips.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip));
}

function stemName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") || "audio";
}

function downloadStem(clips: AudioClip[], mode: ExportMode) {
  if (mode === "concat" && clips.length > 1) {
    const a = stemName(clips[0]!.file.name);
    const b = stemName(clips[1]!.file.name);
    const extra = clips.length > 2 ? `+${clips.length - 2}` : "";
    return `${a}+${b}${extra}-joined`;
  }
  if (mode === "mix" && clips.length > 1) {
    const a = stemName(clips[0]!.file.name);
    const b = stemName(clips[1]!.file.name);
    const extra = clips.length > 2 ? `+${clips.length - 2}` : "";
    return `${a}+${b}${extra}-mixed`;
  }
  return `${stemName(clips[0]?.file.name ?? "clip")}-trim`;
}

async function peaksFromBlob(blob: Blob): Promise<{ peaks: number[]; duration: number }> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    return { peaks: peaksFromBuffer(buffer), duration: buffer.duration };
  } finally {
    await context.close();
  }
}

export function AudioCutter() {
  const { copy } = useI18n();
  const [clips, setClips] = useState<AudioClip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ExportMode>("clip");
  const [spliceFade, setSpliceFade] = useState(DEFAULT_SPLICE_FADE);
  const [format, setFormat] = useState<CutterFormat>("mp3");
  const [settings, setSettings] = useState<AudioExportSettings>(defaultAudioExportSettings);
  const [baselineBitrate, setBaselineBitrate] = useState(192);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFormat, setResultFormat] = useState<CutterFormat>("mp3");
  const [resultPeaks, setResultPeaks] = useState<number[]>([]);
  const [resultDuration, setResultDuration] = useState(0);
  const [phase, setPhase] = useState<"idle" | "loading" | "converting">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<string | null>(null);
  const clipsRef = useRef<AudioClip[]>([]);

  clipsRef.current = clips;

  useEffect(() => {
    return () => {
      clipsRef.current.forEach((clip) => URL.revokeObjectURL(clip.url));
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  const selected = clips.find((clip) => clip.id === selectedId) ?? null;
  const selectionDuration = selected ? Math.max(0, selected.end - selected.start) : 0;
  const fadeCap = maxFadeSeconds(selectionDuration);
  const safeFadeIn = selected ? Math.min(selected.fadeIn, fadeCap) : 0;
  const safeFadeOut = selected ? Math.min(selected.fadeOut, fadeCap) : 0;
  const totalBytes = clips.reduce((sum, clip) => sum + clip.bytes, 0);
  const largeFiles = totalBytes >= FFMPEG_LARGE_FILE_BYTES;

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
    setResultPeaks([]);
    setResultDuration(0);
  }

  function revokeClips(next: AudioClip[]) {
    next.forEach((clip) => URL.revokeObjectURL(clip.url));
  }

  function reset() {
    revokeClips(clips);
    setClips([]);
    setSelectedId(null);
    setMode("clip");
    setSpliceFade(DEFAULT_SPLICE_FADE);
    setError(null);
    setPhase("idle");
    setProgress(0);
    setFormat("mp3");
    setSettings(defaultAudioExportSettings);
    setBaselineBitrate(192);
    clearResult();
  }

  function applyExportDefaultsFromClip(clip: AudioClip) {
    if (clip.decodeFailed || !clip.sampleRate) return;
    const info = clipToSourceInfo(clip);
    const nextFormat: CutterFormat = info.format === "wav" ? "wav" : "mp3";
    const nextSettings = settingsFromSource(info, nextFormat);
    setFormat(nextFormat);
    setSettings(nextSettings);
    setBaselineBitrate(nextSettings.bitrate);
  }

  async function onFiles(incoming: File[]) {
    const audioFiles = incoming.filter(isAudio);
    if (!audioFiles.length) {
      setError(copy.audioCutter.badFormat);
      return;
    }

    setError(null);
    setPhase("idle");
    clearResult();

    const decoded = await Promise.all(audioFiles.map((file) => decodeClip(file)));
    const hadClips = clips.length > 0;
    setClips((current) => [...current, ...decoded]);
    if (!hadClips) {
      setSelectedId(decoded[0]?.id ?? null);
      const firstOk = decoded.find((clip) => !clip.decodeFailed);
      if (firstOk) applyExportDefaultsFromClip(firstOk);
    } else if (!selectedId) {
      setSelectedId(decoded[0]?.id ?? null);
    }
    if (decoded.some((clip) => clip.decodeFailed)) {
      setError(copy.audioCutter.failedWaveform);
    }
  }

  function selectClip(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    clearResult();
  }

  function moveClip(id: string, direction: -1 | 1) {
    setClips((current) => {
      const index = current.findIndex((clip) => clip.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const a = next[index];
      const b = next[nextIndex];
      if (!a || !b) return current;
      next[index] = b;
      next[nextIndex] = a;
      return next;
    });
    clearResult();
  }

  function removeClip(id: string) {
    const target = clips.find((clip) => clip.id === id);
    if (target) URL.revokeObjectURL(target.url);
    const next = clips.filter((clip) => clip.id !== id);
    setClips(next);
    setSelectedId((selected) => (selected === id ? next[0]?.id ?? null : selected));
    clearResult();
  }

  function updateSelected(patch: Partial<AudioClip>) {
    if (!selectedId) return;
    setClips((current) => patchClip(current, selectedId, patch));
    clearResult();
  }

  function clampRange(nextStart: number, nextEnd: number) {
    if (!selected) return;
    const max = selected.duration || nextEnd;
    const safeStart = Math.min(Math.max(0, nextStart), Math.max(0, max - 0.1));
    const safeEnd = Math.max(safeStart + 0.1, Math.min(max, nextEnd));
    const nextCap = maxFadeSeconds(safeEnd - safeStart);
    updateSelected({
      start: safeStart,
      end: safeEnd,
      fadeIn: Math.min(selected.fadeIn, nextCap),
      fadeOut: Math.min(selected.fadeOut, nextCap),
    });
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

  function onMode(next: ExportMode) {
    setMode(next);
    clearResult();
  }

  const exportableClips = clips.filter((clip) => !clip.decodeFailed && clip.end > clip.start && clip.duration > 0);
  const selectionDurations = exportableClips.map((clip) => trimFadeFilter(clip).duration);
  const effectiveSplice = clampSpliceFade(spliceFade, selectionDurations);
  const joinedDuration = estimateConcatDuration(selectionDurations, effectiveSplice);
  const mixedDuration = estimateAmixDuration(selectionDurations);
  const safeGainDb = selected ? clampGainDb(selected.gainDb) : DEFAULT_GAIN_DB;
  const multiExport = mode === "concat" || mode === "mix";

  function progressHandlers() {
    return {
      onLoadProgress: (ratio: number) => {
        setPhase("loading");
        setProgress(ratio);
      },
      onProgress: (ratio: number) => {
        setPhase("converting");
        setProgress(ratio);
      },
    };
  }

  async function convertSelectedClip(clip: AudioClip) {
    const inputName = inputNameFor(clip.file);
    const fadeCapForClip = maxFadeSeconds(Math.max(0, clip.end - clip.start));
    const plan = buildTrimExportPlan({
      inputName,
      start: clip.start,
      end: clip.end,
      fadeIn: Math.min(clip.fadeIn, fadeCapForClip),
      fadeOut: Math.min(clip.fadeOut, fadeCapForClip),
      format,
      settings,
      sourceSampleRate: clip.sampleRate || null,
      sourceChannels: clip.channels || null,
      bitrateUnchanged: format === "mp3" ? settings.bitrate === baselineBitrate && settings.mp3Mode === "cbr" : true,
    });
    const handlers = progressHandlers();
    let blob: Blob | null = null;
    if (plan.copyArgs) {
      try {
        blob = await runFFmpeg({
          file: clip.file,
          inputName,
          outputName: plan.outputName,
          mimeType: plan.mimeType,
          args: plan.copyArgs,
          ...handlers,
        });
      } catch {
        blob = null;
      }
    }
    if (!blob) {
      blob = await runFFmpeg({
        file: clip.file,
        inputName,
        outputName: plan.outputName,
        mimeType: plan.mimeType,
        args: plan.args,
        fallbackArgs: plan.fallbackArgs,
        ...handlers,
      });
    }
    return { blob, extension: plan.extension as CutterFormat };
  }

  async function convertJoined() {
    if (exportableClips.length < 1) throw new Error("no-clips");
    if (exportableClips.length === 1) {
      return convertSelectedClip(exportableClips[0]!);
    }
    const inputs = exportableClips.map((clip, index) => ({
      name: inputNameFor(clip.file, `input${index}`),
      file: clip.file,
    }));
    const plan = buildConcatExportPlan({
      clips: exportableClips.map((clip, index) => ({
        inputName: inputs[index]!.name,
        start: clip.start,
        end: clip.end,
        fadeIn: Math.min(clip.fadeIn, maxFadeSeconds(Math.max(0, clip.end - clip.start))),
        fadeOut: Math.min(clip.fadeOut, maxFadeSeconds(Math.max(0, clip.end - clip.start))),
      })),
      format,
      settings,
      spliceFade: effectiveSplice,
    });
    const blob = await runFFmpegFiles({
      files: inputs,
      outputName: plan.outputName,
      mimeType: plan.mimeType,
      args: plan.args,
      fallbackArgs: plan.fallbackArgs,
      ...progressHandlers(),
    });
    return { blob, extension: plan.extension as CutterFormat };
  }

  async function convertMixed() {
    if (exportableClips.length < 1) throw new Error("no-clips");
    if (exportableClips.length === 1) {
      return convertSelectedClip(exportableClips[0]!);
    }
    const inputs = exportableClips.map((clip, index) => ({
      name: inputNameFor(clip.file, `input${index}`),
      file: clip.file,
    }));
    const plan = buildAmixExportPlan({
      clips: exportableClips.map((clip, index) => ({
        inputName: inputs[index]!.name,
        start: clip.start,
        end: clip.end,
        fadeIn: Math.min(clip.fadeIn, maxFadeSeconds(Math.max(0, clip.end - clip.start))),
        fadeOut: Math.min(clip.fadeOut, maxFadeSeconds(Math.max(0, clip.end - clip.start))),
        gainDb: clampGainDb(clip.gainDb),
      })),
      format,
      settings,
    });
    const blob = await runFFmpegFiles({
      files: inputs,
      outputName: plan.outputName,
      mimeType: plan.mimeType,
      args: plan.args,
      fallbackArgs: plan.fallbackArgs,
      ...progressHandlers(),
    });
    return { blob, extension: plan.extension as CutterFormat };
  }

  async function convert() {
    if (mode === "clip" && (!selected || selected.end <= selected.start)) return;
    if (multiExport && exportableClips.length < 1) return;
    setError(null);
    setPhase("loading");
    setProgress(0);
    try {
      const { blob, extension } =
        mode === "mix"
          ? await convertMixed()
          : mode === "concat"
            ? await convertJoined()
            : await convertSelectedClip(selected!);
      clearResult();
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult(blob);
      setResultUrl(url);
      setResultFormat(extension);
      setProgress(1);
      try {
        const preview = await peaksFromBlob(blob);
        setResultPeaks(preview.peaks);
        setResultDuration(preview.duration);
      } catch {
        setResultPeaks([]);
        setResultDuration(0);
      }
    } catch {
      clearResult();
      setError(
        mode === "mix"
          ? copy.audioCutter.failedMix
          : mode === "concat"
            ? copy.audioCutter.failedJoin
            : copy.audioCutter.failed,
      );
    } finally {
      setPhase("idle");
    }
  }

  const formatLabel = copy.mp4ToMp3.formats[result ? resultFormat : format];
  const busy = phase !== "idle";
  const sourceInfo = selected && !selected.decodeFailed ? clipToSourceInfo(selected) : null;
  const canRun = multiExport ? exportableClips.length >= 1 : Boolean(selected && selected.end > selected.start);
  const actionLabel = result
    ? copy.audioCutter.exportAgain
    : mode === "mix"
      ? copy.audioCutter.actionMix
      : mode === "concat"
        ? copy.audioCutter.actionJoin
        : copy.audioCutter.action;
  const modeHint =
    mode === "mix"
      ? copy.audioCutter.modeMixHint
      : mode === "concat"
        ? copy.audioCutter.modeConcatHint
        : copy.audioCutter.modeClipHint;
  const resultTitle =
    mode === "mix" && exportableClips.length > 1
      ? copy.audioCutter.mixedReady
      : mode === "concat" && exportableClips.length > 1
        ? copy.audioCutter.joinedReady
        : copy.audioCutter.trimmed;
  const dropTitle = clips.length ? copy.audioCutter.addMoreTitle : copy.audioCutter.dropTitle;
  const dropHint = clips.length ? copy.audioCutter.addMoreHint : copy.audioCutter.dropHint;

  return (
    <ToolLayout
      accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/aac,.mp3,.wav,.m4a,.ogg,.oga,.aac,.flac"
      multiple
      onFiles={(files) => {
        if (busy) return;
        void onFiles(files);
      }}
      dropTitle={dropTitle}
      dropHint={dropHint}
      emptyPreviewText={copy.audioCutter.empty}
      actionLabel={actionLabel}
      onAction={() => (result ? clearResult() : void convert())}
      actionDisabled={!canRun && !result}
      actionLoading={busy}
      downloadLabel={interpolate(copy.audioCutter.downloadFormat, { format: formatLabel })}
      onDownload={() => {
        if (!result) return;
        const name = downloadStem(
          multiExport && exportableClips.length > 1 ? exportableClips : selected ? [selected] : exportableClips,
          mode,
        );
        downloadBlob(result, `${name}.${resultFormat}`);
      }}
      downloadDisabled={!result || busy}
      error={error}
      leading={
        clips.length ? (
          <div className="space-y-4">
            <AudioClipList
              clips={clips.map((clip) => ({
                id: clip.id,
                name: clip.file.name,
                bytes: clip.bytes,
                duration: clip.duration,
                qualityLabel: qualityLabelFor(clip),
                decodeFailed: clip.decodeFailed,
                selectionLabel:
                  mode === "mix"
                    ? `${interpolate(copy.audioCutter.selectionRange, {
                        start: formatClock(clip.start),
                        end: formatClock(clip.end),
                      })} · ${interpolate(copy.audioCutter.gainLabel, {
                        value: clampGainDb(clip.gainDb).toFixed(0),
                      })}`
                    : interpolate(copy.audioCutter.selectionRange, {
                        start: formatClock(clip.start),
                        end: formatClock(clip.end),
                      }),
              }))}
              selectedId={selectedId}
              disabled={busy}
              filesLabel={interpolate(copy.audioCutter.filesCount, { count: clips.length })}
              moveUpLabel={copy.audioCutter.moveUp}
              moveDownLabel={copy.audioCutter.moveDown}
              removeLabel={copy.audioCutter.removeClip}
              selectedHint={copy.audioCutter.selectedHint}
              decodeFailedLabel={copy.audioCutter.decodeFailedClip}
              onSelect={selectClip}
              onMove={moveClip}
              onRemove={removeClip}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={reset} disabled={busy}>
                {copy.audioCutter.clearAll}
              </Button>
            </div>

            <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
              <div className="space-y-3">
                <Label className="text-start">{copy.audioCutter.exportMode}</Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label={copy.audioCutter.exportMode}>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "clip" ? "default" : "outline"}
                    onClick={() => onMode("clip")}
                    disabled={busy}
                    aria-pressed={mode === "clip"}
                  >
                    {copy.audioCutter.modeClip}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "concat" ? "default" : "outline"}
                    onClick={() => onMode("concat")}
                    disabled={busy || clips.length < 1}
                    aria-pressed={mode === "concat"}
                  >
                    {copy.audioCutter.modeConcat}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "mix" ? "default" : "outline"}
                    onClick={() => onMode("mix")}
                    disabled={busy || clips.length < 1}
                    aria-pressed={mode === "mix"}
                  >
                    {copy.audioCutter.modeMix}
                  </Button>
                </div>
                <p className="text-start text-xs text-muted-foreground">{modeHint}</p>
              </div>

              {mode === "concat" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Stat label={copy.audioCutter.filesCountLabel} value={`${exportableClips.length}`} />
                    <Stat label={copy.audioCutter.joinedDuration} value={formatClock(joinedDuration)} valueDir="ltr" />
                    <Stat label={copy.audioCutter.spliceFade} value={`${effectiveSplice.toFixed(2)}s`} valueDir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="splice-fade">{copy.audioCutter.spliceFade}</Label>
                      <span className="text-sm font-semibold tabular-nums text-primary" dir="ltr">
                        {effectiveSplice.toFixed(2)}s
                      </span>
                    </div>
                    <div dir="ltr">
                      <Slider
                        id="splice-fade"
                        min={0}
                        max={MAX_SPLICE_FADE}
                        step={0.01}
                        value={[Math.min(MAX_SPLICE_FADE, spliceFade)]}
                        disabled={busy || exportableClips.length < 2}
                        onValueChange={(value) => {
                          setSpliceFade(value[0] ?? 0);
                          clearResult();
                        }}
                        aria-label={copy.audioCutter.spliceFade}
                      />
                    </div>
                    <p className="text-start text-xs text-muted-foreground">{copy.audioCutter.spliceFadeHint}</p>
                  </div>
                </div>
              ) : null}

              {mode === "mix" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Stat label={copy.audioCutter.filesCountLabel} value={`${exportableClips.length}`} />
                    <Stat label={copy.audioCutter.mixedDuration} value={formatClock(mixedDuration)} valueDir="ltr" />
                    <Stat
                      label={copy.audioCutter.selectedGain}
                      value={`${safeGainDb >= 0 ? "+" : ""}${safeGainDb.toFixed(0)} dB`}
                      valueDir="ltr"
                    />
                  </div>
                  <p className="text-start text-xs text-muted-foreground">{copy.audioCutter.mixAlignHint}</p>
                </div>
              ) : null}

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
          </div>
        ) : null
      }
      extra={
        <>
          {largeFiles ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-start text-sm text-muted-foreground">
              {copy.audioCutter.largeFileHint}
            </p>
          ) : null}
          <FFmpegStatus phase={phase} progress={progress} />
        </>
      }
      preview={
        resultUrl ? (
          <div className="space-y-4" aria-busy={busy}>
            <p className="text-sm font-semibold">{resultTitle}</p>
            {resultPeaks.length && resultDuration > 0 ? (
              <WaveformPlayer
                src={resultUrl}
                peaks={resultPeaks}
                start={0}
                end={resultDuration}
                duration={resultDuration}
                readOnly
                disabled={busy}
                playLabel={copy.audioCutter.play}
                pauseLabel={copy.audioCutter.pause}
                startHandleLabel={copy.audioCutter.startHandle}
                endHandleLabel={copy.audioCutter.endHandle}
              />
            ) : (
              <audio controls src={resultUrl} className="w-full" />
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={copy.audioCutter.duration} value={formatClock(resultDuration || 0)} valueDir="ltr" />
              <Stat
                label={interpolate(copy.audioCutter.outputSize, { format: formatLabel })}
                value={result ? formatBytes(result.size) : "—"}
                valueDir="ltr"
              />
              <Stat label={copy.audioCutter.filesCountLabel} value={`${exportableClips.length || 1}`} />
            </div>
            <p className="text-start text-xs text-muted-foreground">{copy.audioCutter.exportAgainHint}</p>
          </div>
        ) : selected && selected.duration > 0 ? (
          <div className="space-y-4" aria-busy={busy}>
            <p className="text-sm font-semibold">{copy.audioCutter.preview}</p>
            <p className="truncate text-xs text-muted-foreground" title={selected.file.name}>
              {mode === "concat" && exportableClips.length > 1
                ? interpolate(copy.audioCutter.editingForJoin, { name: selected.file.name })
                : mode === "mix" && exportableClips.length > 1
                  ? interpolate(copy.audioCutter.editingForMix, { name: selected.file.name })
                  : selected.file.name}
            </p>
            <WaveformPlayer
              src={selected.url}
              peaks={selected.peaks}
              start={selected.start}
              end={selected.end}
              duration={selected.duration}
              onRangeChange={clampRange}
              disabled={busy}
              playLabel={copy.audioCutter.play}
              pauseLabel={copy.audioCutter.pause}
              startHandleLabel={copy.audioCutter.startHandle}
              endHandleLabel={copy.audioCutter.endHandle}
            />
            {busy ? (
              <p className="text-start text-sm text-muted-foreground">
                {phase === "loading"
                  ? copy.ffmpeg.loadingEngine
                  : mode === "mix"
                    ? copy.audioCutter.convertingMix
                    : mode === "concat"
                      ? copy.audioCutter.convertingJoin
                      : copy.ffmpeg.converting}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cut-start">{copy.audioCutter.start}</Label>
                <Input
                  id="cut-start"
                  dir="ltr"
                  value={formatClock(selected.start)}
                  disabled={busy}
                  onChange={(event) => clampRange(parseClock(event.target.value, selected.start), selected.end)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cut-end">{copy.audioCutter.end}</Label>
                <Input
                  id="cut-end"
                  dir="ltr"
                  value={formatClock(selected.end)}
                  disabled={busy}
                  onChange={(event) => clampRange(selected.start, parseClock(event.target.value, selected.end))}
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
                    onValueChange={(value) => updateSelected({ fadeIn: Math.min(fadeCap, value[0] ?? 0) })}
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
                    onValueChange={(value) => updateSelected({ fadeOut: Math.min(fadeCap, value[0] ?? 0) })}
                    aria-label={copy.audioCutter.fadeOut}
                  />
                </div>
              </div>
            </div>
            <p className="text-start text-xs text-muted-foreground">{copy.audioCutter.fadeHint}</p>
            {mode === "mix" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="clip-gain">{copy.audioCutter.gain}</Label>
                  <span className="text-sm font-semibold tabular-nums text-primary" dir="ltr">
                    {safeGainDb >= 0 ? "+" : ""}
                    {safeGainDb.toFixed(0)} dB
                  </span>
                </div>
                <div dir="ltr">
                  <Slider
                    id="clip-gain"
                    min={MIN_GAIN_DB}
                    max={MAX_GAIN_DB}
                    step={1}
                    value={[safeGainDb]}
                    disabled={busy}
                    onValueChange={(value) => updateSelected({ gainDb: clampGainDb(value[0] ?? DEFAULT_GAIN_DB) })}
                    aria-label={copy.audioCutter.gain}
                  />
                </div>
                <p className="text-start text-xs text-muted-foreground">{copy.audioCutter.gainHint}</p>
              </div>
            ) : null}
          </div>
        ) : selected?.decodeFailed ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{selected.file.name}</p>
            <p className="text-sm text-destructive">{copy.audioCutter.decodeFailedClip}</p>
          </div>
        ) : clips.length ? (
          <p className="text-sm text-muted-foreground">{copy.audioCutter.selectClipHint}</p>
        ) : undefined
      }
    />
  );
}
