/**
 * Offline tempo and pitch using SoundTouchJS (MPL-2.0).
 *
 * Tempo changes duration and keeps pitch. Pitch (semitones + cents) keeps duration.
 * ffmpeg is not used here. Rubber Band is not used here.
 *
 * SoundTouch v2's public pitch control sets an internal rate and the inverse
 * stretch tempo so duration stays put. After that, the stretch tempo is set to
 * `tempoRate / pitchRatio` so tempo and pitch stay independent. The same
 * relationship is what the SoundTouch C++ library calls effective rate/tempo.
 */

import { SoundTouch, type StretchFactory } from "@soundtouchjs/core";
import { createPhaseVocoderFactory } from "@soundtouchjs/stretch-phase-vocoder";
import { pitchRatio } from "@/lib/audio-tempo";
import { resolveStretchSettings, type StretchPresetId } from "@/lib/audio-stretch-preset";

const IDENTITY_EPS = 1e-6;
const MIN_TEMPO_RATE = 1 / 16;
const MAX_TEMPO_RATE = 16;
const CHUNK_FRAMES = 4096;

export type AudioStretchOptions = {
  tempoRate: number;
  semitones: number;
  cents: number;
  /** Defaults to music, the phase-vocoder quality path. */
  preset?: StretchPresetId;
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
  createBuffer?: (channels: number, length: number, sampleRate: number) => AudioBuffer;
};

export type StretchChannelRequest = {
  channels: Float32Array[];
  sampleRate: number;
  tempoRate: number;
  semitones: number;
  cents: number;
  preset?: StretchPresetId;
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
};

export type StretchChannelResult = {
  channels: Float32Array[];
  sampleRate: number;
  frames: number;
};

export function createPcmBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
  const count = Math.max(1, channels);
  const frames = Math.max(1, length);
  const rate = Math.max(1, sampleRate);
  const data = Array.from({ length: count }, () => new Float32Array(frames));
  return {
    duration: frames / rate,
    length: frames,
    sampleRate: rate,
    numberOfChannels: count,
    getChannelData: (channel: number) => data[Math.min(Math.max(0, channel), count - 1)]!,
    copyFromChannel(destination: Float32Array, channel: number, offset = 0) {
      destination.set(data[Math.min(channel, count - 1)]!.subarray(offset, offset + destination.length));
    },
    copyToChannel(source: Float32Array, channel: number, offset = 0) {
      data[Math.min(channel, count - 1)]!.set(source, offset);
    },
  } as AudioBuffer;
}

export function stretchAudioBuffer(buffer: AudioBuffer, options: AudioStretchOptions): AudioBuffer {
  const sampleRate = Math.max(1, Math.round(buffer.sampleRate || 44100));
  const channelCount = Math.max(1, buffer.numberOfChannels || 1);
  const channels = Array.from({ length: channelCount }, (_, index) =>
    Float32Array.from(buffer.getChannelData(Math.min(index, Math.max(0, buffer.numberOfChannels - 1)))),
  );
  const stretched = stretchChannels({
    channels,
    sampleRate,
    tempoRate: options.tempoRate,
    semitones: options.semitones,
    cents: options.cents,
    preset: options.preset,
    signal: options.signal,
    onProgress: options.onProgress,
  });
  const createBuffer = options.createBuffer ?? createPcmBuffer;
  const next = createBuffer(stretched.channels.length, stretched.frames, stretched.sampleRate);
  for (let index = 0; index < stretched.channels.length; index += 1) {
    next.getChannelData(index).set(stretched.channels[index]!);
  }
  return next;
}

export function stretchChannels(request: StretchChannelRequest): StretchChannelResult {
  if (request.signal?.aborted) throw abortError();
  const sampleRate = Math.max(1, Math.round(request.sampleRate || 44100));
  const source = request.channels.length ? request.channels : [new Float32Array(0)];
  const frames = source[0]?.length ?? 0;
  const tempoRate = clampTempoRate(request.tempoRate);
  const ratio = pitchRatio(request.semitones, request.cents);
  const target = Math.max(1, Math.round((frames || 1) / tempoRate));

  if (!frames || isIdentity(tempoRate, ratio)) {
    const channels = source.map((channel) => {
      const copy = new Float32Array(Math.max(1, channel.length));
      copy.set(channel.subarray(0, copy.length));
      return copy;
    });
    request.onProgress?.(1);
    return { channels, sampleRate, frames: channels[0]?.length ?? 1 };
  }

  const groups: Float32Array[] = [];
  for (let index = 0; index < source.length; index += 2) {
    const left = source[index] ?? new Float32Array(frames);
    const right = source[index + 1];
    const pair = stretchStereo(
      left,
      right ?? left,
      sampleRate,
      frames,
      tempoRate,
      ratio,
      request.preset,
      request.signal,
      request.onProgress,
    );
    groups.push(pair[0]);
    if (right) groups.push(pair[1]);
  }

  return {
    channels: groups,
    sampleRate,
    frames: target,
  };
}

function stretchStereo(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  frames: number,
  tempoRate: number,
  ratio: number,
  preset: StretchPresetId | undefined,
  signal: AbortSignal | undefined,
  onProgress: ((ratio: number) => void) | undefined,
): [Float32Array, Float32Array] {
  const soundtouch = createProcessor(sampleRate, frames, tempoRate, preset);
  soundtouch.pitch = ratio;
  soundtouch.stretch.tempo = tempoRate / ratio;

  const leftChunks: Float32Array[] = [];
  const rightChunks: Float32Array[] = [];
  let produced = 0;
  const target = Math.max(1, Math.round(frames / tempoRate));

  const pull = () => {
    const available = soundtouch.outputBuffer.frameCount;
    if (!available) return;
    const interleaved = new Float32Array(available * 2);
    soundtouch.outputBuffer.extract(interleaved, 0, available);
    soundtouch.outputBuffer.receive(available);
    const leftOut = new Float32Array(available);
    const rightOut = new Float32Array(available);
    for (let index = 0; index < available; index += 1) {
      leftOut[index] = interleaved[index * 2] ?? 0;
      rightOut[index] = interleaved[index * 2 + 1] ?? 0;
    }
    leftChunks.push(leftOut);
    rightChunks.push(rightOut);
    produced += available;
  };

  const drain = () => {
    for (let guard = 0; guard < 1_000_000; guard += 1) {
      if ((guard & 31) === 0 && signal?.aborted) throw abortError();
      const before = pendingFrames(soundtouch);
      soundtouch.process();
      pull();
      if (pendingFrames(soundtouch) === before && soundtouch.outputBuffer.frameCount === 0) return;
    }
  };

  for (let read = 0; read < frames; read += CHUNK_FRAMES) {
    if (signal?.aborted) throw abortError();
    const count = Math.min(CHUNK_FRAMES, frames - read);
    const interleaved = new Float32Array(count * 2);
    for (let index = 0; index < count; index += 1) {
      interleaved[index * 2] = left[read + index] ?? 0;
      interleaved[index * 2 + 1] = right[read + index] ?? 0;
    }
    soundtouch.inputBuffer.putSamples(interleaved, 0, count);
    drain();
    onProgress?.(Math.min(0.95, (read + count) / frames));
  }

  const silenceCap = Math.max(8192, Math.round(sampleRate * 0.5));
  const silence = new Float32Array(Math.min(CHUNK_FRAMES, silenceCap) * 2);
  let silenceFrames = 0;
  while (produced < target && silenceFrames < silenceCap) {
    if (signal?.aborted) throw abortError();
    const count = Math.min(CHUNK_FRAMES, silenceCap - silenceFrames);
    soundtouch.inputBuffer.putSamples(silence.subarray(0, count * 2), 0, count);
    silenceFrames += count;
    drain();
  }

  onProgress?.(1);
  return [takeFrames(leftChunks, target), takeFrames(rightChunks, target)];
}

function createProcessor(
  sampleRate: number,
  frames: number,
  tempoRate: number,
  preset: StretchPresetId | undefined,
): SoundTouch {
  const settings = resolveStretchSettings({ preset, tempoRate, frames, sampleRate });
  const stretchFactory: StretchFactory | undefined =
    settings.backend === "phase-vocoder"
      ? createPhaseVocoderFactory(settings.fftSize, settings.overlapFactor)
      : undefined;
  const soundtouch = new SoundTouch({
    sampleRate,
    sampleBufferType: "fifo",
    stretchFactory,
  });
  soundtouch.setStretchParameters({
    sequenceMs: settings.sequenceMs,
    seekWindowMs: settings.seekWindowMs,
    overlapMs: settings.overlapMs,
    quickSeek: settings.quickSeek,
  });
  return soundtouch;
}

function pendingFrames(soundtouch: SoundTouch): number {
  const input = soundtouch.inputBuffer.frameCount;
  const transposerReadsInput = soundtouch.transposer.inputBuffer === soundtouch.inputBuffer;
  const mid = transposerReadsInput
    ? soundtouch.stretch.inputBuffer?.frameCount ?? 0
    : soundtouch.transposer.inputBuffer?.frameCount ?? 0;
  return input + mid;
}

function takeFrames(chunks: Float32Array[], target: number): Float32Array {
  const out = new Float32Array(target);
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= target) break;
    const count = Math.min(chunk.length, target - offset);
    out.set(chunk.subarray(0, count), offset);
    offset += count;
  }
  return out;
}

function clampTempoRate(tempoRate: number): number {
  if (!Number.isFinite(tempoRate) || tempoRate <= 0) return 1;
  return Math.min(MAX_TEMPO_RATE, Math.max(MIN_TEMPO_RATE, tempoRate));
}

function isIdentity(tempoRate: number, ratio: number): boolean {
  return Math.abs(tempoRate - 1) < IDENTITY_EPS && Math.abs(ratio - 1) < IDENTITY_EPS;
}

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}
