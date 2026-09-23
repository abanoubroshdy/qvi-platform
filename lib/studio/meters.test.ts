import { describe, expect, it } from "vitest";
import { decayMeter, peakFromTimeDomain, STUDIO_METER_FRAME_MS } from "@/lib/studio/meters";

describe("studio meters", () => {
  it("reads a peak from a time-domain frame and ignores non-finite samples", () => {
    expect(peakFromTimeDomain([-0.5, 0.2, 0.1])).toBeCloseTo(0.5);
    expect(peakFromTimeDomain([2, -3])).toBe(1);
    expect(peakFromTimeDomain([Number.NaN, 0])).toBe(0);
    expect(STUDIO_METER_FRAME_MS).toBeGreaterThanOrEqual(16);
    expect(STUDIO_METER_FRAME_MS).toBeLessThanOrEqual(34);
  });

  it("attacks immediately and falls without storing a react state update", () => {
    expect(decayMeter(0.2, 0.8)).toBeCloseTo(0.8);
    expect(decayMeter(0.8, 0.1)).toBeCloseTo(0.8 * 0.78);
    expect(decayMeter(0.004, 0)).toBe(0);
  });
});