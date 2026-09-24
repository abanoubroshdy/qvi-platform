/**
 * Peak meters for the studio console.
 * Levels are read from AnalyserNode time-domain data on a frame clock, not per sample.
 */

export const STUDIO_METER_FRAME_MS = 32;

export type StudioMeterReading = {
  master: number;
  tracks: Record<string, number>;
};

export function peakFromTimeDomain(samples: ArrayLike<number>): number {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.abs(samples[index] ?? 0);
    if (value > peak) peak = value;
  }
  if (!Number.isFinite(peak) || peak <= 0) return 0;
  return peak > 1 ? 1 : peak;
}

/** Instant attack, exponential fall (~300ms half-life at 32ms frames). */
export function decayMeter(previous: number, next: number, fall = 0.92): number {
  const raw = Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : 0;
  const prev = Number.isFinite(previous) ? Math.min(1, Math.max(0, previous)) : 0;
  const level = raw >= prev ? raw : prev * fall;
  return level < 0.004 ? 0 : level;
}
