"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/time";

type DragMode = "start" | "end" | "seek" | null;

type WaveformPlayerProps = {
  src: string;
  peaks: number[];
  start: number;
  end: number;
  duration: number;
  onRangeChange: (start: number, end: number) => void;
  playLabel: string;
  pauseLabel: string;
  startHandleLabel: string;
  endHandleLabel: string;
};

export function WaveformPlayer({
  src,
  peaks,
  start,
  end,
  duration,
  onRangeChange,
  playLabel,
  pauseLabel,
  startHandleLabel,
  endHandleLabel,
}: WaveformPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dragRef = useRef<DragMode>(null);
  const rangeRef = useRef({ start, end, duration });
  const [currentTime, setCurrentTime] = useState(start);
  const [playing, setPlaying] = useState(false);

  rangeRef.current = { start, end, duration };

  const draw = useCallback(
    (playhead: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !peaks.length || duration <= 0) return;
      const width = canvas.clientWidth || 640;
      const height = canvas.clientHeight || 128;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const styles = getComputedStyle(canvas);
      const primary = `hsl(${styles.getPropertyValue("--primary").trim() || "189 52% 32%"})`;
      const muted = `hsl(${styles.getPropertyValue("--muted-foreground").trim() || "213 14% 38%"})`;
      const foreground = `hsl(${styles.getPropertyValue("--foreground").trim() || "213 48% 16%"})`;
      const barWidth = width / peaks.length;
      const startX = (start / duration) * width;
      const endX = (end / duration) * width;
      const playX = Math.min(width, Math.max(0, (playhead / duration) * width));

      ctx.fillStyle = primary;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(startX, 0, Math.max(2, endX - startX), height);
      ctx.globalAlpha = 1;

      peaks.forEach((peak, index) => {
        const x = index * barWidth;
        const barHeight = Math.max(3, peak * (height - 16));
        const inRange = x >= startX && x <= endX;
        ctx.fillStyle = inRange ? primary : muted;
        ctx.globalAlpha = inRange ? 1 : 0.28;
        ctx.fillRect(x + 0.8, (height - barHeight) / 2, Math.max(1, barWidth - 1.6), barHeight);
      });
      ctx.globalAlpha = 1;

      const drawHandle = (x: number) => {
        ctx.fillStyle = primary;
        ctx.fillRect(x - 1.5, 8, 3, height - 16);
        ctx.beginPath();
        ctx.arc(x, height - 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, 10, 8, 0, Math.PI * 2);
        ctx.fill();
      };

      drawHandle(startX);
      drawHandle(endX);

      ctx.strokeStyle = foreground;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 4);
      ctx.lineTo(playX, height - 4);
      ctx.stroke();
      ctx.fillStyle = foreground;
      ctx.beginPath();
      ctx.moveTo(playX, 4);
      ctx.lineTo(playX + 6, 12);
      ctx.lineTo(playX - 6, 12);
      ctx.closePath();
      ctx.fill();
    },
    [duration, end, peaks, start],
  );

  useEffect(() => {
    draw(currentTime);
  }, [currentTime, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => draw(currentTime));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [currentTime, draw]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let frame = 0;
    const tick = () => {
      const { start: rangeStart, end: rangeEnd } = rangeRef.current;
      if (audio.currentTime >= rangeEnd - 0.03) {
        audio.pause();
        audio.currentTime = rangeStart;
        setPlaying(false);
        setCurrentTime(rangeStart);
        return;
      }
      setCurrentTime(audio.currentTime);
      if (!audio.paused) frame = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(frame);
      setCurrentTime(audio.currentTime);
    };
    const onLoaded = () => {
      audio.currentTime = rangeRef.current.start;
      setCurrentTime(rangeRef.current.start);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime < start || audio.currentTime > end) {
      audio.currentTime = start;
      setCurrentTime(start);
    }
  }, [end, start]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    const next = rangeRef.current.start;
    audio.currentTime = next;
    setPlaying(false);
    setCurrentTime(next);
  }, [src]);

  function timeFromClientX(clientX: number) {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return 0;
    const rect = canvas.getBoundingClientRect();
    const ratio = (clientX - rect.left) / Math.max(1, rect.width);
    return Math.min(duration, Math.max(0, ratio * duration));
  }

  function modeFromClientX(clientX: number): Exclude<DragMode, null> {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return "seek";
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const startX = (start / duration) * rect.width;
    const endX = (end / duration) * rect.width;
    const hit = 18;
    const distStart = Math.abs(x - startX);
    const distEnd = Math.abs(x - endX);
    if (distStart <= hit && distStart <= distEnd) return "start";
    if (distEnd <= hit) return "end";
    return "seek";
  }

  function applyDrag(clientX: number, mode: Exclude<DragMode, null>) {
    const time = timeFromClientX(clientX);
    const audio = audioRef.current;
    if (mode === "start") {
      onRangeChange(time, end);
      return;
    }
    if (mode === "end") {
      onRangeChange(start, time);
      return;
    }
    const clamped = Math.min(end, Math.max(start, time));
    if (audio) audio.currentTime = clamped;
    setCurrentTime(clamped);
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    if (audio.currentTime < start || audio.currentTime >= end - 0.05) {
      audio.currentTime = start;
      setCurrentTime(start);
    }
    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-3">
        <Button
          type="button"
          size="icon"
          className="h-auto w-14 shrink-0 rounded-2xl"
          onClick={() => void togglePlay()}
          aria-label={playing ? pauseLabel : playLabel}
        >
          {playing ? <Pause className="!size-6" /> : <Play className="!size-6" />}
        </Button>
        <div
          className="relative min-w-0 flex-1 touch-none overflow-hidden rounded-2xl bg-muted/40"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const mode = modeFromClientX(event.clientX);
            dragRef.current = mode;
            applyDrag(event.clientX, mode);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            applyDrag(event.clientX, dragRef.current);
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          role="slider"
          aria-label={`${startHandleLabel} / ${endHandleLabel}`}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
        >
          <canvas ref={canvasRef} className="block h-32 w-full" aria-hidden />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold tabular-nums text-muted-foreground">
        <span dir="ltr">{formatClock(currentTime)}</span>
        <span dir="ltr">
          {formatClock(Math.max(0, end - start))} / {formatClock(duration)}
        </span>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}
