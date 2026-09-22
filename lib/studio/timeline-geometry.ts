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
const MIN_TRIM_SEC = 0.05;

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
