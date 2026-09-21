import { describe, expect, it } from "vitest";
import {
  amixFilter,
  concatFilter,
  estimateAmixDuration,
  estimateConcatDuration,
  trimFadeFilter,
} from "@/lib/audio-edit";

describe("trimFadeFilter", () => {
  it("builds in and out afade filters relative to the trimmed clip", () => {
    const result = trimFadeFilter({ start: 2, end: 12, fadeIn: 1.5, fadeOut: 1 });
    expect(result.duration).toBe(10);
    expect(result.fadeIn).toBe(1.5);
    expect(result.fadeOut).toBe(1);
    expect(result.fadeOutStart).toBe(9);
    expect(result.filter).toBe("afade=t=in:st=0:d=1.5,afade=t=out:st=9:d=1");
  });

  it("returns an empty filter when fades are zero", () => {
    expect(trimFadeFilter({ start: 0, end: 5, fadeIn: 0, fadeOut: 0 }).filter).toBe("");
  });

  it("scales fades down when they exceed the clip length", () => {
    const result = trimFadeFilter({ start: 0, end: 2, fadeIn: 2, fadeOut: 2 });
    expect(result.duration).toBe(2);
    expect(result.fadeIn + result.fadeOut).toBeCloseTo(2, 5);
    expect(result.fadeOutStart).toBeCloseTo(result.duration - result.fadeOut, 5);
    expect(result.filter).toContain("afade=t=in");
    expect(result.filter).toContain("afade=t=out");
  });

  it("clamps a fade-out that is longer than the selection", () => {
    const result = trimFadeFilter({ start: 1, end: 3, fadeIn: 0, fadeOut: 10 });
    expect(result.fadeOut).toBe(2);
    expect(result.fadeOutStart).toBe(0);
    expect(result.filter).toBe("afade=t=out:st=0:d=2");
  });
});

describe("concatFilter", () => {
  it("hard-concats normalized inputs when splice fade is zero", () => {
    expect(concatFilter(2, { sampleRate: 44100, channels: 2, spliceFade: 0 })).toBe(
      "[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];[1:a]aformat=sample_rates=44100:channel_layouts=stereo[a1];[a0][a1]concat=n=2:v=0:a=1[out]",
    );
  });

  it("chains acrossfade for splice fades", () => {
    expect(concatFilter(3, { sampleRate: 48000, channels: 1, spliceFade: 0.08 })).toBe(
      "[0:a]aformat=sample_rates=48000:channel_layouts=mono[a0];[1:a]aformat=sample_rates=48000:channel_layouts=mono[a1];[2:a]aformat=sample_rates=48000:channel_layouts=mono[a2];[a0][a1]acrossfade=d=0.08:c1=tri:c2=tri[x1];[x1][a2]acrossfade=d=0.08:c1=tri:c2=tri[out]",
    );
  });

  it("handles a single input", () => {
    expect(concatFilter(1, { sampleRate: 44100, channels: 2, spliceFade: 0.1 })).toBe(
      "[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];[a0]anull[out]",
    );
  });
});

describe("amixFilter", () => {
  it("mixes normalized inputs with longest duration", () => {
    expect(amixFilter(2, { sampleRate: 44100, channels: 2 })).toBe(
      "[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];[1:a]aformat=sample_rates=44100:channel_layouts=stereo[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[out]",
    );
  });
});

describe("duration estimates", () => {
  it("subtracts splice fades from concat length", () => {
    expect(estimateConcatDuration([10, 10, 10], 0.08)).toBeCloseTo(29.84, 5);
    expect(estimateConcatDuration([5, 5], 0)).toBe(10);
  });

  it("uses the longest clip for amix", () => {
    expect(estimateAmixDuration([3, 8, 5])).toBe(8);
    expect(estimateAmixDuration([])).toBe(0);
  });
});
