/**
 * Track pan, fixed 3-band EQ, and a light compressor.
 * These are static inserts. Volume automation is not part of this.
 */

export const STUDIO_PAN_MIN = -1;
export const STUDIO_PAN_MAX = 1;
export const STUDIO_EQ_MIN_DB = -12;
export const STUDIO_EQ_MAX_DB = 12;
export const STUDIO_EQ_FREQUENCIES = { low: 120, mid: 1000, high: 8000 } as const;

export type StudioTrackEq = {
  lowDb: number;
  midDb: number;
  highDb: number;
};

export type StudioCompressorSettings = {
  threshold: number;
  ratio: number;
  knee: number;
  attack: number;
  release: number;
};

export function clampPan(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(STUDIO_PAN_MAX, Math.max(STUDIO_PAN_MIN, value));
}

export function clampEqDb(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(STUDIO_EQ_MAX_DB, Math.max(STUDIO_EQ_MIN_DB, value));
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function defaultTrackEq(): StudioTrackEq {
  return { lowDb: 0, midDb: 0, highDb: 0 };
}

export function normalizeTrackMix(input?: { pan?: number; eq?: Partial<StudioTrackEq> | null; compressor?: number } | null): {
  pan: number;
  eq: StudioTrackEq;
  compressor: number;
} {
  return {
    pan: clampPan(input?.pan ?? 0),
    eq: {
      lowDb: clampEqDb(input?.eq?.lowDb ?? 0),
      midDb: clampEqDb(input?.eq?.midDb ?? 0),
      highDb: clampEqDb(input?.eq?.highDb ?? 0),
    },
    compressor: clampUnit(input?.compressor ?? 0),
  };
}

/** 0 is bypass. 1 is a light squeeze: -24 dB threshold, ratio 4. */
export function compressorFromAmount(amount: number): StudioCompressorSettings {
  const level = clampUnit(amount);
  return {
    threshold: level === 0 ? 0 : -24 * level,
    ratio: 1 + 3 * level,
    knee: 6 * level,
    attack: 0.01,
    release: 0.25,
  };
}

export function formatPan(pan: number): string {
  const value = clampPan(pan);
  if (Math.abs(value) < 0.02) return "C";
  const percent = Math.round(Math.abs(value) * 100);
  return value < 0 ? `L${percent}` : `R${percent}`;
}

export function punchInOffset(playheadSec: number): number {
  if (!Number.isFinite(playheadSec)) return 0;
  return Math.max(0, playheadSec);
}

export function nextRecordingName(fileNames: readonly string[]): string {
  let max = 0;
  for (const name of fileNames) {
    const match = /^Take (\d+)\.wav$/i.exec(name);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value)) max = Math.max(max, value);
  }
  return `Take ${max + 1}.wav`;
}

export function concatChannelFrames(frames: readonly Float32Array[]): Float32Array {
  let length = 0;
  for (const frame of frames) length += frame.length;
  const out = new Float32Array(length);
  let offset = 0;
  for (const frame of frames) {
    out.set(frame, offset);
    offset += frame.length;
  }
  return out;
}

export function micFailureNotice(error: unknown): "mic-denied" | "mic-unavailable" {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") return "mic-denied";
  return "mic-unavailable";
}
