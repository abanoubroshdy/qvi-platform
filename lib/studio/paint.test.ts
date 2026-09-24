import { describe, expect, it, vi } from "vitest";
import {
  paintStudioWaveform,
  waitForNextPaint,
  waveformPaintColor,
  type StudioWaveformContext,
} from "@/lib/studio/paint";

function mockCtx(): StudioWaveformContext & { rects: number[][]; paths: number } {
  const rects: number[][] = [];
  let paths = 0;
  return {
    rects,
    get paths() {
      return paths;
    },
    fillStyle: "",
    globalAlpha: 1,
    clearRect() {},
    fillRect(x, y, width, height) {
      rects.push([x, y, width, height]);
    },
    beginPath() {
      paths += 1;
    },
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
  };
}

describe("studio waveform", () => {
  it("lightens track colors so peaks contrast on the clip face", () => {
    expect(waveformPaintColor("#4338CA", 0.5)).toBe("#a19ce5");
    expect(waveformPaintColor("not-a-color")).toBe("not-a-color");
  });

  it("draws a center line and solid bars for coarse peaks", () => {
    const ctx = mockCtx();
    paintStudioWaveform(ctx, [0, 1, 0.5], 90, 40, "#1a7f96");
    expect(ctx.rects).toHaveLength(4);
    expect(ctx.rects[0]?.[3]).toBe(1);
    expect(ctx.rects[2]?.[2]).toBeGreaterThan(0.5);
    expect(ctx.globalAlpha).toBe(1);
    ctx.rects.length = 0;
    paintStudioWaveform(ctx, [], 40, 20, "#c4a574");
    expect(ctx.rects).toHaveLength(1);
  });

  it("fills a path outline when peaks are dense enough for the width", () => {
    const ctx = mockCtx();
    const peaks = Array.from({ length: 40 }, (_, index) => (index % 4 === 0 ? 0.8 : 0.2));
    paintStudioWaveform(ctx, peaks, 40, 32, "#4338CA");
    expect(ctx.paths).toBe(1);
    expect(ctx.rects).toHaveLength(1);
  });
});

describe("studio paint wait", () => {
  it("resolves after two animation frames", async () => {
    const frames: Array<(time: number) => void> = [];
    vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
      frames.push(callback);
      return frames.length;
    });
    let done = false;
    const pending = waitForNextPaint().then(() => {
      done = true;
    });
    expect(frames).toHaveLength(1);
    frames[0]?.(0);
    expect(done).toBe(false);
    expect(frames).toHaveLength(2);
    frames[1]?.(0);
    await pending;
    expect(done).toBe(true);
    vi.unstubAllGlobals();
  });
});
