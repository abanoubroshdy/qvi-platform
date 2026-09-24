export type StudioWaveformContext = {
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
};

/** Symmetric peaks with a center line. Bars overlap slightly so zoomed clips stay solid. */
export function paintStudioWaveform(
  ctx: StudioWaveformContext,
  peaks: readonly number[],
  width: number,
  height: number,
  color: string,
): void {
  const safeWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
  const safeHeight = Number.isFinite(height) ? Math.max(1, height) : 1;
  ctx.clearRect(0, 0, safeWidth, safeHeight);
  const mid = safeHeight / 2;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.28;
  ctx.fillRect(0, mid, safeWidth, 1);
  if (!peaks.length) {
    ctx.globalAlpha = 1;
    return;
  }
  const bar = safeWidth / peaks.length;
  ctx.globalAlpha = 0.92;
  for (let index = 0; index < peaks.length; index += 1) {
    const amp = Math.max(0, Math.min(1, peaks[index] ?? 0));
    const barHeight = Math.max(1.5, amp * (safeHeight - 6));
    ctx.fillRect(index * bar, mid - barHeight / 2, bar + 0.35, barHeight);
  }
  ctx.globalAlpha = 1;
}

/** Two frames: the first lets React paint a notice, the second runs after that paint. */
export function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") {
      setTimeout(resolve, 0);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
