"use client";

import { useEffect, useRef } from "react";
import { Minus, Pause, Play, Plus, Square, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/time";
import { nextPixelsPerSecond } from "@/lib/studio/timeline-geometry";
import type { Messages } from "@/lib/i18n";
import { useStudio } from "@/components/studio/studio-context";

export function StudioTransport({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const playing = studio.transport.status === "playing";

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{copy.title}</p>
        <p className="hidden text-xs text-muted-foreground sm:block">{copy.lead}</p>
      </div>
      <div className="ms-auto flex flex-wrap items-center gap-2">
        <Button type="button" size="icon" onClick={() => void studio.togglePlay()} disabled={!studio.canPlay && !playing} aria-label={playing ? copy.pause : copy.play}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button type="button" size="icon" variant="outline" onClick={studio.stop} aria-label={copy.stop}>
          <Square />
        </Button>
        <TransportClock />
        <label className="sr-only" htmlFor="studio-seek">
          {copy.seek}
        </label>
        <SeekControl id="studio-seek" label={copy.seek} />
        <Button type="button" size="icon" variant="outline" aria-label={copy.zoomOut} onClick={() => studio.setPixelsPerSecond((value) => nextPixelsPerSecond(value, "out"))}>
          <Minus />
        </Button>
        <Button type="button" size="icon" variant="outline" aria-label={copy.zoomIn} onClick={() => studio.setPixelsPerSecond((value) => nextPixelsPerSecond(value, "in"))}>
          <Plus />
        </Button>
        <Button type="button" variant="outline" disabled={studio.importing} onClick={() => studio.browse()}>
          <Upload />
          {copy.addFiles}
        </Button>
        <Button type="button" variant="secondary" className="lg:hidden" onClick={() => studio.setMixerOpen(true)}>
          {copy.mixer}
        </Button>
        <Button type="button" variant="secondary" onClick={() => studio.setInspectorOpen((open) => !open)} disabled={!studio.selectedTrack}>
          {copy.inspector}
        </Button>
        <Button type="button" variant="outline" onClick={() => studio.setExportOpen(true)}>
          {copy.export}
        </Button>
      </div>
    </div>
  );
}

function TransportClock() {
  const studio = useStudio();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const paint = (seconds: number) => {
      node.textContent = `${formatClock(seconds)} / ${formatClock(studio.duration)}`;
    };
    paint(studio.playheadNow());
    return studio.subscribePlayhead(paint);
  }, [studio]);
  return (
    <span ref={ref} dir="ltr" className="min-w-[7.5rem] text-center font-mono text-sm tabular-nums">
      {formatClock(studio.playhead)} / {formatClock(studio.duration)}
    </span>
  );
}

function SeekControl({ id, label }: { id: string; label: string }) {
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
      id={id}
      className="h-2 w-28 cursor-pointer accent-primary sm:w-40"
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
