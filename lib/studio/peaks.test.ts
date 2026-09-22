import { describe, expect, it } from "vitest";
import { studioPeakBarCount, studioPeaksFromBuffer } from "@/lib/studio/peaks";

function bufferOf(samples: number[]): AudioBuffer {
  const data = Float32Array.from(samples);
  return {
    duration: samples.length / 10,
    length: samples.length,
    sampleRate: 10,
    numberOfChannels: 1,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

describe("studio peaks", () => {
  it("uses fewer bars on a phone than on a desktop", () => {
    expect(studioPeakBarCount("mobile")).toBeLessThan(studioPeakBarCount("tablet"));
    expect(studioPeakBarCount("tablet")).toBeLessThan(studioPeakBarCount("desktop"));
    expect(studioPeakBarCount("desktop")).toBe(180);
  });

  it("samples each bar instead of reading every frame", () => {
    const samples = Array.from({ length: 400 }, () => 0);
    samples[1] = 1;
    const peaks = studioPeaksFromBuffer(bufferOf(samples), 4);
    expect(peaks).toHaveLength(4);
    expect(peaks[0]).toBe(0);
  });
});
