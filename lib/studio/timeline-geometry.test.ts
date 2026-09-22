import { describe, expect, it } from "vitest";
import {
  clipHeardSeconds,
  clipRect,
  moveClipOffset,
  nextPixelsPerSecond,
  timeAtPixel,
  timelineWidthPx,
  trimClipEnd,
  trimClipStart,
  viewportFromWidth,
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
});
