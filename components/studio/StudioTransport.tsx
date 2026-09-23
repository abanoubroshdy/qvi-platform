"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Pause, Play, Plus, Square, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatStudioTimecode, sessionDisplayBpm } from "@/lib/studio/chrome";
import { finishedProjectName } from "@/lib/studio/project";
import { nextPixelsPerSecond, type StudioSnapMode } from "@/lib/studio/timeline-geometry";
import type { Messages } from "@/lib/i18n";
import { useStudio } from "@/components/studio/studio-context";

export function StudioTransport({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const playing = studio.transport.status === "playing";
  const bpm = sessionDisplayBpm(studio.project.tracks, studio.selectedTrack?.id ?? null);

  return (
    <div className="studio-transport flex flex-wrap items-center gap-x-2 gap-y-2 px-2 py-2 sm:px-3">
      <ProjectName copy={copy} />
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
      <SnapControl
        label={copy.snap}
        mode={studio.snapMode}
        options={[
          { id: "bar", label: copy.snapBar },
          { id: "beat", label: copy.snapBeat },
          { id: "off", label: copy.snapOff },
        ]}
        onChange={studio.setSnapMode}
      />
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
      <p className="sr-only">{copy.shiftSelect}</p>
    </div>
  );
}

function ProjectName({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const [armed, setArmed] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-1 pe-1">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--studio-teal))]">{copy.title}</p>
        <input
          className="studio-project-name"
          aria-label={copy.projectName}
          value={studio.project.name}
          maxLength={80}
          spellCheck={false}
          onChange={(event) => studio.setProjectName(event.target.value)}
          onBlur={(event) => studio.setProjectName(finishedProjectName(event.target.value))}
        />
      </div>
      <Button
        type="button"
        variant={armed ? "secondary" : "outline"}
        size="sm"
        aria-label={armed ? copy.confirmNew : copy.newProject}
        onBlur={() => {
          window.setTimeout(() => setArmed(false), 400);
        }}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          studio.newProject();
        }}
      >
        {armed ? copy.confirmNew : copy.newProject}
      </Button>
      <p className="sr-only">{copy.newProjectHint}</p>
    </div>
  );
}

function SnapControl({
  label,
  mode,
  options,
  onChange,
}: {
  label: string;
  mode: StudioSnapMode;
  options: { id: StudioSnapMode; label: string }[];
  onChange: (mode: StudioSnapMode) => void;
}) {
  return (
    <div className="studio-snap" role="group" aria-label={label}>
      <span className="studio-snap-label">{label}</span>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="studio-snap-option"
          aria-pressed={mode === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
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
