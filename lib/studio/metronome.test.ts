import { describe, expect, it } from "vitest";
import {
  contextTimeForHeardClick,
  metronomeBeatSec,
  metronomeClicksInWindow,
} from "@/lib/studio/metronome";

describe("studio metronome", () => {
  it("places accented downbeats on the bar grid at 120 BPM", () => {
    expect(metronomeBeatSec(120)).toBe(0.5);
    const clicks = metronomeClicksInWindow(0, 2.1, 120, 4);
    expect(clicks).toEqual([
      { timeSec: 0, accent: true },
      { timeSec: 0.5, accent: false },
      { timeSec: 1, accent: false },
      { timeSec: 1.5, accent: false },
      { timeSec: 2, accent: true },
    ]);
  });

  it("skips clicks before the window and maps heard time onto the audio clock", () => {
    expect(metronomeClicksInWindow(0.6, 1.2, 120)).toEqual([{ timeSec: 1, accent: false }]);
    expect(metronomeClicksInWindow(1, 1, 120)).toEqual([]);
    expect(contextTimeForHeardClick(2, 1.5, 10)).toBeCloseTo(10.5, 5);
  });
});
