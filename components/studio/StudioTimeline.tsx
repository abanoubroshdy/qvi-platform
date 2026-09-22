"use client";

import { formatClock } from "@/lib/time";
import { timelineWidthPx } from "@/lib/studio/timeline-geometry";
import type { Messages } from "@/lib/i18n";
import { StudioTrackHeader } from "@/components/studio/StudioTrackHeader";
import { StudioTrackLane } from "@/components/studio/StudioTrackLane";
import { useStudio } from "@/components/studio/studio-context";

export function StudioTimeline({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const width = timelineWidthPx(studio.duration, studio.pixelsPerSecond);
  const marks = Math.ceil(width / studio.pixelsPerSecond);

  return (
    <section aria-label={copy.timeline} className="min-w-0" dir="ltr">
      {studio.project.tracks.length === 0 ? (
        <button
          type="button"
          className="m-4 flex min-h-48 w-[calc(100%-2rem)] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
          onClick={() => studio.browse()}
        >
          <span className="text-base font-semibold">{copy.emptyTitle}</span>
          <span className="mt-2 max-w-md text-sm text-muted-foreground">{copy.emptyBody}</span>
        </button>
      ) : (
        <div className="flex max-h-[calc(100dvh-12rem)] overflow-y-auto">
          <div className="sticky left-0 z-20 w-28 shrink-0 border-e border-border bg-background sm:w-40">
            <div className="h-7 border-b border-border" />
            {studio.project.tracks.map((track) => (
              <StudioTrackHeader
                key={track.id}
                track={track}
                selected={studio.selectedTrack?.id === track.id}
                copy={copy}
                onSelect={() => studio.selectTrack(track.id)}
                onMute={() => studio.setMuted(track.id, !track.muted)}
                onSolo={() => studio.setSolo(track.id, !track.solo)}
              />
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="relative" style={{ width }}>
              <div className="flex h-7 border-b border-border text-[10px] text-muted-foreground">
                {Array.from({ length: marks + 1 }, (_, second) => (
                  <span key={second} className="absolute top-1" style={{ left: second * studio.pixelsPerSecond }}>
                    {second % 5 === 0 ? formatClock(second) : ""}
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
                  onSeek={studio.seek}
                  onOffset={(clipId, offsetSec) => studio.setOffset(track.id, clipId, offsetSec)}
                  onTrim={(clipId, patch) => studio.setTrim(track.id, clipId, patch)}
                />
              ))}
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-primary"
                style={{ left: studio.playhead * studio.pixelsPerSecond }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
