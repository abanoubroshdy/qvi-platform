export type StudioWaveformContext = {
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  fill(): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
};

/** Mix a #rrggbb track color toward white so peaks read on the tinted clip face. */
export function waveformPaintColor(color: string, towardWhite = 0.55): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;
  const hex = match[1]!;
  const mix = Math.min(1, Math.max(0, Number.isFinite(towardWhite) ? towardWhite : 0.55));
  const channel = (start: number) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16);
    return Math.round(value + (255 - value) * mix);
  };
  const r = channel(0).toString(16).padStart(2, "0");
  const g = channel(2).toString(16).padStart(2, "0");
  const b = channel(4).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

/** Symmetric peaks with a center line. Dense zooms draw a filled outline so edges stay sharp. */
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
  const paint = waveformPaintColor(color);
  ctx.fillStyle = paint;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, mid, safeWidth, 1);
  if (!peaks.length) {
    ctx.globalAlpha = 1;
    return;
  }
  const bar = safeWidth / peaks.length;
  ctx.globalAlpha = 0.95;
  if (peaks.length >= safeWidth * 0.85 && typeof ctx.beginPath === "function") {
    ctx.beginPath();
    ctx.moveTo(0, mid);
    for (let index = 0; index < peaks.length; index += 1) {
      const amp = Math.max(0, Math.min(1, peaks[index] ?? 0));
      const barHeight = Math.max(1.5, amp * (safeHeight - 6));
      const x = index * bar + bar / 2;
      ctx.lineTo(x, mid - barHeight / 2);
    }
    for (let index = peaks.length - 1; index >= 0; index -= 1) {
      const amp = Math.max(0, Math.min(1, peaks[index] ?? 0));
      const barHeight = Math.max(1.5, amp * (safeHeight - 6));
      const x = index * bar + bar / 2;
      ctx.lineTo(x, mid + barHeight / 2);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    for (let index = 0; index < peaks.length; index += 1) {
      const amp = Math.max(0, Math.min(1, peaks[index] ?? 0));
      const barHeight = Math.max(1.5, amp * (safeHeight - 6));
      const gap = bar > 2 ? 0.35 : 0.2;
      ctx.fillRect(index * bar, mid - barHeight / 2, Math.max(0.75, bar - gap), barHeight);
    }
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
