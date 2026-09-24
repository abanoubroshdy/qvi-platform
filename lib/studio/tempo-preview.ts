/**
 * Offline tempo and pitch for one track.
 * Identity settings skip the render. Anything else is stretched with SoundTouch
 * and mixed into one buffer aligned to timeline zero. Debounce matches the Tempo Pitch tool.
 * ffmpeg is not used for this preview.
 */

import { stretchAudioBuffer, type AudioStretchOptions } from "@/lib/audio-stretch";
import { resolveTempoRate } from "@/lib/audio-tempo";
import { qviStudioLimits } from "@/lib/studio/definition";
import { applyFadesToBuffer } from "@/lib/studio/fades";
import type { StudioTempoPitchPreview } from "@/lib/studio/engine";
import { trackTempoPitchIsIdentity } from "@/lib/studio/project";
import type { StudioTrack } from "@/lib/studio/types";

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
        const faded = applyFadesToBuffer(
          processed,
          { fadeInSec: clip.fadeInSec ?? 0, fadeOutSec: clip.fadeOutSec ?? 0 },
          deps.createBuffer,
        );
        placed.push({ buffer: faded, heardOffsetSec: Math.max(0, clip.offsetSec) });
      }
      return mixHeardBuffers(placed, deps.createBuffer);
    },
  };
}

export type StudioClipStretch = (
  buffer: AudioBuffer,
  options: AudioStretchOptions,
) => AudioBuffer | Promise<AudioBuffer>;

export function createSoundTouchClipProcessor(deps: {
  createBuffer: StudioBufferFactory;
  stretchClip?: StudioClipStretch;
}): StudioClipProcessor {
  const stretch = deps.stretchClip ?? ((buffer, options) => stretchAudioBuffer(buffer, { ...options, createBuffer: deps.createBuffer }));
  return async ({ buffer, track, signal }) => {
    if (signal.aborted) throw abortError();
    const stretched = await stretch(buffer, {
      tempoRate: resolveTempoRate(track.tempo),
      semitones: track.pitchSemitones,
      cents: track.pitchCents,
      preset: track.stretchPreset,
      signal,
      createBuffer: deps.createBuffer,
    });
    if (signal.aborted) throw abortError();
    return stretched;
  };
}

export function createBrowserTempoPitchPreview(deps: {
  createBuffer: StudioBufferFactory;
  stretchClip?: StudioClipStretch;
}): StudioTempoPitchPreview {
  return createTempoPitchPreview({
    processClip: createSoundTouchClipProcessor(deps),
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
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const controllers = new Map<string, AbortController>();
  const generation = new Map<string, number>();
  const pending: StudioTrack[] = [];
  let rendering = false;
  let disposed = false;

  function dropPending(trackId: string) {
    const index = pending.findIndex((track) => track.id === trackId);
    if (index >= 0) pending.splice(index, 1);
  }

  function pump() {
    if (disposed || rendering || pending.length === 0) return;
    const track = pending.shift();
    if (!track) return;
    const controller = controllers.get(track.id);
    const generationAtSchedule = generation.get(track.id) ?? 0;
    if (!controller || controller.signal.aborted) {
      pump();
      return;
    }
    rendering = true;
    options.preview.renderTrack(track, controller.signal).then(
      (buffer) => {
        rendering = false;
        const current = !disposed && generation.get(track.id) === generationAtSchedule && !controller.signal.aborted;
        if (current) options.onResult(track.id, buffer);
        pump();
      },
      (error: unknown) => {
        rendering = false;
        const current = !disposed && generation.get(track.id) === generationAtSchedule && !controller.signal.aborted;
        if (current && !isAbortError(error)) options.onError?.(track.id, error);
        pump();
      },
    );
  }

  return {
    schedule(track: StudioTrack) {
      if (disposed) return;
      const timer = timers.get(track.id);
      if (timer) clearTimeout(timer);
      timers.delete(track.id);
      controllers.get(track.id)?.abort();
      dropPending(track.id);
      const controller = new AbortController();
      controllers.set(track.id, controller);
      const generationAtSchedule = (generation.get(track.id) ?? 0) + 1;
      generation.set(track.id, generationAtSchedule);
      if (trackTempoPitchIsIdentity(track)) {
        options.onResult(track.id, null);
        return;
      }
      timers.set(
        track.id,
        setTimeout(() => {
          timers.delete(track.id);
          if (disposed || generation.get(track.id) !== generationAtSchedule) return;
          pending.push(track);
          pump();
        }, debounceMs),
      );
    },
    cancel() {
      Array.from(timers.values()).forEach((timer) => clearTimeout(timer));
      timers.clear();
      Array.from(controllers.values()).forEach((controller) => controller.abort());
      controllers.clear();
      pending.length = 0;
    },
    dispose() {
      disposed = true;
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
