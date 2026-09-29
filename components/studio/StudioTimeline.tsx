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
  STUDIO_EMPTY_PLACEHOLDER_LANES,
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
  const tracks = studio.project.tracks;
  const empty = tracks.length === 0;
  const placeholders = empty ? STUDIO_EMPTY_PLACEHOLDER_LANES : 0;
  const selectedOnTrack = (trackId: string) => {
    const ids = new Set<string>();
    for (const item of studio.selection) {
      if (item.trackId === trackId) ids.add(item.clipId);
    }
    return ids;
  };
  const visibleRange = draftRange ?? studio.timeRange;

  return (
    <section aria-label={copy.timeline} className="studio-arrange flex min-h-0 flex-1 flex-col" dir="ltr">
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="studio-track-heads sticky left-0 z-20 shrink-0 border-e border-border">
          <div className="studio-track-heads-corner">{copy.tracks}</div>
          {tracks.map((track) => (
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
          {Array.from({ length: placeholders }, (_, index) => (
            <button
              key={`empty-head-${index}`}
              type="button"
              className="studio-track-head-placeholder w-full text-start"
              onClick={() => (index === 0 ? studio.addEmptyTrack() : studio.browse())}
            >
              {index === 0 ? copy.addTrack : copy.emptyLaneHint}
            </button>
          ))}
        </div>
        <div className="studio-lanes min-w-0 flex-1 overflow-x-auto">
          <div className="relative min-h-full" style={{ width: Math.max(width, 1) }}>
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
            {tracks.map((track) => (
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
            {Array.from({ length: placeholders }, (_, index) => (
              <EmptyLane
                key={`empty-lane-${index}`}
                beatPx={beatPx}
                barPx={barPx}
                label={copy.emptyLaneHint}
                onActivate={() => (index === 0 ? studio.addEmptyTrack() : studio.browse())}
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
            {empty ? (
              <div className="studio-arrange-drop" data-studio-arrange-empty>
                <AudioLines className="mb-1 h-7 w-7 text-[hsl(var(--studio-teal))]" aria-hidden />
                <p className="text-sm font-semibold tracking-tight text-foreground">{copy.emptyTitle}</p>
                <p className="max-w-md text-xs text-muted-foreground">{copy.emptyBody}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--studio-sand))]">
                  {copy.dropHint}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyLane({
  beatPx,
  barPx,
  label,
  onActivate,
}: {
  beatPx: number;
  barPx: number;
  label: string;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      className="studio-lane studio-lane-placeholder relative w-full border-b border-border text-start"
      data-grid={beatPx >= 8 ? "beats" : "bars"}
      style={{ ["--beat-px" as string]: `${beatPx}px`, ["--bar-px" as string]: `${barPx}px` }}
      aria-label={label}
      onClick={onActivate}
    />
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
      className="studio-ruler relative cursor-ew-resize border-b border-border text-[10px] text-[hsl(var(--studio-sand))]"
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
