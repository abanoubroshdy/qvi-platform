"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WaveformPlayer } from "@/components/AudioWaveform";
import { FFmpegStatus } from "@/components/FFmpegStatus";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { AudioExportSettingsPanel } from "@/components/tools/AudioExportSettings";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  clampAudioExportSettings,
  defaultAudioExportSettings,
  sampleRatesFor,
  type AudioExportFormat,
  type AudioExportSettings,
} from "@/lib/audio-export";
import {
  formatAudioExportSummary,
  formatAudioSourceSummary,
  inspectAudioBuffer,
  type AudioSourceInfo,
} from "@/lib/audio-inspect";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { FFMPEG_LARGE_FILE_BYTES, inputNameFor, runFFmpeg } from "@/lib/ffmpeg";
import { interpolate } from "@/lib/i18n";
import { peaksFromBuffer } from "@/lib/time";
import {
  MAX_CENTS,
  MAX_SEMITONES,
  MAX_TEMPO_PERCENT,
  MIN_CENTS,
  MIN_SEMITONES,
  MIN_TEMPO_PERCENT,
  appendTap,
  bpmDelta,
  buildTempoPitchExportPlan,
  clampCents,
  clampSemitones,
  clampTempoPercent,
  formatBpmDraft,
  formatSignedDraft,
  parseBpmDraft,
  parseCentsDraft,
  parseSemitonesDraft,
  pitchRatio,
  resolveTempoRate,
  sanitizeBpmDraftInput,
  sanitizeSignedDraftInput,
  tapBpmFromTimestamps,
  totalCents,
  type TempoMode,
} from "@/lib/audio-tempo";

const exportFormats = ["mp3", "wav"] as const satisfies readonly AudioExportFormat[];
type ToolFormat = (typeof exportFormats)[number];

type LoadedAudio = {
  file: File;
  url: string;
  duration: number;
  sampleRate: number;
  channels: number;
  peaks: number[];
  source: AudioSourceInfo;
  decodeFailed: boolean;
};

function isAudio(file: File) {
  return file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|oga|aac|flac)$/i.test(file.name);
}

function settingsFromSource(info: AudioSourceInfo, format: ToolFormat): AudioExportSettings {
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

async function decodeAudio(file: File): Promise<LoadedAudio> {
  const url = URL.createObjectURL(file);
  try {
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    await context.close().catch(() => undefined);
    const source = inspectAudioBuffer(file, buffer);
    return {
      file,
      url,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      peaks: peaksFromBuffer(buffer, 600),
      source,
      decodeFailed: false,
    };
  } catch {
    return {
      file,
      url,
      duration: 0,
      sampleRate: 44100,
      channels: 2,
      peaks: [],
      source: {
        duration: 0,
        sampleRate: 0,
        channels: 0,
        format: "unknown",
        bytes: file.size,
        estimatedKbps: null,
      },
      decodeFailed: true,
    };
  }
}

async function peaksFromBlob(blob: Blob): Promise<number[]> {
  try {
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    await context.close().catch(() => undefined);
    return peaksFromBuffer(buffer, 600);
  } catch {
    return [];
  }
}

function formatRate(rate: number): string {
  return `×${rate.toFixed(3).replace(/\.?0+$/, "")}`;
}

function formatSigned(value: number, suffix: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

export function TempoPitch() {
  const { copy } = useI18n();
  const t = copy.tempoPitch;

  const [audio, setAudio] = useState<LoadedAudio | null>(null);
  const [format, setFormat] = useState<ToolFormat>("mp3");
  const [settings, setSettings] = useState<AudioExportSettings>(defaultAudioExportSettings);
  const [mode, setMode] = useState<TempoMode>("bpm");
  const [originalBpm, setOriginalBpm] = useState(120);
  const [targetBpm, setTargetBpm] = useState(120);
  const [originalBpmText, setOriginalBpmText] = useState(() => formatBpmDraft(120));
  const [targetBpmText, setTargetBpmText] = useState(() => formatBpmDraft(120));
  const [percent, setPercent] = useState(0);
  const [semitones, setSemitones] = useState(0);
  const [cents, setCents] = useState(0);
  const [semitonesText, setSemitonesText] = useState(() => formatSignedDraft(0));
  const [centsText, setCentsText] = useState(() => formatSignedDraft(0));
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [tapCount, setTapCount] = useState(0);

  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPeaks, setResultPeaks] = useState<number[]>([]);
  const [resultDuration, setResultDuration] = useState(0);
  const [phase, setPhase] = useState<"idle" | "loading" | "converting">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const previewGenRef = useRef(0);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewGenRef.current += 1;
    };
  }, []);

  const tempoRate = useMemo(
    () => resolveTempoRate({ mode, originalBpm, targetBpm, percent }),
    [mode, originalBpm, targetBpm, percent],
  );
  const ratio = useMemo(() => pitchRatio(semitones, cents), [semitones, cents]);
  const deltaBpm = useMemo(() => bpmDelta(originalBpm, targetBpm), [originalBpm, targetBpm]);
  const centsTotal = useMemo(() => totalCents(semitones, cents), [semitones, cents]);
  const isIdentityTransform = Math.abs(tempoRate - 1) < 1e-6 && semitones === 0 && cents === 0;

  function clearResult() {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
    setResultUrl(null);
    setResultPeaks([]);
    setResultDuration(0);
  }

  const processAudio = useCallback(
    async (options: {
      file: LoadedAudio;
      mode: TempoMode;
      originalBpm: number;
      targetBpm: number;
      percent: number;
      semitones: number;
      cents: number;
      format: ToolFormat;
      settings: AudioExportSettings;
    }) => {
      const gen = ++previewGenRef.current;
      setError(null);
      clearResult();
      setPhase("loading");
      setProgress(0);

      try {
        const inputName = inputNameFor(options.file.file);
        const plan = buildTempoPitchExportPlan({
          inputName,
          sourceDuration: options.file.duration,
          sampleRate: options.file.sampleRate || options.settings.sampleRate,
          mode: options.mode,
          originalBpm: options.originalBpm,
          targetBpm: options.targetBpm,
          percent: options.percent,
          semitones: options.semitones,
          cents: options.cents,
          format: options.format,
          settings: options.settings,
        });

        const blob = await runFFmpeg({
          file: options.file.file,
          inputName,
          outputName: plan.outputName,
          mimeType: plan.mimeType,
          args: plan.args,
          fallbackArgs: plan.fallbackArgs,
          onLoadProgress: (ratioValue) => {
            if (gen !== previewGenRef.current) return;
            setPhase("loading");
            setProgress(ratioValue);
          },
          onProgress: (ratioValue) => {
            if (gen !== previewGenRef.current) return;
            setPhase("converting");
            setProgress(ratioValue);
          },
        });

        if (gen !== previewGenRef.current) return;

        const url = URL.createObjectURL(blob);
        resultUrlRef.current = url;
        setResult(blob);
        setResultUrl(url);
        setResultDuration(plan.estimatedDuration);
        setResultPeaks(await peaksFromBlob(blob));
        setProgress(1);
      } catch {
        if (gen !== previewGenRef.current) return;
        setError(t.failed);
      } finally {
        if (gen === previewGenRef.current) setPhase("idle");
      }
    },
    [t.failed],
  );

  function cancelPendingPreview() {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    previewGenRef.current += 1;
  }

  useEffect(() => {
    if (!audio || audio.decodeFailed) return;

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    if (isIdentityTransform) {
      cancelPendingPreview();
      clearResult();
      setPhase("idle");
      setProgress(0);
      return;
    }

    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      void processAudio({
        file: audio,
        mode,
        originalBpm,
        targetBpm,
        percent,
        semitones,
        cents,
        format,
        settings,
      });
    }, 700);

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, [
    audio,
    mode,
    originalBpm,
    targetBpm,
    percent,
    semitones,
    cents,
    format,
    settings,
    isIdentityTransform,
    processAudio,
  ]);

  async function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;
    if (!isAudio(next)) {
      setError(t.badFormat);
      return;
    }

    setError(null);
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    previewGenRef.current += 1;
    clearResult();
    setPhase("idle");
    setProgress(0);

    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const loaded = await decodeAudio(next);
    audioUrlRef.current = loaded.url;
    setAudio(loaded);
    if (loaded.decodeFailed) {
      setError(t.decodeFailed);
      setSettings(defaultAudioExportSettings);
      return;
    }
    setSettings(settingsFromSource(loaded.source, format));
  }

  function commitOriginalBpm(text: string = originalBpmText) {
    const parsed = parseBpmDraft(text);
    const next = parsed ?? originalBpm;
    setOriginalBpm(next);
    setOriginalBpmText(formatBpmDraft(next));
    return next;
  }

  function commitTargetBpm(text: string = targetBpmText) {
    const parsed = parseBpmDraft(text);
    const next = parsed ?? targetBpm;
    setTargetBpm(next);
    setTargetBpmText(formatBpmDraft(next));
    return next;
  }

  function commitSemitones(text: string = semitonesText) {
    const parsed = parseSemitonesDraft(text);
    const next = parsed ?? semitones;
    setSemitones(next);
    setSemitonesText(formatSignedDraft(next));
    return next;
  }

  function commitCents(text: string = centsText) {
    const parsed = parseCentsDraft(text);
    const next = parsed ?? cents;
    setCents(next);
    setCentsText(formatSignedDraft(next));
    return next;
  }

  function setSemitonesFromSlider(value: number) {
    const next = clampSemitones(value);
    setSemitones(next);
    setSemitonesText(formatSignedDraft(next));
  }

  function setCentsFromSlider(value: number) {
    const next = clampCents(value);
    setCents(next);
    setCentsText(formatSignedDraft(next));
  }

  function onTap() {
    const now = performance.now();
    const next = appendTap(tapTimes, now);
    setTapTimes(next);
    setTapCount(next.length);
    const bpm = tapBpmFromTimestamps(next);
    if (bpm != null) {
      const syncTarget = mode === "bpm" && Math.abs(targetBpm - originalBpm) < 0.05;
      setOriginalBpm(bpm);
      setOriginalBpmText(formatBpmDraft(bpm));
      if (syncTarget) {
        setTargetBpm(bpm);
        setTargetBpmText(formatBpmDraft(bpm));
      }
    }
  }

  function resetTaps() {
    setTapTimes([]);
    setTapCount(0);
  }

  function convertNow() {
    if (!audio || audio.decodeFailed) return;
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    const committedOriginal = commitOriginalBpm();
    const committedTarget = commitTargetBpm();
    const committedSemitones = commitSemitones();
    const committedCents = commitCents();
    void processAudio({
      file: audio,
      mode,
      originalBpm: committedOriginal,
      targetBpm: committedTarget,
      percent,
      semitones: committedSemitones,
      cents: committedCents,
      format,
      settings,
    });
  }

  const processing = phase !== "idle";
  const canConvert = Boolean(audio && !audio.decodeFailed);
  const largeFile = Boolean(audio && audio.file.size >= FFMPEG_LARGE_FILE_BYTES);

  const waveformPanel = (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      {audio && !audio.decodeFailed ? (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{t.sourcePreview}</h2>
              <p className="truncate text-sm text-muted-foreground" dir="ltr" title={audio.file.name}>
                {audio.file.name}
              </p>
            </div>
            {audio.peaks.length ? (
              <WaveformPlayer
                src={audio.url}
                peaks={audio.peaks}
                duration={audio.duration}
                start={0}
                end={audio.duration}
                readOnly
                playLabel={t.play}
                pauseLabel={t.pause}
                startHandleLabel={t.startHandle}
                endHandleLabel={t.endHandle}
              />
            ) : (
              <audio controls src={audio.url} className="w-full" />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Stat label={t.fileSize} value={formatBytes(audio.file.size)} />
              <Stat label={t.sourceQuality} value={formatAudioSourceSummary(audio.source)} />
            </div>
          </section>

          {result && resultUrl ? (
            <section className="space-y-3 border-t border-border pt-4">
              <h2 className="text-base font-semibold">{t.resultPreview}</h2>
              {resultPeaks.length ? (
                <WaveformPlayer
                  src={resultUrl}
                  peaks={resultPeaks}
                  duration={resultDuration || audio.duration / tempoRate}
                  start={0}
                  end={resultDuration || audio.duration / tempoRate}
                  readOnly
                  playLabel={t.play}
                  pauseLabel={t.pause}
                  startHandleLabel={t.startHandle}
                  endHandleLabel={t.endHandle}
                />
              ) : (
                <audio controls src={resultUrl} className="w-full" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label={interpolate(t.outputSize, { format: format.toUpperCase() })}
                  value={formatBytes(result.size)}
                />
                <Stat
                  label={t.exportSummary}
                  value={formatAudioExportSummary({
                    sampleRate: settings.sampleRate,
                    format,
                    bitrateKbps: format === "mp3" && settings.mp3Mode === "cbr" ? settings.bitrate : null,
                    bitDepth: format === "wav" ? settings.wavBitDepth : null,
                  })}
                />
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="flex min-h-[8.5rem] items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {t.waveformPlaceholder}
        </div>
      )}
    </div>
  );

  return (
    <ToolLayout
      accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/flac,audio/aac,audio/x-m4a,.mp3,.wav,.m4a,.ogg,.oga,.flac,.aac"
      onFiles={(files) => void onFiles(files)}
      hideDropzone={Boolean(audio)}
      hideEmptyPreview={!audio}
      replaceLabel={audio ? t.replaceFile : undefined}
      leading={waveformPanel}
      dropTitle={t.dropTitle}
      dropHint={t.dropHint}
      emptyPreviewText={t.empty}
      actionLabel={result ? t.exportAgain : t.action}
      onAction={() => convertNow()}
      actionDisabled={!canConvert}
      actionLoading={processing}
      downloadLabel={interpolate(t.downloadFormat, { format: format.toUpperCase() })}
      onDownload={() => {
        if (!result || !audio) return;
        downloadBlob(result, `${audio.file.name.replace(/\.[^.]+$/, "")}-tempo-pitch.${format}`);
      }}
      downloadDisabled={!result || processing}
      error={error}
      extra={
        <div className="space-y-4">
          <FFmpegStatus phase={phase} progress={progress} />
          {audio && !audio.decodeFailed ? (
            <p className="text-sm text-muted-foreground">{t.autoPreviewHint}</p>
          ) : null}
          {largeFile ? <p className="text-sm text-muted-foreground">{t.largeFileHint}</p> : null}
        </div>
      }
      preview={
        audio ? (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{t.bpmSection}</h2>
                  <p className="text-sm text-muted-foreground">{t.bpmHint}</p>
                </div>
                <p className="text-3xl font-semibold tabular-nums tracking-tight" dir="ltr">
                  {originalBpm.toFixed(1)}
                  <span className="ms-2 text-sm font-medium text-muted-foreground">BPM</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="lg" onClick={onTap} className="min-w-[8rem]">
                  {t.tap}
                </Button>
                <Button type="button" variant="outline" onClick={resetTaps} disabled={tapCount === 0}>
                  {t.resetTap}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {interpolate(t.tapCount, { count: tapCount })}
              </p>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t.tempoSection}</h2>
                <p className="text-sm text-muted-foreground">{t.tempoHint}</p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t.tempoMode}>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "bpm" ? "default" : "outline"}
                  aria-pressed={mode === "bpm"}
                  onClick={() => setMode("bpm")}
                >
                  {t.modeBpm}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "percent" ? "default" : "outline"}
                  aria-pressed={mode === "percent"}
                  onClick={() => setMode("percent")}
                >
                  {t.modePercent}
                </Button>
              </div>

              {mode === "bpm" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="original-bpm">{t.originalBpm}</Label>
                    <Input
                      id="original-bpm"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      dir="ltr"
                      value={originalBpmText}
                      onChange={(event) => setOriginalBpmText(sanitizeBpmDraftInput(event.target.value))}
                      onBlur={() => commitOriginalBpm()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitOriginalBpm();
                          (event.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-bpm">{t.targetBpm}</Label>
                    <Input
                      id="target-bpm"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      dir="ltr"
                      value={targetBpmText}
                      onChange={(event) => setTargetBpmText(sanitizeBpmDraftInput(event.target.value))}
                      onBlur={() => commitTargetBpm()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitTargetBpm();
                          (event.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="tempo-percent">{t.percent}</Label>
                    <span className="tabular-nums text-sm font-semibold" dir="ltr">
                      {formatSigned(percent, "%")}
                    </span>
                  </div>
                  <Slider
                    id="tempo-percent"
                    min={MIN_TEMPO_PERCENT}
                    max={MAX_TEMPO_PERCENT}
                    step={1}
                    value={[percent]}
                    onValueChange={(value) => setPercent(clampTempoPercent(value[0] ?? 0))}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat
                  label={t.deltaBpm}
                  value={mode === "bpm" ? formatSigned(deltaBpm, " BPM") : "—"}
                />
                <Stat label={t.tempoRate} value={formatRate(tempoRate)} />
                <Stat label={t.estimatedLength} value={`${estimateClock(audio.duration / tempoRate)}`} />
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t.pitchSection}</h2>
                <p className="text-sm text-muted-foreground">{t.pitchHint}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="semitones">{t.semitones}</Label>
                    <Input
                      id="semitones"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      dir="ltr"
                      className="h-9 w-24 text-end tabular-nums"
                      value={semitonesText}
                      aria-label={t.semitones}
                      onChange={(event) => setSemitonesText(sanitizeSignedDraftInput(event.target.value, 2))}
                      onBlur={() => commitSemitones()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitSemitones();
                          (event.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </div>
                  <Slider
                    id="semitones-slider"
                    min={MIN_SEMITONES}
                    max={MAX_SEMITONES}
                    step={1}
                    value={[semitones]}
                    onValueChange={(value) => setSemitonesFromSlider(value[0] ?? 0)}
                  />
                  <p className="text-xs text-muted-foreground">{t.semitonesHint}</p>
                </div>
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="cents">{t.cents}</Label>
                    <Input
                      id="cents"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      dir="ltr"
                      className="h-9 w-24 text-end tabular-nums"
                      value={centsText}
                      aria-label={t.cents}
                      onChange={(event) => setCentsText(sanitizeSignedDraftInput(event.target.value, 2))}
                      onBlur={() => commitCents()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitCents();
                          (event.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </div>
                  <Slider
                    id="cents-slider"
                    min={MIN_CENTS}
                    max={MAX_CENTS}
                    step={1}
                    value={[cents]}
                    onValueChange={(value) => setCentsFromSlider(value[0] ?? 0)}
                  />
                  <p className="text-xs text-muted-foreground">{t.centsHint}</p>
                </div>
              </div>
              <p className="text-sm tabular-nums text-muted-foreground" dir="ltr">
                {interpolate(t.pitchSummary, {
                  semitones: formatSignedDraft(semitones),
                  cents: `${formatSignedDraft(cents)}¢`,
                  total: `${formatSignedDraft(centsTotal)}¢`,
                  ratio: ratio.toFixed(4),
                })}
              </p>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t.exportSection}</h2>
                <p className="text-sm text-muted-foreground">{t.exportHint}</p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t.outputFormat}>
                {exportFormats.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    variant={format === item ? "default" : "outline"}
                    aria-pressed={format === item}
                    onClick={() => {
                      setFormat(item);
                      if (audio && !audio.decodeFailed) {
                        setSettings(settingsFromSource(audio.source, item));
                      } else {
                        setSettings(clampAudioExportSettings(item, settings));
                      }
                      clearResult();
                    }}
                  >
                    {item.toUpperCase()}
                  </Button>
                ))}
              </div>
              <AudioExportSettingsPanel
                format={format}
                settings={settings}
                onChange={(next) => {
                  setSettings(clampAudioExportSettings(format, next));
                  clearResult();
                }}
              />
            </section>
          </div>
        ) : undefined
      }
    />
  );
}

function estimateClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
