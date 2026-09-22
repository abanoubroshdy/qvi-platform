import { describe, expect, it, vi } from "vitest";
import { waitForNextPaint } from "@/lib/studio/paint";

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
