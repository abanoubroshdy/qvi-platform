"use client";

import { useEffect, useRef } from "react";

export function AudioWaveform({
  peaks,
  start,
  end,
  duration,
}: {
  peaks: number[];
  start: number;
  end: number;
  duration: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks.length || duration <= 0) return;
    const width = canvas.clientWidth || 640;
    const height = 96;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);

    const styles = getComputedStyle(canvas);
    const primary = `hsl(${styles.getPropertyValue("--primary").trim() || "189 52% 32%"})`;
    const muted = `hsl(${styles.getPropertyValue("--muted-foreground").trim() || "213 14% 38%"})`;
    const barWidth = width / peaks.length;
    const startX = (start / duration) * width;
    const endX = (end / duration) * width;

    context.fillStyle = primary;
    context.globalAlpha = 0.16;
    context.fillRect(startX, 0, Math.max(2, endX - startX), height);
    context.globalAlpha = 1;

    peaks.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(2, peak * (height - 8));
      const inRange = x >= startX && x <= endX;
      context.fillStyle = inRange ? primary : muted;
      context.globalAlpha = inRange ? 1 : 0.35;
      context.fillRect(x + 1, (height - barHeight) / 2, Math.max(1, barWidth - 2), barHeight);
    });
    context.globalAlpha = 1;
  }, [duration, end, peaks, start]);

  return <canvas ref={canvasRef} className="h-24 w-full rounded-lg bg-muted/40" aria-hidden />;
}
