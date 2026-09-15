"use client";

import { useEffect, useRef, useState } from "react";
import { FFmpegStatus } from "@/components/FFmpegStatus";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { formatFFmpegError, inputNameFor, runFFmpeg } from "@/lib/ffmpeg";

function isVideo(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
}

export function Mp4ToMp3() {
  const { copy } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "converting">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setPhase("idle");
    setProgress(0);
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    resultRef.current = null;
    setResultUrl(null);
  }

  function onFiles(files: File[]) {
    const next = files[0];
    if (!next) return;
    if (!isVideo(next)) {
      setError(copy.mp4ToMp3.badFormat);
      return;
    }
    setFile(next);
    setResult(null);
    setError(null);
    setPhase("idle");
    if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    resultRef.current = null;
    setResultUrl(null);
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
        outputName: "output.mp3",
        mimeType: "audio/mpeg",
        args: ["-i", inputName, "-q:a", "0", "-map", "a", "output.mp3"],
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
    } catch (error) {
      console.error("[mp4-to-mp3]", error, formatFFmpegError(error));
      setResult(null);
      setError(`${copy.mp4ToMp3.failed}\n\n${formatFFmpegError(error)}`);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <ToolLayout
      accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
      onFiles={onFiles}
      dropTitle={copy.mp4ToMp3.dropTitle}
      dropHint={copy.mp4ToMp3.dropHint}
      emptyPreviewText={copy.mp4ToMp3.empty}
      actionLabel={result ? copy.ffmpeg.newConversion : copy.mp4ToMp3.action}
      onAction={() => (result ? reset() : void convert())}
      actionDisabled={!file && !result}
      actionLoading={phase !== "idle"}
      downloadLabel={copy.mp4ToMp3.download}
      onDownload={() => {
        if (!result || !file) return;
        downloadBlob(result, `${file.name.replace(/\.[^.]+$/, "")}.mp3`);
      }}
      downloadDisabled={!result || phase !== "idle"}
      error={error}
      extra={<FFmpegStatus phase={phase} progress={progress} />}
      preview={
        file ? (
          <div className="space-y-4">
            {resultUrl ? (
              <audio controls src={resultUrl} className="w-full" />
            ) : (
              <p className="text-sm text-muted-foreground">{copy.mp4ToMp3.waiting}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Stat label={copy.mp4ToMp3.original} value={formatBytes(file.size)} />
              <Stat label={copy.mp4ToMp3.output} value={result ? formatBytes(result.size) : "—"} />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
