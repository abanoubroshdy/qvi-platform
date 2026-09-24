import { describe, expect, it } from "vitest";
import {
  resolveClipWaveformPeaks,
  studioPeakBarCount,
  studioPeaksFromBuffer,
  studioPeaksFromBufferRegion,
  visiblePeaks,
} from "@/lib/studio/peaks";

function bufferOf(samples: number[], channels = 1): AudioBuffer {
  const data = Float32Array.from(samples);
  return {
    duration: samples.length / 10,
    length: samples.length,
    sampleRate: 10,
    numberOfChannels: channels,
    getChannelData: (channel: number) => {
      if (channel === 0) return data;
      const other = Float32Array.from(samples.map((value) => value * 0.5));
      return other;
    },
  } as unknown as AudioBuffer;
}

describe("studio peaks", () => {
  it("uses denser overview bars on larger viewports", () => {
    expect(studioPeakBarCount("mobile")).toBeLessThan(studioPeakBarCount("tablet"));
    expect(studioPeakBarCount("tablet")).toBeLessThan(studioPeakBarCount("desktop"));
    expect(studioPeakBarCount("desktop")).toBe(640);
  });

  it("samples each bar instead of reading every frame", () => {
    const samples = Array.from({ length: 400 }, () => 0);
    samples[1] = 1;
    const peaks = studioPeaksFromBuffer(bufferOf(samples), 4);
    expect(peaks).toHaveLength(4);
    expect(peaks[0]).toBe(0);
  });

  it("resamples a trim window when the draw needs more bars than the overview", () => {
    const samples = Array.from({ length: 100 }, (_, index) => (index >= 50 && index < 60 ? 1 : 0));
    const buffer = bufferOf(samples);
    const overview = studioPeaksFromBuffer(buffer, 4);
    const region = studioPeaksFromBufferRegion(buffer, 5, 6, 8);
    expect(region).toHaveLength(8);
    expect(Math.max(...region)).toBeGreaterThan(0.5);
    const detail = resolveClipWaveformPeaks({
      overview,
      buffer,
      trimStartSec: 5,
      trimEndSec: 6,
      sourceDurationSec: 10,
      drawBars: 20,
    });
    expect(detail).toHaveLength(20);
    expect(Math.max(...detail)).toBeGreaterThan(0.5);
    expect(visiblePeaks(overview, 0, 5, 10).length).toBeGreaterThan(0);
  });
});
