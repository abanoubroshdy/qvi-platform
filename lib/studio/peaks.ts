/**
 * Timeline peaks for QVI Studio.
 * Overview peaks are stored with the clip. Zoomed draws can resample the buffer.
 * Phones keep a lighter overview; each bar still samples PCM instead of every frame.
 */

import type { StudioViewport } from "@/lib/studio/definition";

const SAMPLES_PER_BAR = 32;

/** Desktop stores a denser overview so modest zooms keep their shape without PCM. */
export const studioPeakBars = {
  mobile: 160,
  tablet: 320,
  desktop: 640,
} as const;

export function studioPeakBarCount(viewport: StudioViewport): number {
  return studioPeakBars[viewport];
}

export function studioPeaksFromBuffer(buffer: AudioBuffer, bars: number): number[] {
  return studioPeaksFromBufferRegion(buffer, 0, buffer.duration, bars);
}

/**
 * Peak bars for a source-time slice. Used when zoom needs more detail than the overview.
 * Samples every channel and keeps the absolute max in each bar.
 */
export function studioPeaksFromBufferRegion(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
  bars: number,
): number[] {
  const count = Math.max(1, Math.floor(bars) || 1);
  const rate = buffer.sampleRate > 0 ? buffer.sampleRate : 1;
  const startSample = Math.max(0, Math.floor((Number.isFinite(startSec) ? startSec : 0) * rate));
  const endSample = Math.min(
    buffer.length,
    Math.max(startSample + 1, Math.ceil((Number.isFinite(endSec) ? endSec : buffer.duration) * rate)),
  );
  const span = Math.max(1, endSample - startSample);
  const block = Math.max(1, Math.floor(span / count));
  const step = Math.max(1, Math.floor(block / SAMPLES_PER_BAR));
  const channels = Math.max(1, buffer.numberOfChannels);
  const peaks: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const start = startSample + index * block;
    const end = Math.min(endSample, start + block);
    let max = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let offset = start; offset < end; offset += step) {
        max = Math.max(max, Math.abs(data[offset] ?? 0));
      }
    }
    peaks.push(max);
  }
  return peaks;
}

/**
 * Overview peaks when coarse enough; otherwise resample the trimmed buffer region.
 * Prefer overview when it already has at least one sample per draw bar.
 */
export function resolveClipWaveformPeaks(options: {
  overview: readonly number[];
  buffer: AudioBuffer | null;
  trimStartSec: number;
  trimEndSec: number;
  sourceDurationSec: number;
  drawBars: number;
}): number[] {
  const drawBars = Math.max(1, Math.floor(options.drawBars) || 1);
  const overview = visiblePeaks(
    options.overview,
    options.trimStartSec,
    options.trimEndSec,
    options.sourceDurationSec,
  );
  const canDetail =
    options.buffer &&
    options.buffer.length > 0 &&
    drawBars > overview.length;
  if (canDetail && options.buffer) {
    const start = Math.max(0, options.trimStartSec);
    const end = Math.max(start + 1e-4, options.trimEndSec);
    return studioPeaksFromBufferRegion(options.buffer, start, end, drawBars);
  }
  return downsamplePeaks(overview, drawBars);
}

export function visiblePeaks(
  peaks: readonly number[],
  trimStart: number,
  trimEnd: number,
  sourceDuration: number,
): number[] {
  if (!peaks.length || !(sourceDuration > 0)) return [...peaks];
  const start = Math.floor((Math.max(0, trimStart) / sourceDuration) * peaks.length);
  const end = Math.ceil((Math.max(trimStart, trimEnd) / sourceDuration) * peaks.length);
  const slice = peaks.slice(start, Math.max(start + 1, end));
  return slice.length ? [...slice] : [...peaks];
}

function downsamplePeaks(peaks: readonly number[], bars: number): number[] {
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
