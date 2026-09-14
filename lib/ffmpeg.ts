import type { FFmpeg, ProgressEventCallback } from "@ffmpeg/ffmpeg";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

export type FFmpegProgressHandler = (ratio: number) => void;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let execProgress: FFmpegProgressHandler | null = null;
let progressListener: ProgressEventCallback | null = null;

function extensionOf(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const type = file.type.split("/")[1];
  if (type === "mpeg") return "mp3";
  if (type === "quicktime") return "mov";
  if (type === "x-m4a" || type === "mp4") return "m4a";
  return type && /^[a-z0-9]{2,5}$/.test(type) ? type : "bin";
}

export function inputNameFor(file: File, fallback = "input") {
  return `${fallback}.${extensionOf(file)}`;
}

export async function loadFFmpeg(onProgress?: FFmpegProgressHandler): Promise<FFmpeg> {
  if (ffmpeg?.loaded) {
    onProgress?.(1);
    return ffmpeg;
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
    const instance = ffmpeg ?? new FFmpeg();
    ffmpeg = instance;

    const report = (ratio: number) => onProgress?.(Math.min(1, Math.max(0, ratio)));
    report(0.02);

    const coreURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript", true, ({ received, total }) => {
      report(0.05 + (total ? received / total : 0) * 0.35);
    });
    report(0.42);

    const wasmURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm", true, ({ received, total }) => {
      report(0.42 + (total ? received / total : 0) * 0.45);
    });
    report(0.9);

    const classWorkerURL = new URL("/ffmpeg-worker/worker.js", window.location.origin).href;
    await instance.load({ coreURL, wasmURL, classWorkerURL });

    if (!progressListener) {
      progressListener = ({ progress }) => {
        execProgress?.(Math.min(1, Math.max(0, progress)));
      };
      instance.on("progress", progressListener);
    }

    report(1);
    return instance;
  })();

  try {
    return await loadPromise;
  } catch (error) {
    loadPromise = null;
    ffmpeg = null;
    throw error;
  }
}

export async function runFFmpeg(options: {
  file: File;
  inputName: string;
  outputName: string;
  mimeType: string;
  args: string[];
  onLoadProgress?: FFmpegProgressHandler;
  onProgress?: FFmpegProgressHandler;
}): Promise<Blob> {
  const instance = await loadFFmpeg(options.onLoadProgress);
  const { fetchFile } = await import("@ffmpeg/util");

  execProgress = (ratio) => options.onProgress?.(ratio);

  try {
    await instance.writeFile(options.inputName, await fetchFile(options.file));
    const code = await instance.exec(options.args);
    if (code !== 0) {
      throw new Error(`ffmpeg-exit-${code}`);
    }
    const data = await instance.readFile(options.outputName);
    const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(String(data));
    return new Blob([bytes], { type: options.mimeType });
  } finally {
    execProgress = null;
    try {
      await instance.deleteFile(options.inputName);
    } catch {
      /* ignore */
    }
    try {
      await instance.deleteFile(options.outputName);
    } catch {
      /* ignore */
    }
  }
}
