"use client";

import { useEffect, useRef, useState } from "react";
import { FFmpegStatus } from "@/components/FFmpegStatus";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { inputNameFor, runFFmpeg } from "@/lib/ffmpeg";

function isAudio(file: File) {
  return file.type.startsWith("audio/") || /\.(mp3|m4a|ogg|oga)$/i.test(file.name);
}

export function Mp3ToWav() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "converting">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const resultRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setPhase("idle");
    setProgress(0);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    previewRef.current = null;
    resultRef.current = null;
    setPreviewUrl(null);
    setResultUrl(null);
  }

  function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;
    if (!isAudio(next)) {
      setError(copy.mp3ToWav.badFormat);
      return;
    }
    setFile(next);
    setResult(null);
    setError(null);
    setPhase("idle");
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    resultRef.current = null;
    setResultUrl(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setPreviewUrl(url);
  }

  async function convert() {
    if (!file) return;
    setError(null);
    setPhase("loading");
    setProgress(0);
    try {
      const inputName = inputNameFor(file);
      const blob = await runFFmpeg({
        file,
        inputName,
        outputName: "output.wav",
        mimeType: "audio/wav",
        args: ["-i", inputName, "output.wav"],
        onLoadProgress: (ratio) => {
          setPhase("loading");
          setProgress(ratio);
        },
        onProgress: (ratio) => {
          setPhase("converting");
          setProgress(ratio);
        },
      });
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult(blob);
      setResultUrl(url);
      setProgress(1);
    } catch {
      setResult(null);
      setError(copy.mp3ToWav.failed);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <ToolLayout
      accept="audio/mpeg,audio/mp4,audio/ogg,audio/x-m4a,.mp3,.m4a,.ogg,.oga"
      onFiles={onFiles}
      dropTitle={copy.mp3ToWav.dropTitle}
      dropHint={copy.mp3ToWav.dropHint}
      emptyPreviewText={copy.mp3ToWav.empty}
      actionLabel={result ? copy.ffmpeg.newConversion : copy.mp3ToWav.action}
      onAction={() => (result ? reset() : void convert())}
      actionDisabled={!file && !result}
      actionLoading={phase !== "idle"}
      downloadLabel={copy.mp3ToWav.download}
      onDownload={() => {
        if (!result || !file) return;
        downloadBlob(result, `${file.name.replace(/\.[^.]+$/, "")}.wav`);
      }}
      downloadDisabled={!result || phase !== "idle"}
      error={error}
      extra={<FFmpegStatus phase={phase} progress={progress} />}
      preview={
        file ? (
          <div className="space-y-4">
            <audio controls src={resultUrl || previewUrl || undefined} className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Stat label={copy.mp3ToWav.original} value={formatBytes(file.size)} />
              <Stat label={copy.mp3ToWav.output} value={result ? formatBytes(result.size) : "—"} />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
