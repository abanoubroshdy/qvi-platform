"use client";

import { useEffect, useRef } from "react";
import { Minus, Pause, Play, Plus, Square, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatStudioTimecode, sessionDisplayBpm } from "@/lib/studio/chrome";
import { nextPixelsPerSecond } from "@/lib/studio/timeline-geometry";
import type { Messages } from "@/lib/i18n";
import { useStudio } from "@/components/studio/studio-context";

export function StudioTransport({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const playing = studio.transport.status === "playing";
  const bpm = sessionDisplayBpm(studio.project.tracks, studio.selectedTrack?.id ?? null);

  return (
    <div className="studio-transport flex flex-wrap items-center gap-x-2 gap-y-2 px-2 py-2 sm:px-3">
      <div className="min-w-0 pe-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--studio-teal))]">{copy.title}</p>
        <p className="hidden max-w-[14rem] truncate text-[11px] text-muted-foreground xl:block">{copy.lead}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={studio.stop}
          aria-label={copy.stop}
        >
          <Square />
        </Button>
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => void studio.togglePlay()}
          disabled={!studio.canPlay && !playing}
          aria-label={playing ? copy.pause : copy.play}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
      </div>
      <TransportClock label={copy.timecode} duration={studio.duration} />
      <SeekControl label={copy.seek} />
      {bpm !== null && (
        <span className="studio-bpm" dir="ltr" title={studio.selectedTrack?.name}>
          {bpm.toFixed(1)}
          <span className="font-medium tracking-wide">{copy.bpm}</span>
        </span>
      )}
      <div className="ms-auto flex flex-wrap items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label={copy.zoomOut}
          onClick={() => studio.setPixelsPerSecond((value) => nextPixelsPerSecond(value, "out"))}
        >
          <Minus />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label={copy.zoomIn}
          onClick={() => studio.setPixelsPerSecond((value) => nextPixelsPerSecond(value, "in"))}
        >
          <Plus />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={studio.importing} onClick={() => studio.browse()}>
          <Upload />
          <span className="hidden sm:inline">{copy.addFiles}</span>
        </Button>
        <Button type="button" variant="secondary" size="sm" className="lg:hidden" onClick={() => studio.setMixerOpen(true)}>
          {copy.mixer}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => studio.setInspectorOpen((open) => !open)} disabled={!studio.selectedTrack}>
          {copy.inspector}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => studio.setExportOpen(true)}>
          {copy.export}
        </Button>
      </div>
      <p className="sr-only">{copy.keys}</p>
    </div>
  );
}

function TransportClock({ label, duration }: { label: string; duration: number }) {
  const studio = useStudio();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const paint = (seconds: number) => {
      node.textContent = formatStudioTimecode(seconds);
    };
    paint(studio.playheadNow());
    return studio.subscribePlayhead(paint);
  }, [studio]);
  return (
    <div className="studio-timecode" dir="ltr" aria-label={label}>
      <span ref={ref} className="studio-timecode-now">
        {formatStudioTimecode(studio.playhead)}
      </span>
      <span className="studio-timecode-sep">/</span>
      <span className="studio-timecode-end">{formatStudioTimecode(duration)}</span>
    </div>
  );
}

function SeekControl({ label }: { label: string }) {
  const studio = useStudio();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const paint = (seconds: number) => {
      if (document.activeElement === node) return;
      node.value = String(Math.min(seconds, studio.duration));
    };
    paint(studio.playheadNow());
    return studio.subscribePlayhead(paint);
  }, [studio]);
  return (
    <input
      ref={ref}
      className="studio-seek h-1.5 w-full min-w-[6rem] flex-1 cursor-pointer sm:w-36 sm:flex-none"
      dir="ltr"
      type="range"
      min={0}
      max={Math.max(studio.duration, 0.01)}
      step={0.01}
      defaultValue={0}
      disabled={studio.duration <= 0}
      aria-label={label}
      onChange={(event) => studio.seek(Number(event.target.value))}
    />
  );
}
