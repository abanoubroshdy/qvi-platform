/**
 * Runs SoundTouch off the UI thread when the browser can spawn a worker.
 * The PCM copy yields so a long clip does not freeze the main thread.
 * A full-clip stretch stays off this thread. The small-buffer fallback is only
 * for tests and hosts that cannot start a worker.
 */

import { createPcmBuffer, stretchAudioBuffer, type AudioStretchOptions } from "@/lib/audio-stretch";

/** One second at 48 kHz. Longer clips are not stretched on the calling thread. */
export const MAIN_THREAD_STRETCH_FRAMES = 48_000;
const COPY_FRAMES_PER_SLICE = 262_144;

type WorkerResponse =
  | { id: number; progress: number }
  | { id: number; channels: Float32Array[]; sampleRate: number; frames: number }
  | { id: number; error: string };

let worker: Worker | null = null;
let nextId = 1;
let chain: Promise<void> = Promise.resolve();

export function stretchOnCallingThreadAllowed(frames: number): boolean {
  return frames <= MAIN_THREAD_STRETCH_FRAMES;
}

export function stretchAudioBufferOffThread(buffer: AudioBuffer, options: AudioStretchOptions): Promise<AudioBuffer> {
  if (options.signal?.aborted) return Promise.reject(abortError());
  const run = () =>
    canUseWorker()
      ? stretchInWorker(buffer, options).catch((error: unknown) => {
          if (isAbortError(error)) throw error;
          if (!stretchOnCallingThreadAllowed(buffer.length)) throw error;
          return stretchAudioBuffer(buffer, options);
        })
      : stretchOnCallingThreadAllowed(buffer.length)
        ? Promise.resolve(stretchAudioBuffer(buffer, options))
        : Promise.reject(new Error("SoundTouch worker is required for this clip"));
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

export async function copyBufferChannels(
  buffer: AudioBuffer,
  signal?: AbortSignal,
  framesPerSlice = COPY_FRAMES_PER_SLICE,
): Promise<Float32Array[]> {
  const channelCount = Math.max(1, buffer.numberOfChannels || 1);
  const frames = Math.max(0, buffer.length || buffer.getChannelData(0).length);
  const channels = Array.from({ length: channelCount }, () => new Float32Array(Math.max(1, frames)));
  const slice = Math.max(1, framesPerSlice);
  let sliceStart = performance.now();
  for (let channel = 0; channel < channelCount; channel += 1) {
    const source = buffer.getChannelData(Math.min(channel, Math.max(0, buffer.numberOfChannels - 1)));
    const dest = channels[channel]!;
    const count = Math.min(source.length, dest.length);
    for (let offset = 0; offset < count; offset += slice) {
      if (signal?.aborted) throw abortError();
      const end = Math.min(count, offset + slice);
      dest.set(source.subarray(offset, end), offset);
      if (performance.now() - sliceStart >= 12) {
        await yieldToMainThread();
        sliceStart = performance.now();
      }
    }
  }
  return channels;
}

function stretchInWorker(buffer: AudioBuffer, options: AudioStretchOptions): Promise<AudioBuffer> {
  const sampleRate = Math.max(1, Math.round(buffer.sampleRate || 44100));
  const id = nextId;
  nextId += 1;

  return copyBufferChannels(buffer, options.signal).then(
    (channels) =>
      new Promise((resolve, reject) => {
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
      }),
  );
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
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
