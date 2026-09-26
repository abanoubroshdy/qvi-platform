"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines } from "lucide-react";
import { readSessionBpm } from "@/lib/studio/chrome";
import {
  musicalBarMarks,
  normalizeTimeRange,
  secondsPerBar,
  secondsPerBeat,
  snapHeardTime,
  timeAtPixel,
  timelineWidthPx,
  timeRangeRect,
  type StudioTimeRange,
} from "@/lib/studio/timeline-geometry";
import type { Messages } from "@/lib/i18n";
import { StudioTrackHeader } from "@/components/studio/StudioTrackHeader";
import { StudioTrackLane } from "@/components/studio/StudioTrackLane";
import { useStudio } from "@/components/studio/studio-context";

const RANGE_DRAG_THRESHOLD_PX = 3;

export function StudioTimeline({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const width = timelineWidthPx(studio.duration, studio.pixelsPerSecond);
  const timelineSec = width / studio.pixelsPerSecond;
  const bpm = readSessionBpm(studio.project);
  const beatPx = secondsPerBeat(bpm) * studio.pixelsPerSecond;
  const barPx = secondsPerBar(bpm) * studio.pixelsPerSecond;
  const marks = musicalBarMarks(studio.duration, studio.pixelsPerSecond, bpm);
  const [draftRange, setDraftRange] = useState<StudioTimeRange | null>(null);
  const selectedOnTrack = (trackId: string) => {
    const ids = new Set<string>();
    for (const item of studio.selection) {
      if (item.trackId === trackId) ids.add(item.clipId);
    }
    return ids;
  };
  const visibleRange = draftRange ?? studio.timeRange;

  return (
    <section aria-label={copy.timeline} className="flex min-h-0 flex-1 flex-col" dir="ltr">
      {studio.project.tracks.length === 0 ? (
        <button
          type="button"
          className="studio-drop m-3 flex min-h-48 flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center"
          onClick={() => studio.browse()}
        >
          <AudioLines className="mb-3 h-8 w-8 text-[hsl(var(--studio-teal))]" aria-hidden />
          <span className="text-base font-semibold tracking-tight">{copy.emptyTitle}</span>
          <span className="mt-2 max-w-md text-sm text-muted-foreground">{copy.emptyBody}</span>
          <span className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--studio-sand))]">{copy.dropHint}</span>
          <span className="mt-2 max-w-md text-xs text-muted-foreground">{copy.gridHint}</span>
        </button>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-y-auto">
          <div className="studio-track-heads sticky left-0 z-20 w-[7.75rem] shrink-0 border-e border-border sm:w-44">
            <div className="h-7 border-b border-border" />
            {studio.project.tracks.map((track) => (
              <StudioTrackHeader
                key={track.id}
                track={track}
                selected={studio.selectedTrack?.id === track.id}
                armed={studio.armedTrackId === track.id}
                copy={copy}
                onSelect={() => studio.selectTrack(track.id, undefined, true)}
                onMute={() => studio.setMuted(track.id, !track.muted)}
                onSolo={() => studio.setSolo(track.id, !track.solo)}
              />
            ))}
          </div>
          <div className="studio-lanes min-w-0 flex-1 overflow-x-auto">
            <div className="relative" style={{ width }}>
              <Ruler
                marks={marks}
                beatPx={beatPx}
                barPx={barPx}
                pixelsPerSecond={studio.pixelsPerSecond}
                duration={timelineSec}
                bpm={bpm}
                snapMode={studio.snapMode}
                label={copy.timeRange}
                onSeek={(seconds) => {
                  studio.clearTimeRange();
                  studio.seek(seconds);
                }}
                onRangeDraft={setDraftRange}
                onRangeCommit={(range) => {
                  setDraftRange(null);
                  studio.setTimeRange(range);
                }}
                onRangeCancel={() => setDraftRange(null)}
              />
              {studio.project.tracks.map((track) => (
                <StudioTrackLane
                  key={track.id}
                  track={track}
                  pixelsPerSecond={studio.pixelsPerSecond}
                  selectedClipIds={selectedOnTrack(track.id)}
                  primaryClipId={studio.selectedTrack?.id === track.id ? (studio.selectedClip?.id ?? null) : null}
                  selection={studio.selection}
                  snapMode={studio.snapMode}
                  bpm={bpm}
                  beatPx={beatPx}
                  barPx={barPx}
                  onSelectClip={(clipId, mode) => studio.selectClip(track.id, clipId, mode)}
                  onTapClip={() => {
                    if (studio.viewport === "mobile") studio.setInspectorOpen(true);
                  }}
                  onSeek={studio.seek}
                  onMoveGroup={studio.moveClipGroup}
                  onTrim={(clipId, patch) => studio.setTrim(track.id, clipId, patch)}
                />
              ))}
              {visibleRange ? (
                <TimeRangeOverlay
                  range={visibleRange}
                  pixelsPerSecond={studio.pixelsPerSecond}
                  looping={studio.loopEnabled}
                  label={copy.timeRange}
                />
              ) : null}
              <Playhead pixelsPerSecond={studio.pixelsPerSecond} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Ruler({
  marks,
  beatPx,
  barPx,
  pixelsPerSecond,
  duration,
  bpm,
  snapMode,
  label,
  onSeek,
  onRangeDraft,
  onRangeCommit,
  onRangeCancel,
}: {
  marks: readonly { timeSec: number; bar: number }[];
  beatPx: number;
  barPx: number;
  pixelsPerSecond: number;
  duration: number;
  bpm: number;
  snapMode: "bar" | "beat" | "off";
  label: string;
  onSeek: (seconds: number) => void;
  onRangeDraft: (range: StudioTimeRange | null) => void;
  onRangeCommit: (range: StudioTimeRange) => void;
  onRangeCancel: () => void;
}) {
  const originRef = useRef<{ x: number; timeSec: number } | null>(null);
  const draggingRef = useRef(false);

  const timeFromClientX = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const raw = timeAtPixel(clientX - rect.left, pixelsPerSecond, Number.POSITIVE_INFINITY);
    return snapHeardTime(raw, bpm, snapMode);
  };

  return (
    <div
      className="studio-ruler relative h-7 cursor-ew-resize border-b border-border text-[10px] text-[hsl(var(--studio-sand))]"
      data-grid={beatPx >= 8 ? "beats" : "bars"}
      style={{ ["--beat-px" as string]: `${beatPx}px`, ["--bar-px" as string]: `${barPx}px` }}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(duration, 0)}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.currentTarget;
        const timeSec = timeFromClientX(event.clientX, target);
        originRef.current = { x: event.clientX, timeSec };
        draggingRef.current = false;
        target.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const origin = originRef.current;
        if (!origin || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        if (!draggingRef.current && Math.abs(event.clientX - origin.x) < RANGE_DRAG_THRESHOLD_PX) return;
        draggingRef.current = true;
        const endSec = timeFromClientX(event.clientX, event.currentTarget);
        onRangeDraft(normalizeTimeRange(origin.timeSec, endSec, duration));
      }}
      onPointerUp={(event) => {
        const origin = originRef.current;
        originRef.current = null;
        if (!origin) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (!draggingRef.current) {
          onRangeCancel();
          onSeek(origin.timeSec);
          return;
        }
        draggingRef.current = false;
        const endSec = timeFromClientX(event.clientX, event.currentTarget);
        const range = normalizeTimeRange(origin.timeSec, endSec, duration);
        if (range) onRangeCommit(range);
        else onRangeCancel();
      }}
      onPointerCancel={() => {
        originRef.current = null;
        draggingRef.current = false;
        onRangeCancel();
      }}
    >
      {marks.map((mark) => (
        <span key={mark.bar} className="absolute top-1 translate-x-1 font-mono tabular-nums" style={{ left: mark.timeSec * pixelsPerSecond }}>
          {mark.bar}
        </span>
      ))}
    </div>
  );
}

function TimeRangeOverlay({
  range,
  pixelsPerSecond,
  looping,
  label,
}: {
  range: StudioTimeRange;
  pixelsPerSecond: number;
  looping: boolean;
  label: string;
}) {
  const { leftPx, widthPx } = timeRangeRect(range, pixelsPerSecond);
  return (
    <div
      className="studio-time-range pointer-events-none absolute bottom-0 top-0 z-20"
      data-looping={looping ? "true" : "false"}
      style={{ left: leftPx, width: widthPx }}
      aria-hidden
      title={label}
    >
      <span className="studio-time-range-fill" />
      <span className="studio-time-range-edge studio-time-range-edge-start" />
      <span className="studio-time-range-edge studio-time-range-edge-end" />
    </div>
  );
}

function Playhead({ pixelsPerSecond }: { pixelsPerSecond: number }) {
  const studio = useStudio();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const place = (seconds: number) => {
      node.style.left = `${seconds * pixelsPerSecond}px`;
    };
    place(studio.playheadNow());
    return studio.subscribePlayhead(place);
  }, [pixelsPerSecond, studio]);
  return (
    <div ref={ref} className="studio-playhead pointer-events-none absolute bottom-0 top-0 z-30">
      <span className="studio-playhead-cap" />
      <span className="studio-playhead-line" />
    </div>
  );
}
