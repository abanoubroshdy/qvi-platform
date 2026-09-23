"use client";

import { useEffect, useRef } from "react";
import { AudioLines } from "lucide-react";
import { formatClock } from "@/lib/time";
import { rulerMarks, timelineWidthPx } from "@/lib/studio/timeline-geometry";
import type { Messages } from "@/lib/i18n";
import { StudioTrackHeader } from "@/components/studio/StudioTrackHeader";
import { StudioTrackLane } from "@/components/studio/StudioTrackLane";
import { useStudio } from "@/components/studio/studio-context";

export function StudioTimeline({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const width = timelineWidthPx(studio.duration, studio.pixelsPerSecond);
  const marks = rulerMarks(studio.duration, studio.pixelsPerSecond);

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
                copy={copy}
                onSelect={() => studio.selectTrack(track.id, undefined, true)}
                onMute={() => studio.setMuted(track.id, !track.muted)}
                onSolo={() => studio.setSolo(track.id, !track.solo)}
              />
            ))}
          </div>
          <div className="studio-lanes min-w-0 flex-1 overflow-x-auto">
            <div className="relative" style={{ width }}>
              <div
                className="studio-ruler relative h-7 border-b border-border text-[10px] text-muted-foreground"
                style={{ ["--studio-tick" as string]: `${studio.pixelsPerSecond}px` }}
              >
                {marks.map((second) => (
                  <span key={second} className="absolute top-1 font-mono tabular-nums" style={{ left: second * studio.pixelsPerSecond }}>
                    {formatClock(second)}
                  </span>
                ))}
              </div>
              {studio.project.tracks.map((track) => (
                <StudioTrackLane
                  key={track.id}
                  track={track}
                  pixelsPerSecond={studio.pixelsPerSecond}
                  selectedClipId={studio.selectedTrack?.id === track.id ? (studio.selectedClip?.id ?? null) : null}
                  onSelectClip={(clipId) => studio.selectTrack(track.id, clipId)}
                  onTapClip={() => {
                    if (studio.viewport === "mobile") studio.setInspectorOpen(true);
                  }}
                  onSeek={studio.seek}
                  onOffset={(clipId, offsetSec) => studio.setOffset(track.id, clipId, offsetSec)}
                  onTrim={(clipId, patch) => studio.setTrim(track.id, clipId, patch)}
                />
              ))}
              <Playhead pixelsPerSecond={studio.pixelsPerSecond} />
            </div>
          </div>
        </div>
      )}
    </section>
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
