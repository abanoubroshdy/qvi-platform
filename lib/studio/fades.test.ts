import { describe, expect, it } from "vitest";
import {
  applyFadesToBuffer,
  clipFadeRamps,
  fadeGainAtHeardOffset,
  normalizeClipFades,
} from "@/lib/studio/fades";

function bufferOf(samples: number[]): AudioBuffer {
  const data = Float32Array.from(samples);
  const out = {
    duration: samples.length / 10,
    length: samples.length,
    sampleRate: 10,
    numberOfChannels: 1,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
  return out;
}

describe("studio clip fades", () => {
  it("clamps overlapping fades into the heard duration", () => {
    expect(normalizeClipFades(2, 3, 3)).toEqual({ fadeInSec: 1, fadeOutSec: 1 });
    expect(normalizeClipFades(1, -1, 0.25)).toEqual({ fadeInSec: 0, fadeOutSec: 0.25 });
  });

  it("reads gain along the fade envelope", () => {
    expect(fadeGainAtHeardOffset(0, 4, { fadeInSec: 1, fadeOutSec: 1 })).toBe(0);
    expect(fadeGainAtHeardOffset(0.5, 4, { fadeInSec: 1, fadeOutSec: 1 })).toBeCloseTo(0.5);
    expect(fadeGainAtHeardOffset(2, 4, { fadeInSec: 1, fadeOutSec: 1 })).toBe(1);
    expect(fadeGainAtHeardOffset(3.5, 4, { fadeInSec: 1, fadeOutSec: 1 })).toBeCloseTo(0.5);
    expect(fadeGainAtHeardOffset(4, 4, { fadeInSec: 1, fadeOutSec: 1 })).toBe(0);
  });

  it("builds ramps for a mid-clip seek and applies fades to PCM", () => {
    const ramps = clipFadeRamps({
      heardDurationSec: 4,
      fromHeardSec: 0.5,
      sliceHeardSec: 3.5,
      fadeInSec: 1,
      fadeOutSec: 1,
    });
    expect(ramps.initialGain).toBeCloseTo(0.5);
    expect(ramps.ramps.some((ramp) => ramp.gain === 1)).toBe(true);
    expect(ramps.ramps.at(-1)?.gain).toBe(0);

    const faded = applyFadesToBuffer(bufferOf([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]), { fadeInSec: 0.5, fadeOutSec: 0.5 }, (c, l, r) => {
      const channels = Array.from({ length: c }, () => new Float32Array(l));
      return {
        numberOfChannels: c,
        length: l,
        sampleRate: r,
        duration: l / r,
        getChannelData: (index: number) => channels[index]!,
      } as unknown as AudioBuffer;
    });
    expect(faded.getChannelData(0)[0]).toBe(0);
    expect(faded.getChannelData(0)[9]).toBe(0);
    expect(faded.getChannelData(0)[4]).toBeCloseTo(0.8, 5);
    expect(faded.getChannelData(0)[5]).toBeCloseTo(0.8, 5);
  });
});
