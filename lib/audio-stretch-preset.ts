/**
 * Quality presets for the shared SoundTouch stretcher.
 *
 * Music is the default and matches the phase-vocoder path used before presets
 * existed. Speech stays on WSOLA with the classic SoundTouch speech windows.
 * Solo vocal prefers a denser phase-vocoder overlap and falls back to WSOLA
 * when the clip is too short for that FFT.
 *
 * SoundTouchJS exposes pitch and tempo only. It has no formant-preserve API,
 * so this module does not invent one.
 */

import type { PhaseVocoderFftSize, PhaseVocoderOverlapFactor } from "@soundtouchjs/stretch-phase-vocoder";
import { totalCents } from "@/lib/audio-tempo";

export const STRETCH_PRESET_IDS = ["music", "speech", "solo-vocal"] as const;

export type StretchPresetId = (typeof STRETCH_PRESET_IDS)[number];

export const DEFAULT_STRETCH_PRESET: StretchPresetId = "music";

/** Public SoundTouchJS builds do not expose formant preservation. */
export const soundTouchFormantPreserve = false as const;

/** Comfortable tempo is the tool's percent range: half speed through double speed. */
export const COMFORT_MIN_TEMPO_RATE = 0.5;
export const COMFORT_MAX_TEMPO_RATE = 2;
/** ±12 semitones. Cents stacked on that edge are outside the comfortable pitch range. */
export const COMFORT_MAX_ABS_CENTS = 1200;

const PHASE_VOCODER_MIN_FRAMES = 2048;
const PHASE_VOCODER_EXTREME_MIN_FRAMES = 8192;
const TEMPO_EPS = 1e-6;

export type StretchBackend = "phase-vocoder" | "wsola";

export type ResolvedStretchSettings = {
  preset: StretchPresetId;
  backend: StretchBackend;
  fftSize: PhaseVocoderFftSize;
  overlapFactor: PhaseVocoderOverlapFactor;
  sequenceMs: number;
  seekWindowMs: number;
  overlapMs: number;
  quickSeek: boolean;
};

type PresetSpec = {
  preferPhaseVocoder: boolean;
  fftSize: PhaseVocoderFftSize;
  overlapFactor: PhaseVocoderOverlapFactor;
  extremeOverlapFactor: PhaseVocoderOverlapFactor;
  sequenceMs: number;
  seekWindowMs: number;
  overlapMs: number;
  quickSeek: boolean;
};

const PRESETS: Record<StretchPresetId, PresetSpec> = {
  music: {
    preferPhaseVocoder: true,
    fftSize: 2048,
    overlapFactor: 4,
    extremeOverlapFactor: 8,
    sequenceMs: 0,
    seekWindowMs: 0,
    overlapMs: 12,
    quickSeek: false,
  },
  speech: {
    preferPhaseVocoder: false,
    fftSize: 2048,
    overlapFactor: 4,
    extremeOverlapFactor: 4,
    sequenceMs: 40,
    seekWindowMs: 15,
    overlapMs: 8,
    quickSeek: true,
  },
  "solo-vocal": {
    preferPhaseVocoder: true,
    fftSize: 2048,
    overlapFactor: 8,
    extremeOverlapFactor: 8,
    sequenceMs: 60,
    seekWindowMs: 20,
    overlapMs: 12,
    quickSeek: false,
  },
};

export function parseStretchPreset(value: unknown): StretchPresetId {
  return value === "speech" || value === "solo-vocal" || value === "music" ? value : DEFAULT_STRETCH_PRESET;
}

export function resolveStretchSettings(input: {
  preset?: unknown;
  tempoRate: number;
  frames: number;
  sampleRate: number;
}): ResolvedStretchSettings {
  const preset = parseStretchPreset(input.preset);
  const spec = PRESETS[preset];
  const tempoRate = Number.isFinite(input.tempoRate) && input.tempoRate > 0 ? input.tempoRate : 1;
  const extreme = tempoRate < COMFORT_MIN_TEMPO_RATE || tempoRate > COMFORT_MAX_TEMPO_RATE;
  const overlapFactor = extreme ? spec.extremeOverlapFactor : spec.overlapFactor;
  const sampleRate = Math.max(1, input.sampleRate);
  const frames = Math.max(0, input.frames);
  const durationSec = frames / sampleRate;
  const windowSec = spec.fftSize / sampleRate;
  const minimumFrames = overlapFactor >= 8 ? PHASE_VOCODER_EXTREME_MIN_FRAMES : PHASE_VOCODER_MIN_FRAMES;
  const phaseVocoderFits = frames >= minimumFrames && durationSec >= windowSec * 8;
  const backend: StretchBackend = spec.preferPhaseVocoder && phaseVocoderFits ? "phase-vocoder" : "wsola";
  return {
    preset,
    backend,
    fftSize: spec.fftSize,
    overlapFactor,
    sequenceMs: spec.sequenceMs,
    seekWindowMs: spec.seekWindowMs,
    overlapMs: spec.overlapMs,
    quickSeek: spec.quickSeek,
  };
}

export function tempoPitchComfort(input: { tempoRate: number; semitones: number; cents: number }): {
  tempo: boolean;
  pitch: boolean;
} {
  const rate = Number.isFinite(input.tempoRate) && input.tempoRate > 0 ? input.tempoRate : 1;
  return {
    tempo: rate < COMFORT_MIN_TEMPO_RATE - TEMPO_EPS || rate > COMFORT_MAX_TEMPO_RATE + TEMPO_EPS,
    pitch: Math.abs(totalCents(input.semitones, input.cents)) > COMFORT_MAX_ABS_CENTS,
  };
}
