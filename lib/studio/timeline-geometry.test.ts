import { describe, expect, it } from "vitest";
import {
  clipHeardSeconds,
  clipRect,
  moveClipOffset,
  musicalBarMarks,
  nextPixelsPerSecond,
  normalizeTimeRange,
  secondsPerBar,
  secondsPerBeat,
  snapClipMove,
  snapHeardTime,
  snapTrimEnd,
  snapTrimStart,
  timeAtPixel,
  timeRangeRect,
  rulerMarks,
  timelineWidthPx,
  trimClipEnd,
  trimClipStart,
  viewportFromWidth,
  downsamplePeaks,
  waveformDrawBudget,
} from "@/lib/studio/timeline-geometry";

const unity = { mode: "bpm" as const, originalBpm: 120, targetBpm: 120, percent: 0 };
const doubled = { mode: "bpm" as const, originalBpm: 120, targetBpm: 240, percent: 0 };

describe("studio timeline geometry", () => {
  it("maps width to the phase 0 breakpoints", () => {
    expect(viewportFromWidth(639)).toBe("mobile");
    expect(viewportFromWidth(640)).toBe("tablet");
    expect(viewportFromWidth(1023)).toBe("tablet");
    expect(viewportFromWidth(1024)).toBe("desktop");
  });

  it("places a clip in heard time and shortens it when tempo doubles", () => {
    const clip = { offsetSec: 2, trimStartSec: 0, trimEndSec: 8 };
    expect(clipHeardSeconds(clip, unity)).toBe(8);
    expect(clipHeardSeconds(clip, doubled)).toBe(4);
    expect(clipRect(2, 4, 10)).toEqual({ leftPx: 20, widthPx: 40 });
    expect(timelineWidthPx(0, 10)).toBe(300);
  });

  it("keeps the heard end still when the left trim moves", () => {
    const clip = { offsetSec: 2, trimStartSec: 0, trimEndSec: 4 };
    const next = trimClipStart(clip, doubled, 1);
    expect(next).toEqual({ trimStartSec: 2, offsetSec: 3 });
    const before = clip.offsetSec + clipHeardSeconds(clip, doubled);
    const after = next.offsetSec + clipHeardSeconds({ ...clip, ...next }, doubled);
    expect(after).toBeCloseTo(before, 5);
  });

  it("caps the right trim at the source and the offset at zero", () => {
    expect(trimClipEnd({ offsetSec: 0, trimStartSec: 0, trimEndSec: 2, sourceDurationSec: 4 }, unity, 5)).toBe(4);
    expect(moveClipOffset(1, -4)).toBe(0);
    expect(timeAtPixel(100, 10, 4)).toBe(4);
    expect(nextPixelsPerSecond(16, "out")).toBe(16);
    expect(nextPixelsPerSecond(160, "in")).toBe(160);
  });

  it("counts bars from the track bpm and snaps moves onto that grid", () => {
    expect(secondsPerBeat(120)).toBe(0.5);
    expect(secondsPerBar(120)).toBe(2);
    expect(secondsPerBeat(0)).toBe(0.5);
    const marks = musicalBarMarks(4, 48, 120);
    expect(marks[0]).toEqual({ timeSec: 0, bar: 1 });
    expect(marks[1]).toEqual({ timeSec: 2, bar: 2 });
    expect(marks.at(-1)?.timeSec).toBeGreaterThanOrEqual(4);
    expect(snapHeardTime(0.49, 120, "beat")).toBe(0.5);
    expect(snapHeardTime(0.24, 120, "beat")).toBe(0);
    expect(snapHeardTime(1.1, 120, "bar")).toBe(2);
    expect(snapHeardTime(1.6, 120, "off")).toBe(1.6);
    expect(snapHeardTime(-2, 120, "beat")).toBe(0);
    expect(snapClipMove(1, 0.4, 120, "beat")).toBe(1.5);
  });

  it("normalizes a time range without depending on drag direction", () => {
    expect(normalizeTimeRange(2, 0.5, 10)).toEqual({ startSec: 0.5, endSec: 2 });
    expect(normalizeTimeRange(1, 1.06, 10)).toEqual({ startSec: 1, endSec: 1.06 });
    expect(normalizeTimeRange(1, 1.02, 10)).toBeNull();
    expect(normalizeTimeRange(-2, 100, 4)).toEqual({ startSec: 0, endSec: 4 });
    expect(normalizeTimeRange(Number.NaN, 2, 10)).toEqual({ startSec: 0, endSec: 2 });
    expect(timeRangeRect({ startSec: 1, endSec: 3 }, 20)).toEqual({ leftPx: 20, widthPx: 40 });
  });

  it("snaps a trim edge without moving the other edge off the grid math", () => {
    const clip = { offsetSec: 0, trimStartSec: 0, trimEndSec: 4, sourceDurationSec: 8 };
    expect(snapTrimStart(clip, unity, 0.6, 120, "beat")).toEqual({ offsetSec: 0.5, trimStartSec: 0.5 });
    expect(snapTrimEnd(clip, unity, 0.6, 120, "beat")).toBe(4.5);
    expect(snapTrimStart(clip, unity, 0.6, 120, "off")).toEqual(trimClipStart(clip, unity, 0.6));
  });

  it("draws fewer waveform bars than the phone has device pixels", () => {
    expect(waveformDrawBudget(40, 180, 3)).toEqual({ bars: 40, pixelRatio: 2 });
    expect(waveformDrawBudget(400, 48, 1)).toEqual({ bars: 48, pixelRatio: 1 });
    expect(downsamplePeaks([0.1, 0.9, 0.2, 0.4], 2)).toEqual([0.9, 0.4]);
    expect(rulerMarks(0, 48)).toEqual([0, 5, 10, 15, 20, 25, 30]);
  });
});
