import { resolveTempoRate } from "@/lib/audio-tempo";
import {
  heardClipDuration,
  qviStudioBreakpoints,
  sourceClipDuration,
  type StudioClipSpan,
  type StudioTempoSetting,
  type StudioViewport,
} from "@/lib/studio/definition";

export const STUDIO_MIN_PIXELS_PER_SECOND = 16;
export const STUDIO_MAX_PIXELS_PER_SECOND = 160;
export const STUDIO_BEATS_PER_BAR = 4;
const MIN_TRIM_SEC = 0.05;
/** Shortest selectable time range (same floor as trim). */
export const STUDIO_MIN_TIME_RANGE_SEC = MIN_TRIM_SEC;
const DEFAULT_RULER_BPM = 120;

export type StudioSnapMode = "bar" | "beat" | "off";

/** Heard-time selection on the timeline. Distinct from the playhead. */
export type StudioTimeRange = {
  startSec: number;
  endSec: number;
};

export type StudioBarMark = {
  timeSec: number;
  /** 1-based bar number. */
  bar: number;
};

/** Heard seconds of one beat. Invalid tempos fall back to 120 BPM. */
export function secondsPerBeat(bpm: number): number {
  const safe = Number.isFinite(bpm) && bpm > 0 ? bpm : DEFAULT_RULER_BPM;
  return 60 / safe;
}

export function secondsPerBar(bpm: number, beatsPerBar = STUDIO_BEATS_PER_BAR): number {
  const beats = Number.isFinite(beatsPerBar) && beatsPerBar > 0 ? beatsPerBar : STUDIO_BEATS_PER_BAR;
  return secondsPerBeat(bpm) * beats;
}

/** Bar labels for the ruler. Dense zooms skip beats in the caller; very wide bars keep every bar. */
export function musicalBarMarks(
  durationSec: number,
  pixelsPerSecond: number,
  bpm: number,
  beatsPerBar = STUDIO_BEATS_PER_BAR,
): StudioBarMark[] {
  const rate = pixelsPerSecond > 0 ? pixelsPerSecond : 1;
  const barSec = secondsPerBar(bpm, beatsPerBar);
  if (!(barSec > 0)) return [{ timeSec: 0, bar: 1 }];
  const seconds = timelineWidthPx(durationSec, rate) / rate;
  const barPx = barSec * rate;
  const stride = barPx >= 36 ? 1 : barPx >= 18 ? 2 : 4;
  const marks: StudioBarMark[] = [];
  const last = Math.floor(seconds / barSec + 1e-6);
  for (let index = 0; index <= last; index += stride) {
    marks.push({ timeSec: index * barSec, bar: index + 1 });
  }
  return marks;
}

export function snapHeardTime(seconds: number, bpm: number, mode: StudioSnapMode, beatsPerBar = STUDIO_BEATS_PER_BAR): number {
  const safe = Number.isFinite(seconds) ? seconds : 0;
  if (mode === "off") return Math.max(0, safe);
  const quantum = mode === "bar" ? secondsPerBar(bpm, beatsPerBar) : secondsPerBeat(bpm);
  if (!(quantum > 0)) return Math.max(0, safe);
  return Math.max(0, Math.round(safe / quantum) * quantum);
}

export function snapClipMove(originSec: number, deltaSec: number, bpm: number, mode: StudioSnapMode): number {
  return snapHeardTime(moveClipOffset(originSec, deltaSec), bpm, mode);
}

export function snapTrimStart(
  clip: StudioClipSpan,
  tempo: StudioTempoSetting,
  deltaHeardSec: number,
  bpm: number,
  mode: StudioSnapMode,
): { offsetSec: number; trimStartSec: number } {
  const target = snapHeardTime(clip.offsetSec + (Number.isFinite(deltaHeardSec) ? deltaHeardSec : 0), bpm, mode);
  return trimClipStart(clip, tempo, target - clip.offsetSec);
}

export function snapTrimEnd(
  clip: StudioClipSpan & { sourceDurationSec: number },
  tempo: StudioTempoSetting,
  deltaHeardSec: number,
  bpm: number,
  mode: StudioSnapMode,
): number {
  const heardEnd = clip.offsetSec + clipHeardSeconds(clip, tempo);
  const target = snapHeardTime(heardEnd + (Number.isFinite(deltaHeardSec) ? deltaHeardSec : 0), bpm, mode);
  return trimClipEnd(clip, tempo, target - heardEnd);
}

export function viewportFromWidth(widthPx: number): StudioViewport {
  if (!Number.isFinite(widthPx) || widthPx <= qviStudioBreakpoints.mobileMaxPx) return "mobile";
  if (widthPx <= qviStudioBreakpoints.tabletMaxPx) return "tablet";
  return "desktop";
}

export function nextPixelsPerSecond(current: number, direction: "in" | "out"): number {
  const factor = direction === "in" ? 1.25 : 0.8;
  const next = (Number.isFinite(current) ? current : 48) * factor;
  return Math.min(STUDIO_MAX_PIXELS_PER_SECOND, Math.max(STUDIO_MIN_PIXELS_PER_SECOND, next));
}

export function timelineWidthPx(durationSec: number, pixelsPerSecond: number): number {
  const span = Math.max(Number.isFinite(durationSec) ? durationSec : 0, 30);
  return span * pixelsPerSecond;
}

/** Label the ruler every five seconds. Empty per-second ticks are not drawn. */
export function rulerMarks(durationSec: number, pixelsPerSecond: number): number[] {
  const rate = pixelsPerSecond > 0 ? pixelsPerSecond : 1;
  const seconds = Math.ceil(timelineWidthPx(durationSec, rate) / rate);
  const marks: number[] = [];
  for (let second = 0; second <= seconds; second += 5) marks.push(second);
  return marks;
}

export function clipRect(offsetSec: number, heardSec: number, pixelsPerSecond: number): { leftPx: number; widthPx: number } {
  return {
    leftPx: Math.max(0, offsetSec) * pixelsPerSecond,
    widthPx: Math.max(heardSec * pixelsPerSecond, 12),
  };
}

export function timeAtPixel(pixel: number, pixelsPerSecond: number, durationSec: number): number {
  if (!(pixelsPerSecond > 0)) return 0;
  const time = pixel / pixelsPerSecond;
  const cap = Number.isFinite(durationSec) ? Math.max(0, durationSec) : Number.POSITIVE_INFINITY;
  return Math.min(cap, Math.max(0, time));
}

/**
 * Ordered, clamped heard-time range. Returns null when the span is empty or below the minimum.
 * `a` and `b` may be in either order (drag start/end).
 */
export function normalizeTimeRange(
  a: number,
  b: number,
  durationSec = Number.POSITIVE_INFINITY,
  minSpanSec = STUDIO_MIN_TIME_RANGE_SEC,
): StudioTimeRange | null {
  const cap = Number.isFinite(durationSec) && durationSec >= 0 ? durationSec : Number.POSITIVE_INFINITY;
  const rawA = Number.isFinite(a) ? a : 0;
  const rawB = Number.isFinite(b) ? b : 0;
  const startSec = Math.min(cap, Math.max(0, Math.min(rawA, rawB)));
  const endSec = Math.min(cap, Math.max(0, Math.max(rawA, rawB)));
  const minSpan = Number.isFinite(minSpanSec) && minSpanSec > 0 ? minSpanSec : STUDIO_MIN_TIME_RANGE_SEC;
  if (!(endSec - startSec >= minSpan)) return null;
  return { startSec, endSec };
}

export function timeRangeRect(range: StudioTimeRange, pixelsPerSecond: number): { leftPx: number; widthPx: number } {
  const leftPx = Math.max(0, range.startSec) * pixelsPerSecond;
  const widthPx = Math.max(0, (range.endSec - range.startSec) * pixelsPerSecond);
  return { leftPx, widthPx };
}

export function moveClipOffset(offsetSec: number, deltaSec: number): number {
  const next = (Number.isFinite(offsetSec) ? offsetSec : 0) + (Number.isFinite(deltaSec) ? deltaSec : 0);
  return Math.max(0, next);
}

export function trimClipStart(
  clip: StudioClipSpan,
  tempo: StudioTempoSetting,
  deltaHeardSec: number,
): { offsetSec: number; trimStartSec: number } {
  const rate = Math.max(resolveTempoRate(tempo), 1e-6);
  const limit = Math.max(0, clip.trimEndSec - MIN_TRIM_SEC);
  const trimStartSec = Math.min(limit, Math.max(0, clip.trimStartSec + deltaHeardSec * rate));
  const applied = trimStartSec - clip.trimStartSec;
  return {
    trimStartSec,
    offsetSec: Math.max(0, clip.offsetSec + applied / rate),
  };
}

export function trimClipEnd(clip: StudioClipSpan & { sourceDurationSec: number }, tempo: StudioTempoSetting, deltaHeardSec: number): number {
  const rate = Math.max(resolveTempoRate(tempo), 1e-6);
  const source = Math.max(0, clip.sourceDurationSec);
  return Math.min(source, Math.max(clip.trimStartSec + MIN_TRIM_SEC, clip.trimEndSec + deltaHeardSec * rate));
}

export function clipHeardSeconds(clip: StudioClipSpan, tempo: StudioTempoSetting): number {
  return heardClipDuration(sourceClipDuration(clip), tempo);
}

/** Draw at most one bar per CSS pixel, and cap the canvas at 2x so phones do not allocate 3x bitmaps. */
export function waveformDrawBudget(
  cssWidth: number,
  peakCount: number,
  devicePixelRatio = 1,
): { bars: number; pixelRatio: number } {
  const width = Number.isFinite(cssWidth) ? Math.max(1, cssWidth) : 1;
  const ratio = Math.min(2, Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1));
  const available = Math.max(1, Math.floor(peakCount) || 1);
  return { bars: Math.min(available, Math.ceil(width)), pixelRatio: ratio };
}

export function downsamplePeaks(peaks: readonly number[], bars: number): number[] {
  const count = Math.max(1, Math.floor(bars) || 1);
  if (peaks.length <= count) return [...peaks];
  const next: number[] = [];
  const block = peaks.length / count;
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor(index * block);
    const end = Math.min(peaks.length, Math.max(start + 1, Math.floor((index + 1) * block)));
    let max = 0;
    for (let cursor = start; cursor < end; cursor += 1) max = Math.max(max, peaks[cursor] ?? 0);
    next.push(max);
  }
  return next;
}
