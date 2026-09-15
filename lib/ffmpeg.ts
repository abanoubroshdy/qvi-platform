import type { FFmpeg, LogEventCallback, ProgressEventCallback } from "@ffmpeg/ffmpeg";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
const LOG_LIMIT = 80;

export type FFmpegProgressHandler = (ratio: number) => void;

export class FFmpegRunError extends Error {
  readonly exitCode: number | null;
  readonly logs: string[];

  constructor(message: string, options?: { exitCode?: number | null; logs?: string[]; cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "FFmpegRunError";
    this.exitCode = options?.exitCode ?? null;
    this.logs = options?.logs ?? [];
  }
}

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let execProgress: FFmpegProgressHandler | null = null;
let progressListener: ProgressEventCallback | null = null;
let logListener: LogEventCallback | null = null;
let sessionLogs: string[] = [];

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

    if (!logListener) {
      logListener = ({ type, message }) => {
        const line = `${type}: ${message}`.trim();
        if (!line) return;
        sessionLogs.push(line);
        if (sessionLogs.length > LOG_LIMIT) sessionLogs = sessionLogs.slice(-LOG_LIMIT);
        console.debug("[ffmpeg]", line);
      };
      instance.on("log", logListener);
    }

    report(1);
    return instance;
  })();

  try {
    return await loadPromise;
  } catch (error) {
    loadPromise = null;
    ffmpeg = null;
    throw new FFmpegRunError("Failed to load the FFmpeg engine.", { cause: error, logs: sessionLogs.slice() });
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
  sessionLogs = [];

  try {
    await instance.writeFile(options.inputName, await fetchFile(options.file));
    const code = await instance.exec(options.args);
    if (code !== 0) {
      throw new FFmpegRunError(`ffmpeg exited with code ${code}.`, {
        exitCode: code,
        logs: sessionLogs.slice(),
      });
    }
    const data = await instance.readFile(options.outputName);
    const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(String(data));
    return new Blob([bytes], { type: options.mimeType });
  } catch (error) {
    if (error instanceof FFmpegRunError) throw error;
    throw new FFmpegRunError(error instanceof Error ? error.message : "FFmpeg run failed.", {
      cause: error,
      logs: sessionLogs.slice(),
    });
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

function causeChain(error: unknown): string[] {
  const messages: string[] = [];
  let current: unknown = error instanceof Error ? error.cause : undefined;
  while (current instanceof Error && messages.length < 4) {
    messages.push(current.message);
    current = current.cause;
  }
  return messages;
}

export function formatFFmpegError(error: unknown): string {
  const lines = error instanceof FFmpegRunError ? error.logs : [];
  const interesting = lines.filter((line) =>
    /error|fail|invalid|unrecognized|not found|no streams|cannot|abort|memory|encoder|decoder|unknown|map/i.test(line),
  );
  const picked = (interesting.length ? interesting : lines).slice(-12);
  const header =
    error instanceof FFmpegRunError
      ? error.exitCode != null
        ? `${error.message} (exit ${error.exitCode})`
        : error.message
      : error instanceof Error
        ? error.message
        : "Unknown FFmpeg error";
  const causes = causeChain(error);
  const parts = [header, ...causes, ...picked].filter(Boolean);
  return parts.join("\n");
}
