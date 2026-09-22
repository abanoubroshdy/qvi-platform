"use client";

import { useEffect, useRef } from "react";
import type { StudioClip, StudioTrack } from "@/lib/studio/types";
import { clipHeardSeconds, clipRect, downsamplePeaks, moveClipOffset, timeAtPixel, trimClipEnd, trimClipStart, waveformDrawBudget } from "@/lib/studio/timeline-geometry";

export function StudioTrackLane({
  track,
  pixelsPerSecond,
  selectedClipId,
  onSelectClip,
  onSeek,
  onOffset,
  onTrim,
}: {
  track: StudioTrack;
  pixelsPerSecond: number;
  selectedClipId: string | null;
  onSelectClip: (clipId: string) => void;
  onSeek: (seconds: number) => void;
  onOffset: (clipId: string, offsetSec: number) => void;
  onTrim: (clipId: string, patch: { offsetSec?: number; trimStartSec?: number; trimEndSec?: number }) => void;
}) {
  return (
    <div
      className="relative h-16 border-b border-border"
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onSeek(timeAtPixel(event.clientX - rect.left, pixelsPerSecond, Number.POSITIVE_INFINITY));
      }}
    >
      {track.clips.map((clip) => (
        <ClipBlock
          key={clip.id}
          clip={clip}
          track={track}
          pixelsPerSecond={pixelsPerSecond}
          selected={clip.id === selectedClipId}
          onSelect={() => onSelectClip(clip.id)}
          onOffset={(offsetSec) => onOffset(clip.id, offsetSec)}
          onTrim={(patch) => onTrim(clip.id, patch)}
        />
      ))}
    </div>
  );
}

function ClipBlock({
  clip,
  track,
  pixelsPerSecond,
  selected,
  onSelect,
  onOffset,
  onTrim,
}: {
  clip: StudioClip;
  track: StudioTrack;
  pixelsPerSecond: number;
  selected: boolean;
  onSelect: () => void;
  onOffset: (offsetSec: number) => void;
  onTrim: (patch: { offsetSec?: number; trimStartSec?: number; trimEndSec?: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const heard = clipHeardSeconds(clip, track.tempo);
  const rect = clipRect(clip.offsetSec, heard, pixelsPerSecond);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = Math.max(1, rect.widthPx);
    const height = 64;
    const source = visiblePeaks(clip.peaks, clip.trimStartSec, clip.trimEndSec, clip.sourceDurationSec);
    const budget = waveformDrawBudget(width, source.length, window.devicePixelRatio || 1);
    const peaks = downsamplePeaks(source, budget.bars);
    canvas.width = Math.floor(width * budget.pixelRatio);
    canvas.height = Math.floor(height * budget.pixelRatio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(budget.pixelRatio, 0, 0, budget.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = track.color;
    if (!peaks.length) {
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, height / 2 - 2, width, 4);
      return;
    }
    const bar = width / peaks.length;
    peaks.forEach((peak, index) => {
      const barHeight = Math.max(2, peak * (height - 8));
      ctx.globalAlpha = 0.9;
      ctx.fillRect(index * bar, (height - barHeight) / 2, Math.max(1, bar - 1), barHeight);
    });
  }, [clip.peaks, clip.sourceDurationSec, clip.trimEndSec, clip.trimStartSec, rect.widthPx, track.color]);

  return (
    <div
      ref={blockRef}
      className="absolute top-1 bottom-1 touch-none overflow-hidden rounded-md border"
      style={{
        left: rect.leftPx,
        width: rect.widthPx,
        backgroundColor: `${track.color}22`,
        borderColor: selected ? track.color : "transparent",
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onSelect();
        const startX = event.clientX;
        const origin = clip.offsetSec;
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
        const place = (clientX: number) => {
          const next = moveClipOffset(origin, (clientX - startX) / pixelsPerSecond);
          target.style.left = `${next * pixelsPerSecond}px`;
          return next;
        };
        const move = (ev: PointerEvent) => {
          place(ev.clientX);
        };
        const up = (ev: PointerEvent) => {
          target.removeEventListener("pointermove", move);
          target.removeEventListener("pointerup", up);
          target.removeEventListener("pointercancel", up);
          const next = place(ev.clientX);
          if (next !== origin) onOffset(next);
        };
        target.addEventListener("pointermove", move);
        target.addEventListener("pointerup", up);
        target.addEventListener("pointercancel", up);
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <span className="pointer-events-none absolute start-2 top-1 max-w-[70%] truncate text-[10px] font-medium">{clip.fileName}</span>
      {selected && (
        <>
          <TrimHandle
            edge="start"
            label="trim start"
            onMove={(deltaPx) => {
              const patch = trimClipStart(clip, track.tempo, deltaPx / pixelsPerSecond);
              placeBlock(blockRef.current, { ...clip, ...patch }, track.tempo, pixelsPerSecond);
            }}
            onCommit={(deltaPx) => onTrim(trimClipStart(clip, track.tempo, deltaPx / pixelsPerSecond))}
          />
          <TrimHandle
            edge="end"
            label="trim end"
            onMove={(deltaPx) => {
              const trimEndSec = trimClipEnd({ ...clip, sourceDurationSec: clip.sourceDurationSec }, track.tempo, deltaPx / pixelsPerSecond);
              placeBlock(blockRef.current, { ...clip, trimEndSec }, track.tempo, pixelsPerSecond);
            }}
            onCommit={(deltaPx) =>
              onTrim({
                trimEndSec: trimClipEnd({ ...clip, sourceDurationSec: clip.sourceDurationSec }, track.tempo, deltaPx / pixelsPerSecond),
              })
            }
          />
        </>
      )}
    </div>
  );
}

function TrimHandle({
  edge,
  label,
  onMove,
  onCommit,
}: {
  edge: "start" | "end";
  label: string;
  onMove: (deltaPx: number) => void;
  onCommit: (deltaPx: number) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`absolute top-0 bottom-0 z-10 w-3 touch-none cursor-ew-resize bg-foreground/30 ${edge === "start" ? "start-0" : "end-0"}`}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
        const startX = event.clientX;
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
        const move = (ev: PointerEvent) => onMove(ev.clientX - startX);
        const up = (ev: PointerEvent) => {
          target.removeEventListener("pointermove", move);
          target.removeEventListener("pointerup", up);
          target.removeEventListener("pointercancel", up);
          const delta = ev.clientX - startX;
          if (delta !== 0) onCommit(delta);
        };
        target.addEventListener("pointermove", move);
        target.addEventListener("pointerup", up);
        target.addEventListener("pointercancel", up);
      }}
    />
  );
}

function placeBlock(
  node: HTMLDivElement | null,
  clip: { offsetSec: number; trimStartSec: number; trimEndSec: number },
  tempo: StudioTrack["tempo"],
  pixelsPerSecond: number,
) {
  if (!node) return;
  const heard = clipHeardSeconds(clip, tempo);
  const next = clipRect(clip.offsetSec, heard, pixelsPerSecond);
  node.style.left = `${next.leftPx}px`;
  node.style.width = `${next.widthPx}px`;
}

function visiblePeaks(peaks: number[], trimStart: number, trimEnd: number, sourceDuration: number): number[] {
  if (!peaks.length || !(sourceDuration > 0)) return peaks;
  const start = Math.floor((Math.max(0, trimStart) / sourceDuration) * peaks.length);
  const end = Math.ceil((Math.max(trimStart, trimEnd) / sourceDuration) * peaks.length);
  const slice = peaks.slice(start, Math.max(start + 1, end));
  return slice.length ? slice : peaks;
}
