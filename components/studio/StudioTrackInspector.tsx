"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { qviStudioLimits } from "@/lib/studio/definition";
import type { Messages } from "@/lib/i18n";
import { useStudio } from "@/components/studio/studio-context";

export function StudioTrackInspector({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const track = studio.selectedTrack;
  const clip = studio.selectedClip;
  if (!track) return <p className="p-4 text-sm text-muted-foreground">{copy.emptyTitle}</p>;

  const limits = qviStudioLimits.tempo;
  const rendering = studio.renderingIds.includes(track.id);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{copy.inspector}</h2>
        <Button type="button" size="sm" variant="ghost" onClick={() => studio.setInspectorOpen(false)}>
          {copy.close}
        </Button>
      </div>
      <Input
        aria-label={copy.inspector}
        value={track.name}
        onChange={(event) => studio.setName(track.id, event.target.value)}
      />
      {rendering && <p className="text-xs text-primary">{copy.rendering}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={track.tempo.mode === "bpm" ? "default" : "outline"} onClick={() => studio.setTempo(track.id, { mode: "bpm" })}>
          {copy.bpm}
        </Button>
        <Button type="button" size="sm" variant={track.tempo.mode === "percent" ? "default" : "outline"} onClick={() => studio.setTempo(track.id, { mode: "percent" })}>
          {copy.percent}
        </Button>
      </div>
      {track.tempo.mode === "bpm" ? (
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={copy.originalBpm}
            value={track.tempo.originalBpm}
            min={limits.minBpm}
            max={limits.maxBpm}
            onCommit={(value) => studio.setTempo(track.id, { originalBpm: value })}
          />
          <NumberField
            label={copy.targetBpm}
            value={track.tempo.targetBpm}
            min={limits.minBpm}
            max={limits.maxBpm}
            onCommit={(value) => studio.setTempo(track.id, { targetBpm: value })}
          />
        </div>
      ) : (
        <NumberField
          label={copy.percent}
          value={track.tempo.percent}
          min={limits.minPercent}
          max={limits.maxPercent}
          onCommit={(value) => studio.setTempo(track.id, { percent: value })}
        />
      )}
      <Field label={copy.semitones} value={`${track.pitchSemitones}`}>
        <Slider
          min={limits.minSemitones}
          max={limits.maxSemitones}
          step={1}
          value={[track.pitchSemitones]}
          aria-label={copy.semitones}
          onValueChange={([value]) => studio.setPitch(track.id, { semitones: value ?? 0 })}
        />
      </Field>
      <Field label={copy.cents} value={`${track.pitchCents}`}>
        <Slider
          min={limits.minCents}
          max={limits.maxCents}
          step={1}
          value={[track.pitchCents]}
          aria-label={copy.cents}
          onValueChange={([value]) => studio.setPitch(track.id, { cents: value ?? 0 })}
        />
      </Field>
      {clip && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={copy.trimStart}
            value={clip.trimStartSec}
            min={0}
            max={clip.sourceDurationSec}
            step={0.01}
            onCommit={(value) => studio.setTrim(track.id, clip.id, { trimStartSec: value })}
          />
          <NumberField
            label={copy.trimEnd}
            value={clip.trimEndSec}
            min={0}
            max={clip.sourceDurationSec}
            step={0.01}
            onCommit={(value) => studio.setTrim(track.id, clip.id, { trimEndSec: value })}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => studio.browse(track.id)}>
          {copy.addToTrack}
        </Button>
        {clip && (
          <Button type="button" variant="outline" onClick={() => studio.deleteClip(track.id, clip.id)}>
            {copy.removeClip}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => studio.deleteTrack(track.id)}>
          {copy.removeTrack}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center justify-between">
        {label}
        <span dir="ltr" className="font-mono text-xs tabular-nums">
          {value}
        </span>
      </span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label className="block text-sm">
      <span className="mb-1 block">{label}</span>
      <Input
        dir="ltr"
        inputMode="decimal"
        value={draft}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = Number(draft.replace(",", "."));
          if (!Number.isFinite(next)) {
            setDraft(String(value));
            return;
          }
          onCommit(Math.min(max, Math.max(min, next)));
        }}
        step={step}
      />
    </label>
  );
}
