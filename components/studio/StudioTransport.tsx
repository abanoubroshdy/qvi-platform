"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Minus, Pause, Play, Plus, Repeat2, Square, Timer, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  commitSessionBpmText,
  formatSessionBpm,
  formatStudioTimecode,
  nudgeSessionBpm,
  readSessionBpm,
  sanitizeSessionBpmDraft,
  studioNewProjectButtonPhase,
  studioProjectIsOpen,
} from "@/lib/studio/chrome";
import { finishedProjectName } from "@/lib/studio/project";
import { nextPixelsPerSecond, type StudioSnapMode } from "@/lib/studio/timeline-geometry";
import type { Messages } from "@/lib/i18n";
import { useStudio } from "@/components/studio/studio-context";

/** Top chrome: project identity, snap, and session actions. */
export function StudioTransport({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  return (
    <div className="studio-transport studio-chrome-top flex flex-wrap items-center gap-x-2 gap-y-2 px-2 py-2 sm:px-3">
      <h1 className="max-w-[11rem] text-xs font-semibold leading-tight text-foreground sm:max-w-[18rem] sm:text-sm">
        {copy.pageHeading}
      </h1>
      <ProjectName copy={copy} />
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
      <ChromeActions copy={copy} />
      <p className="sr-only">{copy.keys}</p>
      <p className="sr-only">{copy.shiftSelect}</p>
    </div>
  );
}

/** Bottom dock: seek/BPM + transport + timecode centered; zoom trailing. */
export function StudioTransportDock({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const playing = studio.transport.status === "playing";

  return (
    <div className="studio-transport studio-transport-dock grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-2 px-2 py-2 sm:px-3">
      <div aria-hidden="true" />
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1" role="group" aria-label={copy.play}>
        <SeekControl label={copy.seek} />
        <div className="flex items-center gap-1">
          <SessionBpmField label={copy.sessionBpm} hint={copy.sessionBpmHint} unit={copy.bpm} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2 text-[0.68rem] font-semibold uppercase tracking-wide"
            aria-label={copy.tapTempo}
            title={copy.tapTempoHint}
            onClick={studio.tapTempo}
          >
            {copy.tapTempo}
            {studio.tapCount > 0 ? <span className="ms-1 tabular-nums opacity-70">{studio.tapCount}</span> : null}
          </Button>
          <Button
            type="button"
            size="icon"
            variant={studio.metronomeEnabled ? "default" : "outline"}
            className="h-8 w-8"
            aria-pressed={studio.metronomeEnabled}
            aria-label={copy.metronome}
            title={copy.metronomeHint}
            onClick={() => studio.setMetronomeEnabled(!studio.metronomeEnabled)}
          >
            <Timer />
          </Button>
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
          <Button
            type="button"
            size="icon"
            variant={studio.recording ? "destructive" : "outline"}
            className="h-8 w-8 rounded-full"
            aria-pressed={studio.recording}
            aria-label={studio.recording ? copy.stopRecord : copy.record}
            onClick={() => void studio.toggleRecord()}
          >
            <Circle className={studio.recording ? "fill-current" : ""} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={studio.loopEnabled ? "default" : "outline"}
            className="h-8 w-8"
            aria-pressed={studio.loopEnabled}
            aria-label={copy.loop}
            disabled={!studio.timeRange}
            title={studio.timeRange ? copy.loopHint : copy.loopNeedsRange}
            onClick={() => studio.setLoopEnabled(!studio.loopEnabled)}
          >
            <Repeat2 />
          </Button>
        </div>
        <TransportClock label={copy.timecode} duration={studio.duration} />
      </div>
      <div className="flex items-center justify-end gap-1">
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
        <span className="studio-zoom-level min-w-[2.5rem] text-center text-[10px] font-semibold tabular-nums text-muted-foreground" dir="ltr" title={copy.zoomLevel}>
          {Math.round((studio.pixelsPerSecond / 48) * 100)}%
        </span>
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
      </div>
    </div>
  );
}

function ChromeActions({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  return (
    <div className="ms-auto flex flex-wrap items-center gap-1">
      <Button type="button" variant="outline" size="sm" disabled={studio.importing} onClick={() => studio.browse()}>
        <Upload />
        <span className="hidden sm:inline">{copy.addFiles}</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => studio.addEmptyTrack()}>
        {copy.addTrack}
      </Button>
      <Button type="button" variant="secondary" size="sm" className="lg:hidden" onClick={() => studio.setMixerOpen(true)}>
        {copy.mixer}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => studio.setInspectorOpen((open) => !open)}
        disabled={!studio.selectedTrack}
      >
        {copy.inspector}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => studio.setExportOpen(true)}>
        {copy.export}
      </Button>
    </div>
  );
}

function ProjectName({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const [armed, setArmed] = useState(false);
  const open = studioProjectIsOpen(studio.project);
  const phase = studioNewProjectButtonPhase(open, armed);

  useEffect(() => {
    if (!open) setArmed(false);
  }, [open]);

  const label =
    phase === "new" ? copy.newProject : phase === "confirm" ? copy.confirmClear : copy.confirmNew;

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
        variant={phase === "confirm" ? "secondary" : "outline"}
        size="sm"
        aria-label={label}
        onBlur={() => {
          window.setTimeout(() => setArmed(false), 400);
        }}
        onClick={() => {
          if (phase === "new") {
            studio.newProject();
            return;
          }
          if (phase === "clear") {
            setArmed(true);
            return;
          }
          setArmed(false);
          studio.newProject();
        }}
      >
        {label}
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

function SessionBpmField({ label, hint, unit }: { label: string; hint: string; unit: string }) {
  const studio = useStudio();
  const bpm = readSessionBpm(studio.project);
  const [draft, setDraft] = useState(() => formatSessionBpm(bpm));
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const draftRef = useRef(draft);
  const bpmRef = useRef(bpm);
  const commitRef = useRef(studio.setSessionBpm);
  draftRef.current = draft;
  bpmRef.current = bpm;
  commitRef.current = studio.setSessionBpm;
  const dragRef = useRef<{ y: number; origin: number; dragging: boolean } | null>(null);

  useEffect(() => {
    if (!editing) setDraft(formatSessionBpm(bpm));
  }, [bpm, editing]);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const steps = event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0;
      if (!steps) return;
      commitRef.current(nudgeSessionBpm(bpmRef.current, steps, event.shiftKey));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <label className="studio-bpm" dir="ltr" title={hint}>
      <input
        ref={inputRef}
        className="studio-bpm-field"
        inputMode="decimal"
        aria-label={label}
        title={hint}
        value={draft}
        onChange={(event) => {
          setEditing(true);
          setDraft(sanitizeSessionBpmDraft(event.target.value));
        }}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          if (cancelRef.current) {
            cancelRef.current = false;
            setEditing(false);
            setDraft(formatSessionBpm(bpmRef.current));
            return;
          }
          commitRef.current(commitSessionBpmText(draftRef.current, bpmRef.current));
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitRef.current(commitSessionBpmText(draftRef.current, bpmRef.current));
            setEditing(false);
            event.currentTarget.blur();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelRef.current = true;
            setDraft(formatSessionBpm(bpmRef.current));
            setEditing(false);
            event.currentTarget.blur();
            return;
          }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const steps = event.key === "ArrowUp" ? 1 : -1;
            commitRef.current(nudgeSessionBpm(bpmRef.current, steps, event.shiftKey));
          }
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = { y: event.clientY, origin: bpmRef.current, dragging: false };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          const dy = drag.y - event.clientY;
          if (!drag.dragging && Math.abs(dy) < 4) return;
          if (!drag.dragging) {
            drag.dragging = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          event.preventDefault();
          const steps = Math.round(dy / 8);
          if (steps === 0) return;
          commitRef.current(nudgeSessionBpm(drag.origin, steps, event.shiftKey));
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
      />
      <span className="font-medium tracking-wide">{unit}</span>
    </label>
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
      className="studio-seek h-1.5 w-28 shrink-0 cursor-pointer sm:w-36"
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
