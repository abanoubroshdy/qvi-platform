import type { FFmpeg, LogEventCallback, ProgressEventCallback } from "@ffmpeg/ffmpeg";

const ST_CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
const MT_CORE_BASE = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";
const LOG_LIMIT = 80;
/** Soft warning threshold. The whole file is copied into wasm memory. */
export const FFMPEG_LARGE_FILE_BYTES = 80 * 1024 * 1024;
/** Hard skip. Larger inputs are rejected before they are written into the wasm FS. */
export const FFMPEG_MAX_INPUT_BYTES = 250 * 1024 * 1024;

export type FFmpegProgressHandler = (ratio: number) => void;
export type FFmpegCoreKind = "mt" | "st";

/**
 * Multithreaded ffmpeg-core needs SharedArrayBuffer, which requires
 * cross-origin isolation (COOP + COEP). `/tools/*` keeps COEP unsafe-none so
 * AdSense frames can load, so those pages use the single-thread core.
 */
export function selectFFmpegCore(crossOriginIsolated: boolean): FFmpegCoreKind {
  return crossOriginIsolated ? "mt" : "st";
}

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

export class FFmpegCancelledError extends Error {
  constructor() {
    super("Conversion cancelled.");
    this.name = "FFmpegCancelledError";
  }
}

export function isFFmpegCancelled(error: unknown): boolean {
  return error instanceof FFmpegCancelledError;
}

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let execProgress: FFmpegProgressHandler | null = null;
let progressListener: ProgressEventCallback | null = null;
let logListener: LogEventCallback | null = null;
let sessionLogs: string[] = [];
let runGeneration = 0;

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

type BlobURL = (
  url: string,
  mimeType: string,
  progress?: boolean,
  cb?: (event: { received: number; total: number }) => void,
) => Promise<string>;

function attachListeners(instance: FFmpeg) {
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
}

async function loadCore(
  instance: FFmpeg,
  kind: FFmpegCoreKind,
  toBlobURL: BlobURL,
  report: (ratio: number) => void,
  generation: number,
) {
  const base = kind === "mt" ? MT_CORE_BASE : ST_CORE_BASE;
  const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript", true, ({ received, total }) => {
    report(0.05 + (total ? received / total : 0) * 0.28);
  });
  if (generation !== runGeneration) throw new FFmpegCancelledError();
  report(0.35);

  const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm", true, ({ received, total }) => {
    report(0.35 + (total ? received / total : 0) * 0.4);
  });
  if (generation !== runGeneration) throw new FFmpegCancelledError();

  let workerURL: string | undefined;
  if (kind === "mt") {
    workerURL = await toBlobURL(`${base}/ffmpeg-core.worker.js`, "text/javascript", true, ({ received, total }) => {
      report(0.76 + (total ? received / total : 0) * 0.12);
    });
    if (generation !== runGeneration) throw new FFmpegCancelledError();
  }
  report(0.9);

  const classWorkerURL = new URL("/ffmpeg-worker/worker.js", window.location.origin).href;
  await instance.load({ coreURL, wasmURL, workerURL, classWorkerURL });
}

/** Stop the current exec and drop the worker so the next file can load a fresh engine. */
export async function terminateFFmpeg(): Promise<void> {
  runGeneration += 1;
  const instance = ffmpeg;
  ffmpeg = null;
  loadPromise = null;
  execProgress = null;
  progressListener = null;
  logListener = null;
  try {
    instance?.terminate();
  } catch {
    /* already stopped */
  }
}

export async function loadFFmpeg(onProgress?: FFmpegProgressHandler): Promise<FFmpeg> {
  const generation = runGeneration;
  if (ffmpeg?.loaded && generation === runGeneration) {
    onProgress?.(1);
    return ffmpeg;
  }
  if (loadPromise) return loadPromise;

  let instance: FFmpeg | null = null;
  const pending = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
    if (generation !== runGeneration) throw new FFmpegCancelledError();
    instance = ffmpeg ?? new FFmpeg();
    ffmpeg = instance;

    const report = (ratio: number) => onProgress?.(Math.min(1, Math.max(0, ratio)));
    report(0.02);

    const isolated = typeof crossOriginIsolated === "boolean" && crossOriginIsolated;
    const kind = selectFFmpegCore(isolated);
    try {
      await loadCore(instance, kind, toBlobURL, report, generation);
    } catch (error) {
      if (generation !== runGeneration || isFFmpegCancelled(error)) throw new FFmpegCancelledError();
      if (kind !== "mt") throw error;
      try {
        instance.terminate();
      } catch {
        /* ignore a half-loaded multithread core */
      }
      progressListener = null;
      logListener = null;
      instance = new FFmpeg();
      ffmpeg = instance;
      await loadCore(instance, "st", toBlobURL, report, generation);
    }

    if (generation !== runGeneration) throw new FFmpegCancelledError();
    attachListeners(instance);
    report(1);
    return instance;
  })();

  loadPromise = pending;

  try {
    return await pending;
  } catch (error) {
    if (loadPromise === pending) loadPromise = null;
    const failed = instance as FFmpeg | null;
    if (failed && ffmpeg === failed) {
      try {
        failed.terminate();
      } catch {
        /* ignore */
      }
      ffmpeg = null;
    }
    if (generation !== runGeneration || isFFmpegCancelled(error)) throw new FFmpegCancelledError();
    throw new FFmpegRunError("Failed to load the FFmpeg engine.", {
      cause: error instanceof Error ? error : undefined,
      logs: [...sessionLogs, error instanceof Error ? error.message : String(error)],
    });
  }
}

export type FFmpegInputFile = {
  name: string;
  file: File;
};

export type RunFFmpegFilesOptions = {
  files: FFmpegInputFile[];
  outputName: string;
  mimeType: string;
  args: string[];
  fallbackArgs?: string[][];
  onLoadProgress?: FFmpegProgressHandler;
  onProgress?: FFmpegProgressHandler;
};

async function deleteQuietly(instance: FFmpeg, name: string) {
  try {
    await instance.deleteFile(name);
  } catch {
    /* ignore missing or locked virtual files */
  }
}

function throwIfCancelled(generation: number) {
  if (generation !== runGeneration) throw new FFmpegCancelledError();
}

/** Run FFmpeg with one or more input files written into the virtual FS. */
export async function runFFmpegFiles(options: RunFFmpegFilesOptions): Promise<Blob> {
  if (!options.files.length) {
    throw new FFmpegRunError("FFmpeg run requires at least one input file.");
  }

  const generation = runGeneration;
  const instance = await loadFFmpeg(options.onLoadProgress);
  throwIfCancelled(generation);
  const { fetchFile } = await import("@ffmpeg/util");

  execProgress = (ratio) => options.onProgress?.(ratio);
  sessionLogs = [];
  const attempts = [options.args, ...(options.fallbackArgs ?? [])];
  const written = new Set<string>();
  let lastError: unknown;

  try {
    for (const entry of options.files) {
      throwIfCancelled(generation);
      await instance.writeFile(entry.name, await fetchFile(entry.file));
      written.add(entry.name);
    }

    for (const args of attempts) {
      throwIfCancelled(generation);
      sessionLogs = [];
      try {
        const code = await instance.exec(args);
        throwIfCancelled(generation);
        if (code !== 0) {
          lastError = new FFmpegRunError(`ffmpeg exited with code ${code}.`, {
            exitCode: code,
            logs: sessionLogs.slice(),
          });
          await deleteQuietly(instance, options.outputName);
          continue;
        }
        const data = await instance.readFile(options.outputName);
        const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(String(data));
        return new Blob([bytes], { type: options.mimeType });
      } catch (error) {
        if (generation !== runGeneration || isFFmpegCancelled(error)) throw new FFmpegCancelledError();
        lastError =
          error instanceof FFmpegRunError
            ? error
            : new FFmpegRunError(error instanceof Error ? error.message : "FFmpeg run failed.", {
                cause: error,
                logs: sessionLogs.slice(),
              });
        await deleteQuietly(instance, options.outputName);
      }
    }

    throw lastError instanceof FFmpegRunError
      ? lastError
      : new FFmpegRunError("FFmpeg run failed.", { cause: lastError, logs: sessionLogs.slice() });
  } catch (error) {
    if (generation !== runGeneration || isFFmpegCancelled(error)) throw new FFmpegCancelledError();
    if (error instanceof FFmpegRunError) throw error;
    throw new FFmpegRunError(error instanceof Error ? error.message : "FFmpeg run failed.", {
      cause: error,
      logs: sessionLogs.slice(),
    });
  } finally {
    execProgress = null;
    if (generation === runGeneration) {
      for (const name of Array.from(written)) {
        await deleteQuietly(instance, name);
      }
      await deleteQuietly(instance, options.outputName);
    }
  }
}

/** Convenience wrapper for a single input file. */
export async function runFFmpeg(options: {
  file: File;
  inputName: string;
  outputName: string;
  mimeType: string;
  args: string[];
  fallbackArgs?: string[][];
  onLoadProgress?: FFmpegProgressHandler;
  onProgress?: FFmpegProgressHandler;
}): Promise<Blob> {
  return runFFmpegFiles({
    files: [{ name: options.inputName, file: options.file }],
    outputName: options.outputName,
    mimeType: options.mimeType,
    args: options.args,
    fallbackArgs: options.fallbackArgs,
    onLoadProgress: options.onLoadProgress,
    onProgress: options.onProgress,
  });
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

export type FFmpegFailureKind = "engine" | "no-audio" | "memory" | "generic";

export function classifyFFmpegFailure(
  error: unknown,
  options?: { fileBytes?: number },
): FFmpegFailureKind {
  const text = `${formatFFmpegError(error)}\n${error instanceof Error ? error.message : ""}`.toLowerCase();
  if (
    text.includes("failed to load the ffmpeg engine") ||
    text.includes("failed to import ffmpeg-core") ||
    text.includes("import ffmpeg-core")
  ) {
    return "engine";
  }
  if (
    text.includes("matches no streams") ||
    text.includes("does not contain any stream") ||
    (text.includes("stream map") && text.includes("no streams")) ||
    text.includes("output file is empty") ||
    text.includes("does not contain any audio") ||
    /\bno audio\b/.test(text)
  ) {
    return "no-audio";
  }
  if (
    text.includes("memory") ||
    text.includes("out of mem") ||
    text.includes("cannot allocate") ||
    text.includes("oom") ||
    text.includes("exceeds browser memory")
  ) {
    return "memory";
  }
  if (options?.fileBytes != null && options.fileBytes >= FFMPEG_LARGE_FILE_BYTES) {
    return "memory";
  }
  // Silent videos in ffmpeg.wasm often abort with exit 1 instead of a stream-map message.
  if (/\baborted\(\)/.test(text) && (text.includes("exit 1") || text.includes("exited with code 1"))) {
    return "no-audio";
  }
  return "generic";
}
