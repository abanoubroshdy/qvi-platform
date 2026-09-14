"use client";

import { useEffect, useRef, useState } from "react";
import { AudioWaveform } from "@/components/AudioWaveform";
import { FFmpegStatus } from "@/components/FFmpegStatus";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { downloadBlob } from "@/lib/download";
import { inputNameFor, runFFmpeg } from "@/lib/ffmpeg";
import { formatClock, parseClock, peaksFromBuffer } from "@/lib/time";

function isAudio(file: File) {
  return file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|oga|aac|flac)$/i.test(file.name);
}

export function AudioCutter() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
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

  function reset() {
    setFile(null);
    setDuration(0);
    setStart(0);
    setEnd(0);
    setPeaks([]);
    setResult(null);
    setError(null);
    setPhase("idle");
    setProgress(0);
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    sourceRef.current = null;
    resultRef.current = null;
    setSourceUrl(null);
    setResultUrl(null);
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
    setResult(null);
    setPhase("idle");
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    resultRef.current = null;
    setResultUrl(null);
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    const url = URL.createObjectURL(next);
    sourceRef.current = url;
    setSourceUrl(url);

    try {
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(await next.arrayBuffer());
      await context.close();
      setDuration(buffer.duration);
      setStart(0);
      setEnd(buffer.duration);
      setPeaks(peaksFromBuffer(buffer));
    } catch {
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
  }

  async function convert() {
    if (!file || end <= start) return;
    setError(null);
    setPhase("loading");
    setProgress(0);
    const inputName = inputNameFor(file);
    const startArg = start.toFixed(3);
    const endArg = end.toFixed(3);

    const run = (args: string[]) =>
      runFFmpeg({
        file,
        inputName,
        outputName: "output.mp3",
        mimeType: "audio/mpeg",
        args,
        onLoadProgress: (ratio) => {
          setPhase("loading");
          setProgress(ratio);
        },
        onProgress: (ratio) => {
          setPhase("converting");
          setProgress(ratio);
        },
      });

    try {
      let blob: Blob;
      try {
        blob = await run(["-i", inputName, "-ss", startArg, "-to", endArg, "-c", "copy", "output.mp3"]);
      } catch {
        blob = await run(["-i", inputName, "-ss", startArg, "-to", endArg, "output.mp3"]);
      }
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult(blob);
      setResultUrl(url);
      setProgress(1);
    } catch {
      setResult(null);
      setError(copy.audioCutter.failed);
    } finally {
      setPhase("idle");
    }
  }

  const previewSrc = resultUrl || (sourceUrl && duration ? `${sourceUrl}#t=${start},${end}` : sourceUrl);

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
      actionLoading={phase !== "idle"}
      downloadLabel={copy.audioCutter.download}
      onDownload={() => {
        if (!result || !file) return;
        downloadBlob(result, `${file.name.replace(/\.[^.]+$/, "")}-trim.mp3`);
      }}
      downloadDisabled={!result || phase !== "idle"}
      error={error}
      extra={<FFmpegStatus phase={phase} progress={progress} />}
      leading={
        file && duration ? (
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            <AudioWaveform peaks={peaks} start={start} end={end} duration={duration} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cut-start">{copy.audioCutter.start}</Label>
                <Input
                  id="cut-start"
                  dir="ltr"
                  value={formatClock(start)}
                  onChange={(event) => clampRange(parseClock(event.target.value, start), end)}
                />
                <div dir="ltr">
                  <Slider
                    min={0}
                    max={Math.max(duration, 0.1)}
                    step={0.1}
                    value={[start]}
                    onValueChange={(value) => clampRange(value[0] ?? 0, end)}
                    aria-label={copy.audioCutter.start}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cut-end">{copy.audioCutter.end}</Label>
                <Input
                  id="cut-end"
                  dir="ltr"
                  value={formatClock(end)}
                  onChange={(event) => clampRange(start, parseClock(event.target.value, end))}
                />
                <div dir="ltr">
                  <Slider
                    min={0}
                    max={Math.max(duration, 0.1)}
                    step={0.1}
                    value={[end]}
                    onValueChange={(value) => clampRange(start, value[0] ?? end)}
                    aria-label={copy.audioCutter.end}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
      preview={
        file ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">{resultUrl ? copy.audioCutter.trimmed : copy.audioCutter.preview}</p>
            {previewSrc ? <audio controls src={previewSrc} className="w-full" /> : null}
          </div>
        ) : undefined
      }
    />
  );
}
