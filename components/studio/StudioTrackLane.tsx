"use client";

import { useEffect, useRef } from "react";
import type { StudioClip, StudioTrack } from "@/lib/studio/types";
import { paintStudioWaveform } from "@/lib/studio/paint";
import { resolveClipWaveformPeaks } from "@/lib/studio/peaks";
import {
  clipHeardSeconds,
  clipRect,
  snapClipMove,
  snapTrimEnd,
  snapTrimStart,
  timeAtPixel,
  waveformDrawBudget,
  type StudioSnapMode,
} from "@/lib/studio/timeline-geometry";
import type { StudioClipRef } from "@/components/studio/useStudioSession";

export function StudioTrackLane({
  track,
  pixelsPerSecond,
  selectedClipIds,
  primaryClipId,
  selection,
  snapMode,
  bpm,
  beatPx,
  barPx,
  onSelectClip,
  onTapClip,
  onSeek,
  onMoveGroup,
  onTrim,
}: {
  track: StudioTrack;
  pixelsPerSecond: number;
  selectedClipIds: ReadonlySet<string>;
  primaryClipId: string | null;
  selection: readonly StudioClipRef[];
  snapMode: StudioSnapMode;
  bpm: number;
  beatPx: number;
  barPx: number;
  onSelectClip: (clipId: string, mode: "replace" | "add") => void;
  onTapClip: (clipId: string) => void;
  onSeek: (seconds: number) => void;
  onMoveGroup: (
    group: readonly StudioClipRef[],
    anchor: StudioClipRef,
    nextOffsetSec: number,
    targetTrackId?: string,
  ) => void;
  onTrim: (clipId: string, patch: { offsetSec?: number; trimStartSec?: number; trimEndSec?: number }) => void;
}) {
  return (
    <div
      className="studio-lane relative h-16 border-b border-border"
      data-studio-lane={track.id}
      style={{ ["--beat-px" as string]: `${beatPx}px`, ["--bar-px" as string]: `${barPx}px` }}
      data-grid={beatPx >= 8 ? "beats" : "bars"}
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
          selected={selectedClipIds.has(clip.id)}
          primary={clip.id === primaryClipId}
          selection={selection}
          snapMode={snapMode}
          bpm={bpm}
          onSelect={(mode) => onSelectClip(clip.id, mode)}
          onTap={() => onTapClip(clip.id)}
          onMoveGroup={onMoveGroup}
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
  primary,
  selection,
  snapMode,
  bpm,
  onSelect,
  onTap,
  onMoveGroup,
  onTrim,
}: {
  clip: StudioClip;
  track: StudioTrack;
  pixelsPerSecond: number;
  selected: boolean;
  primary: boolean;
  selection: readonly StudioClipRef[];
  snapMode: StudioSnapMode;
  bpm: number;
  onSelect: (mode: "replace" | "add") => void;
  onTap: () => void;
  onMoveGroup: (
    group: readonly StudioClipRef[],
    anchor: StudioClipRef,
    nextOffsetSec: number,
    targetTrackId?: string,
  ) => void;
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
    const allowDetail = Boolean(clip.buffer);
    const budget = waveformDrawBudget(width, clip.peaks.length || 1, window.devicePixelRatio || 1, allowDetail);
    const peaks = resolveClipWaveformPeaks({
      overview: clip.peaks,
      buffer: clip.buffer,
      trimStartSec: clip.trimStartSec,
      trimEndSec: clip.trimEndSec,
      sourceDurationSec: clip.sourceDurationSec,
      drawBars: budget.bars,
    });
    canvas.width = Math.floor(width * budget.pixelRatio);
    canvas.height = Math.floor(height * budget.pixelRatio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(budget.pixelRatio, 0, 0, budget.pixelRatio, 0, 0);
    paintStudioWaveform(ctx, peaks, width, height, track.color);
  }, [
    clip.buffer,
    clip.peaks,
    clip.sourceDurationSec,
    clip.trimEndSec,
    clip.trimStartSec,
    pixelsPerSecond,
    rect.widthPx,
    track.color,
  ]);

  return (
    <div
      ref={blockRef}
      className="absolute top-1 bottom-1 touch-none overflow-hidden rounded-md border"
      data-studio-clip={`${track.id}:${clip.id}`}
      data-offset={clip.offsetSec}
      data-selected={selected ? "true" : "false"}
      style={{
        left: rect.leftPx,
        width: rect.widthPx,
        backgroundColor: `${track.color}22`,
        borderColor: selected ? track.color : "transparent",
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        const anchor = { trackId: track.id, clipId: clip.id };
        const already = selection.some((item) => item.trackId === anchor.trackId && item.clipId === anchor.clipId);
        const group = event.shiftKey ? (already ? selection : [...selection, anchor]) : [anchor];
        onSelect(event.shiftKey ? "add" : "replace");
        const startX = event.clientX;
        const origin = clip.offsetSec;
        const origins = new Map<string, { node: HTMLElement; offset: number }>();
        for (const item of group) {
          const node = document.querySelector<HTMLElement>(`[data-studio-clip="${item.trackId}:${item.clipId}"]`);
          if (!node) continue;
          origins.set(`${item.trackId}:${item.clipId}`, { node, offset: Number(node.dataset.offset) || 0 });
        }
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
        const place = (clientX: number) => {
          const next = snapClipMove(origin, (clientX - startX) / pixelsPerSecond, bpm, snapMode);
          const delta = next - origin;
          origins.forEach(({ node, offset }) => {
            node.style.left = `${Math.max(0, offset + delta) * pixelsPerSecond}px`;
          });
          return next;
        };
        const resolveLane = (clientY: number) => {
          const lanes = Array.from(document.querySelectorAll<HTMLElement>("[data-studio-lane]"));
          for (const lane of lanes) {
            const box = lane.getBoundingClientRect();
            if (clientY >= box.top && clientY <= box.bottom) return lane.dataset.studioLane || track.id;
          }
          return track.id;
        };
        const move = (ev: PointerEvent) => {
          place(ev.clientX);
        };
        const finish = (ev: PointerEvent, tap: boolean) => {
          target.removeEventListener("pointermove", move);
          target.removeEventListener("pointerup", up);
          target.removeEventListener("pointercancel", cancel);
          const moved = Math.abs(ev.clientX - startX);
          const destTrackId = resolveLane(ev.clientY);
          if (moved <= 3 && destTrackId === track.id) {
            origins.forEach(({ node, offset }) => {
              node.style.left = `${offset * pixelsPerSecond}px`;
            });
            if (tap) onTap();
            return;
          }
          const next = place(ev.clientX);
          if (next !== origin || destTrackId !== track.id) onMoveGroup(group, anchor, next, destTrackId);
          else {
            origins.forEach(({ node, offset }) => {
              node.style.left = `${offset * pixelsPerSecond}px`;
            });
          }
        };
        const up = (ev: PointerEvent) => finish(ev, true);
        const cancel = (ev: PointerEvent) => finish(ev, false);
        target.addEventListener("pointermove", move);
        target.addEventListener("pointerup", up);
        target.addEventListener("pointercancel", cancel);
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {clip.fadeInSec > 0 ? (
        <span
          className="studio-fade studio-fade-in pointer-events-none absolute inset-y-0 start-0"
          style={{ width: `${Math.min(50, (clip.fadeInSec / Math.max(heard, 1e-4)) * 100)}%` }}
          aria-hidden
        />
      ) : null}
      {clip.fadeOutSec > 0 ? (
        <span
          className="studio-fade studio-fade-out pointer-events-none absolute inset-y-0 end-0"
          style={{ width: `${Math.min(50, (clip.fadeOutSec / Math.max(heard, 1e-4)) * 100)}%` }}
          aria-hidden
        />
      ) : null}
      <span className="pointer-events-none absolute start-2 top-1 max-w-[70%] truncate text-[10px] font-medium">{clip.fileName}</span>
      {primary && (
        <>
          <TrimHandle
            edge="start"
            label="trim start"
            onMove={(deltaPx) => {
              const patch = snapTrimStart(clip, track.tempo, deltaPx / pixelsPerSecond, bpm, snapMode);
              placeBlock(blockRef.current, { ...clip, ...patch }, track.tempo, pixelsPerSecond);
            }}
            onCommit={(deltaPx) => onTrim(snapTrimStart(clip, track.tempo, deltaPx / pixelsPerSecond, bpm, snapMode))}
          />
          <TrimHandle
            edge="end"
            label="trim end"
            onMove={(deltaPx) => {
              const trimEndSec = snapTrimEnd(
                { ...clip, sourceDurationSec: clip.sourceDurationSec },
                track.tempo,
                deltaPx / pixelsPerSecond,
                bpm,
                snapMode,
              );
              placeBlock(blockRef.current, { ...clip, trimEndSec }, track.tempo, pixelsPerSecond);
            }}
            onCommit={(deltaPx) =>
              onTrim({
                trimEndSec: snapTrimEnd(
                  { ...clip, sourceDurationSec: clip.sourceDurationSec },
                  track.tempo,
                  deltaPx / pixelsPerSecond,
                  bpm,
                  snapMode,
                ),
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
