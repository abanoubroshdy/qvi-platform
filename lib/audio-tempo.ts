/**
 * Tempo / pitch helpers for the browser FFmpeg wasm build.
 *
 * Pitch without changing duration uses the classic chain (no rubberband in @ffmpeg/core):
 *   asetrate=sr*ratio,aresample=sr,atempo=tempoRate/ratio
 * so pitch is applied via sample-rate reinterpretation and duration is restored (or
 * combined with a tempo change) through atempo factors.
 *
 * Tempo-only uses atempo. Each atempo factor stays in [0.5, 2] for quality; larger
 * ratios are daisy-chained (see FFmpeg atempo docs).
 */

import {
  audioCodecArgs,
  audioExportMimeType,
  audioExportOutputName,
  clampAudioExportSettings,
  type AudioExportFormat,
  type AudioExportSettings,
} from "@/lib/audio-export";

export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const DEFAULT_BPM = 120;

export const MIN_SEMITONES = -12;
export const MAX_SEMITONES = 12;
export const MIN_CENTS = -50;
export const MAX_CENTS = 50;

export const MIN_TEMPO_PERCENT = -50;
export const MAX_TEMPO_PERCENT = 100;

/** Preferred atempo factor range for smoother results (FFmpeg allows up to 100). */
export const ATEMPO_MIN = 0.5;
export const ATEMPO_MAX = 2;

export const TAP_GAP_RESET_MS = 2500;
export const MIN_TAPS_FOR_BPM = 3;
export const TAP_INTERVAL_WINDOW = 8;

const RATE_EPS = 1e-6;
const RATIO_EPS = 1e-9;

export type TempoMode = "bpm" | "percent";

export type TempoPitchExportPlan = {
  filter: string;
  tempoRate: number;
  pitchRatio: number;
  estimatedDuration: number;
  outputName: string;
  mimeType: string;
  extension: AudioExportFormat;
  args: string[];
  fallbackArgs: string[][];
};

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Format a positive number for FFmpeg filter args (no scientific notation). */
export function formatFilterNumber(value: number, digits = 8): string {
  if (!Number.isFinite(value)) return "1";
  const fixed = value.toFixed(digits);
  return fixed.replace(/\.?0+$/, "") || "0";
}

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, value));
}

export function clampSemitones(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_SEMITONES, Math.max(MIN_SEMITONES, Math.round(value)));
}

export function clampCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_CENTS, Math.max(MIN_CENTS, Math.round(value)));
}

export function clampTempoPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_TEMPO_PERCENT, Math.max(MIN_TEMPO_PERCENT, value));
}

/** target/original — e.g. 100 → 120 yields 1.2 */
export function tempoRateFromBpm(originalBpm: number, targetBpm: number): number {
  const original = clampBpm(originalBpm);
  const target = clampBpm(targetBpm);
  return round6(target / original);
}

/** 1 + percent/100 — e.g. +20 → 1.2, −50 → 0.5 */
export function tempoRateFromPercent(percent: number): number {
  const p = clampTempoPercent(percent);
  const rate = 1 + p / 100;
  return round6(Math.max(ATEMPO_MIN * ATEMPO_MIN * ATEMPO_MIN, rate));
}

export function bpmDelta(originalBpm: number, targetBpm: number): number {
  return round1(clampBpm(targetBpm) - clampBpm(originalBpm));
}

/** Total pitch offset in cents (semitone = 100¢). */
export function totalCents(semitones: number, cents: number): number {
  return clampSemitones(semitones) * 100 + clampCents(cents);
}

/** Equal-temperament frequency ratio from semitones + cents. */
export function pitchRatio(semitones: number, cents: number): number {
  const total = totalCents(semitones, cents);
  return round6(2 ** (total / 1200));
}

/**
 * Split a tempo scale into atempo factors within [ATEMPO_MIN, ATEMPO_MAX].
 * Returns [] when the rate is effectively 1.
 */
export function chainAtempoFactors(rate: number): number[] {
  if (!Number.isFinite(rate) || rate <= 0) return [1];
  let remaining = rate;
  if (Math.abs(remaining - 1) < RATE_EPS) return [];

  const factors: number[] = [];
  while (remaining > ATEMPO_MAX + RATE_EPS) {
    factors.push(ATEMPO_MAX);
    remaining /= ATEMPO_MAX;
  }
  while (remaining < ATEMPO_MIN - RATE_EPS) {
    factors.push(ATEMPO_MIN);
    remaining /= ATEMPO_MIN;
  }
  if (Math.abs(remaining - 1) >= RATE_EPS) {
    factors.push(round6(remaining));
  }
  return factors.length ? factors : [];
}

/** Comma-joined atempo=… chain, or empty string when tempo is unchanged. */
export function atempoFilter(rate: number): string {
  return chainAtempoFactors(rate)
    .map((factor) => `atempo=${formatFilterNumber(factor)}`)
    .join(",");
}

/**
 * Pitch shift while restoring (or adjusting) duration via a combined atempo product.
 * `tempoRate` is the desired speed relative to the original (1 = same tempo).
 */
export function buildTempoPitchFilter(options: {
  sampleRate: number;
  tempoRate: number;
  semitones: number;
  cents: number;
}): string {
  const sampleRate = Math.max(1, Math.round(options.sampleRate) || 44100);
  const tempoRate = Number.isFinite(options.tempoRate) && options.tempoRate > 0 ? options.tempoRate : 1;
  const ratio = pitchRatio(options.semitones, options.cents);
  const parts: string[] = [];

  if (Math.abs(ratio - 1) >= RATIO_EPS) {
    const setRate = sampleRate * ratio;
    parts.push(`asetrate=${formatFilterNumber(setRate)}`, `aresample=${sampleRate}`);
    const combined = tempoRate / ratio;
    const tempo = atempoFilter(combined);
    if (tempo) parts.push(tempo);
  } else {
    const tempo = atempoFilter(tempoRate);
    if (tempo) parts.push(tempo);
  }

  return parts.join(",");
}

/** Output duration after a tempo change (pitch-keep-duration does not alter length). */
export function estimateOutputDuration(sourceDuration: number, tempoRate: number): number {
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) return 0;
  const rate = Number.isFinite(tempoRate) && tempoRate > 0 ? tempoRate : 1;
  return round6(sourceDuration / rate);
}

/**
 * Append a tap timestamp. Resets the series when the gap since the last tap is too long.
 */
export function appendTap(timestampsMs: number[], nowMs: number, gapResetMs = TAP_GAP_RESET_MS): number[] {
  if (!Number.isFinite(nowMs)) return timestampsMs.slice();
  if (!timestampsMs.length) return [nowMs];
  const last = timestampsMs[timestampsMs.length - 1]!;
  if (nowMs - last > gapResetMs) return [nowMs];
  return [...timestampsMs, nowMs];
}

/**
 * Estimate BPM from tap timestamps using the median of recent inter-tap intervals.
 * Needs at least {@link MIN_TAPS_FOR_BPM} taps (two intervals).
 */
export function tapBpmFromTimestamps(timestampsMs: number[]): number | null {
  if (timestampsMs.length < MIN_TAPS_FOR_BPM) return null;

  const intervals: number[] = [];
  for (let index = 1; index < timestampsMs.length; index += 1) {
    const delta = timestampsMs[index]! - timestampsMs[index - 1]!;
    if (delta > 0) intervals.push(delta);
  }
  if (!intervals.length) return null;

  const recent = intervals.slice(-TAP_INTERVAL_WINDOW);
  const sorted = recent.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  if (!(median > 0)) return null;

  return clampBpm(round1(60_000 / median));
}

export function resolveTempoRate(options: {
  mode: TempoMode;
  originalBpm: number;
  targetBpm: number;
  percent: number;
}): number {
  if (options.mode === "percent") return tempoRateFromPercent(options.percent);
  return tempoRateFromBpm(options.originalBpm, options.targetBpm);
}

/** Build FFmpeg args for tempo and/or pitch processing + export. */
export function buildTempoPitchExportPlan(options: {
  inputName: string;
  sourceDuration: number;
  sampleRate: number;
  mode: TempoMode;
  originalBpm: number;
  targetBpm: number;
  percent: number;
  semitones: number;
  cents: number;
  format: AudioExportFormat;
  settings: AudioExportSettings;
}): TempoPitchExportPlan {
  const format = options.format;
  const settings = clampAudioExportSettings(format, options.settings);
  const tempoRate = resolveTempoRate({
    mode: options.mode,
    originalBpm: options.originalBpm,
    targetBpm: options.targetBpm,
    percent: options.percent,
  });
  const ratio = pitchRatio(options.semitones, options.cents);
  const filter = buildTempoPitchFilter({
    sampleRate: options.sampleRate || settings.sampleRate,
    tempoRate,
    semitones: options.semitones,
    cents: options.cents,
  });
  const outputName = audioExportOutputName(format);
  const mimeType = audioExportMimeType(format);
  const codec = audioCodecArgs(format, settings);
  const filterArgs = filter ? ["-af", filter] : [];

  const reencode = ["-i", options.inputName, ...filterArgs, "-vn", ...codec, outputName];
  const reencodeUnmapped = ["-i", options.inputName, ...filterArgs, ...codec, outputName];

  return {
    filter,
    tempoRate,
    pitchRatio: ratio,
    estimatedDuration: estimateOutputDuration(options.sourceDuration, tempoRate),
    outputName,
    mimeType,
    extension: format,
    args: reencode,
    fallbackArgs: [reencodeUnmapped],
  };
}
