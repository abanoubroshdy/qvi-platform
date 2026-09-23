/**
 * Timeline peaks for QVI Studio.
 * Phones store fewer bars and sample each bar instead of scanning every PCM frame.
 */

import type { StudioViewport } from "@/lib/studio/definition";

const SAMPLES_PER_BAR = 32;

export function studioPeakBarCount(viewport: StudioViewport): number {
  if (viewport === "mobile") return 48;
  if (viewport === "tablet") return 96;
  return 180;
}

export function studioPeaksFromBuffer(buffer: AudioBuffer, bars: number): number[] {
  const channel = buffer.getChannelData(0);
  const count = Math.max(1, Math.floor(bars) || 1);
  const block = Math.max(1, Math.floor(channel.length / count));
  const step = Math.max(1, Math.floor(block / SAMPLES_PER_BAR));
  const peaks: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const start = index * block;
    const end = Math.min(channel.length, start + block);
    let max = 0;
    for (let offset = start; offset < end; offset += step) {
      max = Math.max(max, Math.abs(channel[offset] ?? 0));
    }
    peaks.push(max);
  }
  return peaks;
}
