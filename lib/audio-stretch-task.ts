/**
 * Runs SoundTouch off the UI thread when the browser can spawn a worker.
 * Falls back to the calling thread when it cannot.
 */

import { createPcmBuffer, stretchAudioBuffer, type AudioStretchOptions } from "@/lib/audio-stretch";

type WorkerResponse =
  | { id: number; progress: number }
  | { id: number; channels: Float32Array[]; sampleRate: number; frames: number }
  | { id: number; error: string };

let worker: Worker | null = null;
let nextId = 1;
let chain: Promise<void> = Promise.resolve();

export function stretchAudioBufferOffThread(buffer: AudioBuffer, options: AudioStretchOptions): Promise<AudioBuffer> {
  if (options.signal?.aborted) return Promise.reject(abortError());
  const run = () =>
    canUseWorker() ? stretchInWorker(buffer, options).catch((error: unknown) => {
      if (isAbortError(error)) throw error;
      return stretchAudioBuffer(buffer, options);
    }) : Promise.resolve(stretchAudioBuffer(buffer, options));
  const next = chain.then(run, run);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function canUseWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function stretchInWorker(buffer: AudioBuffer, options: AudioStretchOptions): Promise<AudioBuffer> {
  const channelCount = Math.max(1, buffer.numberOfChannels || 1);
  const channels = Array.from({ length: channelCount }, (_, index) =>
    Float32Array.from(buffer.getChannelData(Math.min(index, Math.max(0, buffer.numberOfChannels - 1)))),
  );
  const sampleRate = Math.max(1, Math.round(buffer.sampleRate || 44100));
  const id = nextId;
  nextId += 1;

  return new Promise((resolve, reject) => {
    let current: Worker;
    try {
      current = worker ?? new Worker(new URL("./audio-stretch.worker.ts", import.meta.url));
      worker = current;
    } catch (error) {
      reject(error instanceof Error ? error : new Error("SoundTouch worker failed"));
      return;
    }

    let settled = false;
    const finish = (error?: Error, next?: AudioBuffer) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", onAbort);
      current.removeEventListener("message", onMessage);
      current.removeEventListener("error", onError);
      if (error) reject(error);
      else if (next) resolve(next);
    };

    const onAbort = () => {
      current.terminate();
      worker = null;
      finish(abortError());
    };

    const onError = () => {
      current.terminate();
      worker = null;
      finish(new Error("SoundTouch worker failed"));
    };

    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (!message || message.id !== id) return;
      if ("progress" in message) {
        options.onProgress?.(message.progress);
        return;
      }
      if ("error" in message) {
        finish(new Error(message.error));
        return;
      }
      const createBuffer = options.createBuffer ?? createPcmBuffer;
      const next = createBuffer(message.channels.length, message.frames, message.sampleRate);
      for (let index = 0; index < message.channels.length; index += 1) {
        next.getChannelData(index).set(message.channels[index]!);
      }
      finish(undefined, next);
    };

    options.signal?.addEventListener("abort", onAbort, { once: true });
    current.addEventListener("message", onMessage);
    current.addEventListener("error", onError);
    try {
      const transfer = channels.map((channel) => channel.buffer);
      current.postMessage(
        {
          id,
          channels,
          sampleRate,
          tempoRate: options.tempoRate,
          semitones: options.semitones,
          cents: options.cents,
          preset: options.preset,
        },
        transfer,
      );
    } catch (error) {
      finish(error instanceof Error ? error : new Error("SoundTouch worker failed"));
    }
  });
}

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
