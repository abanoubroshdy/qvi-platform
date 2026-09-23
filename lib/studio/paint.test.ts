import { describe, expect, it, vi } from "vitest";
import { paintStudioWaveform, waitForNextPaint, type StudioWaveformContext } from "@/lib/studio/paint";

describe("studio waveform", () => {
  it("draws a center line and one solid bar per peak", () => {
    const rects: number[][] = [];
    const ctx: StudioWaveformContext = {
      fillStyle: "",
      globalAlpha: 1,
      clearRect() {},
      fillRect(x, y, width, height) {
        rects.push([x, y, width, height]);
      },
    };
    paintStudioWaveform(ctx, [0, 1, 0.5], 90, 40, "#1a7f96");
    expect(rects).toHaveLength(4);
    expect(rects[0]?.[3]).toBe(1);
    expect(rects[2]?.[2]).toBeGreaterThan(90 / 3);
    expect(ctx.globalAlpha).toBe(1);
    rects.length = 0;
    paintStudioWaveform(ctx, [], 40, 20, "#c4a574");
    expect(rects).toHaveLength(1);
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
