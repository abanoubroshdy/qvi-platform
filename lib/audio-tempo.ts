/**
 * Tempo / pitch helpers for the browser FFmpeg wasm build.
 *
 * Filter stages are applied in a fixed order (never mixed into one atempo product):
 *   1) Pitch keep-duration: asetrate=sr*ratio,aresample=sr,atempo=1/ratio
 *   2) Tempo only:          atempo=… (daisy-chained in [0.5, 2])
 *
 * Tempo-only (semitones=0, cents=0) MUST be an atempo chain with no asetrate —
 * that is what keeps musical pitch unchanged while speeding/slowing.
 * @ffmpeg/core typically has no rubberband; do not rely on it.
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

/** Display string for a known BPM value (no clamping of mid-typing drafts). */
export function formatBpmDraft(bpm: number): string {
  if (!Number.isFinite(bpm)) return String(DEFAULT_BPM);
  const rounded = round1(bpm);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Parse a BPM text field on blur/Enter. Returns null when empty or non-numeric
 * so the caller can restore the previous committed value.
 */
export function parseBpmDraft(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed || trimmed === "+" || trimmed === "-" || trimmed === ".") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return clampBpm(value);
}

/** Allow intermediate typing like "1", "10", "106", "120.5" without clamping. */
export function sanitizeBpmDraftInput(text: string): string {
  const normalized = text.replace(/,/g, ".");
  let cleaned = "";
  let seenDot = false;
  for (const char of normalized) {
    if (char >= "0" && char <= "9") {
      const dotIndex = cleaned.indexOf(".");
      if (dotIndex === -1) {
        if (cleaned.length < 3) cleaned += char;
      } else if (cleaned.length - dotIndex - 1 < 1) {
        cleaned += char;
      }
      continue;
    }
    if (char === "." && !seenDot) {
      seenDot = true;
      cleaned += char;
    }
  }
  return cleaned;
}

export function clampSemitones(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_SEMITONES, Math.max(MIN_SEMITONES, Math.round(value)));
}

export function clampCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_CENTS, Math.max(MIN_CENTS, Math.round(value)));
}

/** Signed display for committed pitch offsets, e.g. "+2", "-5", "0". */
export function formatSignedDraft(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

/**
 * Parse a signed integer draft on blur/Enter. Returns null when empty/incomplete
 * so the caller can restore the previous committed value.
 */
export function parseSignedDraft(text: string, clamp: (value: number) => number): number | null {
  const trimmed = text
    .trim()
    .replace(/[＋﹢]/g, "+")
    .replace(/[−–—]/g, "-");
  if (!trimmed || trimmed === "+" || trimmed === "-") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return clamp(value);
}

/** Allow intermediate typing like "-", "+1", "12" without clamping. */
export function sanitizeSignedDraftInput(text: string, maxDigits = 3): string {
  const normalized = text
    .replace(/[＋﹢]/g, "+")
    .replace(/[−–—]/g, "-");
  let cleaned = "";
  for (const char of normalized) {
    if ((char === "+" || char === "-") && cleaned.length === 0) {
      cleaned += char;
      continue;
    }
    if (char >= "0" && char <= "9") {
      const digits = cleaned.startsWith("+") || cleaned.startsWith("-") ? cleaned.slice(1) : cleaned;
      if (digits.length < maxDigits) cleaned += char;
    }
  }
  return cleaned;
}

export function parseSemitonesDraft(text: string): number | null {
  return parseSignedDraft(text, clampSemitones);
}

export function parseCentsDraft(text: string): number | null {
  return parseSignedDraft(text, clampCents);
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
 * Pitch shift that restores original duration (atempo = 1/ratio).
 * Empty when pitch is unchanged. Never includes the user tempo change.
 */
export function buildPitchKeepDurationFilter(sampleRate: number, semitones: number, cents: number): string {
  const sr = Math.max(1, Math.round(sampleRate) || 44100);
  const ratio = pitchRatio(semitones, cents);
  if (Math.abs(ratio - 1) < RATIO_EPS) return "";

  const setRate = sr * ratio;
  const restore = atempoFilter(1 / ratio);
  const parts = [`asetrate=${formatFilterNumber(setRate)}`, `aresample=${sr}`];
  if (restore) parts.push(restore);
  return parts.join(",");
}

/** True when the filter is empty or only daisy-chained atempo (pitch-preserving tempo). */
export function isAtempoOnlyFilter(filter: string): boolean {
  if (!filter) return true;
  return /^(atempo=[0-9.eE+-]+)(,atempo=[0-9.eE+-]+)*$/.test(filter);
}

/**
 * Build the full -af chain: pitch-keep-duration first, then tempo atempo.
 * Tempo-only requests never emit asetrate/aresample.
 */
export function buildTempoPitchFilter(options: {
  sampleRate: number;
  tempoRate: number;
  semitones: number;
  cents: number;
}): string {
  const sampleRate = Math.max(1, Math.round(options.sampleRate) || 44100);
  const tempoRate = Number.isFinite(options.tempoRate) && options.tempoRate > 0 ? options.tempoRate : 1;
  const pitch = buildPitchKeepDurationFilter(sampleRate, options.semitones, options.cents);
  const tempo = atempoFilter(tempoRate);
  return [pitch, tempo].filter(Boolean).join(",");
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
