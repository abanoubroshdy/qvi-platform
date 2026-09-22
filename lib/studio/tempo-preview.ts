/**
 * Offline tempo and pitch for one track.
 * Identity settings skip the render. Anything else is mixed into one buffer
 * aligned to timeline zero. Debounce matches the Tempo Pitch tool.
 */

import { buildTempoPitchExportPlan } from "@/lib/audio-tempo";
import { defaultAudioExportSettings } from "@/lib/audio-export";
import { runFFmpeg } from "@/lib/ffmpeg";
import { qviStudioLimits } from "@/lib/studio/definition";
import type { StudioTempoPitchPreview } from "@/lib/studio/engine";
import { trackTempoPitchIsIdentity } from "@/lib/studio/project";
import type { StudioTrack } from "@/lib/studio/types";
import { encodeWavPcm16, wavArrayBuffer } from "@/lib/studio/wav";

export type StudioBufferFactory = (channels: number, length: number, sampleRate: number) => AudioBuffer;

export type StudioClipProcessor = (input: {
  buffer: AudioBuffer;
  track: StudioTrack;
  signal: AbortSignal;
}) => Promise<AudioBuffer>;

export class StudioPreviewError extends Error {
  readonly code: "missing-buffer";

  constructor(code: "missing-buffer") {
    super(code === "missing-buffer" ? "A clip is missing decoded audio." : code);
    this.name = "StudioPreviewError";
    this.code = code;
  }
}

export function createTempoPitchPreview(deps: {
  processClip: StudioClipProcessor;
  createBuffer: StudioBufferFactory;
}): StudioTempoPitchPreview {
  return {
    async renderTrack(track, signal) {
      const abort = signal ?? new AbortController().signal;
      if (trackTempoPitchIsIdentity(track) || track.clips.length === 0) return null;
      if (abort.aborted) throw abortError();
      const placed: { buffer: AudioBuffer; heardOffsetSec: number }[] = [];
      for (const clip of track.clips) {
        if (abort.aborted) throw abortError();
        if (!clip.buffer) throw new StudioPreviewError("missing-buffer");
        const trimmed = sliceAudioBuffer(clip.buffer, clip.trimStartSec, clip.trimEndSec, deps.createBuffer);
        const processed = await deps.processClip({ buffer: trimmed, track, signal: abort });
        if (abort.aborted) throw abortError();
        placed.push({ buffer: processed, heardOffsetSec: Math.max(0, clip.offsetSec) });
      }
      return mixHeardBuffers(placed, deps.createBuffer);
    },
  };
}

export function createFfmpegClipProcessor(deps: {
  decodeAudioData: (data: ArrayBuffer) => Promise<AudioBuffer>;
  run?: typeof runFFmpeg;
}): StudioClipProcessor {
  const run = deps.run ?? runFFmpeg;
  return async ({ buffer, track, signal }) => {
    if (signal.aborted) throw abortError();
    const wav = wavArrayBuffer(encodeWavPcm16(buffer));
    const file = new File([wav], "clip.wav", { type: "audio/wav" });
    const channels: 1 | 2 = buffer.numberOfChannels >= 2 ? 2 : 1;
    const plan = buildTempoPitchExportPlan({
      inputName: "clip.wav",
      sourceDuration: buffer.duration,
      sampleRate: buffer.sampleRate || 44100,
      mode: track.tempo.mode,
      originalBpm: track.tempo.originalBpm,
      targetBpm: track.tempo.targetBpm,
      percent: track.tempo.percent,
      semitones: track.pitchSemitones,
      cents: track.pitchCents,
      format: "wav",
      settings: {
        ...defaultAudioExportSettings,
        sampleRate: buffer.sampleRate || defaultAudioExportSettings.sampleRate,
        channels,
        wavBitDepth: 16,
      },
    });
    const blob = await run({
      file,
      inputName: "clip.wav",
      outputName: plan.outputName,
      mimeType: plan.mimeType,
      args: plan.args,
      fallbackArgs: plan.fallbackArgs,
    });
    if (signal.aborted) throw abortError();
    return deps.decodeAudioData(await blob.arrayBuffer());
  };
}

export function createBrowserTempoPitchPreview(deps: {
  decodeAudioData: (data: ArrayBuffer) => Promise<AudioBuffer>;
  createBuffer: StudioBufferFactory;
  run?: typeof runFFmpeg;
}): StudioTempoPitchPreview {
  return createTempoPitchPreview({
    processClip: createFfmpegClipProcessor(deps),
    createBuffer: deps.createBuffer,
  });
}

export function sliceAudioBuffer(
  buffer: AudioBuffer,
  trimStartSec: number,
  trimEndSec: number,
  createBuffer: StudioBufferFactory,
): AudioBuffer {
  const rate = Math.max(1, buffer.sampleRate || 44100);
  const frames = buffer.length || buffer.getChannelData(0).length;
  const start = clampFrame(trimStartSec * rate, frames);
  const end = Math.max(start, clampFrame(trimEndSec * rate, frames));
  const length = Math.max(1, end - start);
  const channels = Math.max(1, buffer.numberOfChannels || 1);
  const next = createBuffer(channels, length, rate);
  for (let channel = 0; channel < channels; channel += 1) {
    const source = buffer.getChannelData(Math.min(channel, Math.max(0, buffer.numberOfChannels - 1)));
    next.getChannelData(channel).set(source.subarray(start, start + length));
  }
  return next;
}

export function mixHeardBuffers(
  clips: readonly { buffer: AudioBuffer; heardOffsetSec: number }[],
  createBuffer: StudioBufferFactory,
): AudioBuffer | null {
  const usable = clips.filter((clip) => clip.buffer.length > 0 && clip.buffer.sampleRate > 0);
  if (!usable.length) return null;
  const sampleRate = Math.max(...usable.map((clip) => clip.buffer.sampleRate));
  const channels = Math.max(...usable.map((clip) => clip.buffer.numberOfChannels));
  const durationSec = usable.reduce(
    (max, clip) => Math.max(max, Math.max(0, clip.heardOffsetSec) + clip.buffer.duration),
    0,
  );
  const length = Math.max(1, Math.ceil(durationSec * sampleRate));
  const mixed = createBuffer(channels, length, sampleRate);
  const destination = Array.from({ length: channels }, (_, channel) => mixed.getChannelData(channel));
  for (const clip of usable) {
    const offset = Math.round(Math.max(0, clip.heardOffsetSec) * sampleRate);
    const sourceRate = clip.buffer.sampleRate;
    for (let frame = 0; frame < clip.buffer.length; frame += 1) {
      const index = offset + Math.round((frame * sampleRate) / sourceRate);
      if (index < 0 || index >= length) continue;
      for (let channel = 0; channel < channels; channel += 1) {
        const source = clip.buffer.getChannelData(Math.min(channel, clip.buffer.numberOfChannels - 1));
        const lane = destination[channel];
        if (!lane) continue;
        lane[index] = (lane[index] ?? 0) + (source[frame] ?? 0);
      }
    }
  }
  return mixed;
}

export function createTempoPreviewScheduler(options: {
  preview: StudioTempoPitchPreview;
  debounceMs?: number;
  onResult: (trackId: string, buffer: AudioBuffer | null) => void;
  onError?: (trackId: string, error: unknown) => void;
}) {
  const debounceMs = options.debounceMs ?? qviStudioLimits.previewDebounceMs;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let generation = 0;

  function cancelTimer() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  }

  return {
    schedule(track: StudioTrack) {
      cancelTimer();
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      const generationAtSchedule = ++generation;
      if (trackTempoPitchIsIdentity(track)) {
        options.onResult(track.id, null);
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        options.preview.renderTrack(track, signal).then(
          (buffer) => {
            if (generationAtSchedule !== generation || signal.aborted) return;
            options.onResult(track.id, buffer);
          },
          (error: unknown) => {
            if (generationAtSchedule !== generation || signal.aborted || isAbortError(error)) return;
            options.onError?.(track.id, error);
          },
        );
      }, debounceMs);
    },
    cancel() {
      generation += 1;
      cancelTimer();
      controller?.abort();
      controller = null;
    },
    dispose() {
      this.cancel();
    },
  };
}

export function connectTempoPreview(options: {
  preview: StudioTempoPitchPreview;
  setRenderedTrack: (trackId: string, buffer: AudioBuffer | null) => void;
  debounceMs?: number;
  onError?: (trackId: string, error: unknown) => void;
}) {
  return createTempoPreviewScheduler({
    preview: options.preview,
    debounceMs: options.debounceMs,
    onResult: options.setRenderedTrack,
    onError: options.onError,
  });
}

function clampFrame(frame: number, length: number): number {
  if (!Number.isFinite(frame)) return 0;
  return Math.max(0, Math.min(length, Math.round(frame)));
}

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
