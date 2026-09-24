"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { resolveTempoRate } from "@/lib/audio-tempo";
import { tempoPitchComfort, type StretchPresetId } from "@/lib/audio-stretch-preset";
import { qviStudioLimits } from "@/lib/studio/definition";
import { STUDIO_EQ_MAX_DB, STUDIO_EQ_MIN_DB, formatPan } from "@/lib/studio/mix";
import type { Messages } from "@/lib/i18n";
import { useStudio } from "@/components/studio/studio-context";

const STRETCH_PRESETS = ["music", "speech", "solo-vocal"] as const satisfies readonly StretchPresetId[];

export function StudioTrackInspector({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const track = studio.selectedTrack;
  const clip = studio.selectedClip;
  if (!track) return <p className="p-4 text-sm text-muted-foreground">{copy.emptyTitle}</p>;

  const limits = qviStudioLimits.tempo;
  const rendering = studio.renderingIds.includes(track.id);
  const comfort = tempoPitchComfort({
    tempoRate: resolveTempoRate(track.tempo),
    semitones: track.pitchSemitones,
    cents: track.pitchCents,
  });
  const presetLabel: Record<StretchPresetId, string> = {
    music: copy.presetMusic,
    speech: copy.presetSpeech,
    "solo-vocal": copy.presetSoloVocal,
  };

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
      {studio.liveReady ? <p className="text-xs text-muted-foreground">{copy.livePreview}</p> : null}
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
      {comfort.tempo ? <p className="text-xs text-amber-700 dark:text-amber-300">{copy.tempoComfort}</p> : null}
      <div className="flex flex-wrap gap-2" role="group" aria-label={copy.stretchPreset}>
        {STRETCH_PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={track.stretchPreset === preset ? "default" : "outline"}
            aria-pressed={track.stretchPreset === preset}
            onClick={() => studio.setStretchPreset(track.id, preset)}
          >
            {presetLabel[preset]}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={studio.armedTrackId === track.id ? "destructive" : "outline"}
          aria-pressed={studio.armedTrackId === track.id}
          onClick={() => studio.setArmedTrack(studio.armedTrackId === track.id ? null : track.id)}
        >
          {studio.armedTrackId === track.id ? copy.armed : copy.armForRecord}
        </Button>
      </div>
      <Field label={copy.pan} value={formatPan(track.pan)}>
        <Slider
          min={-1}
          max={1}
          step={0.01}
          value={[track.pan]}
          aria-label={copy.pan}
          onValueChange={([value]) => studio.setPan(track.id, value ?? 0)}
        />
      </Field>
      <Field label={copy.eqLow} value={`${track.eq.lowDb.toFixed(1)} dB`}>
        <Slider
          min={STUDIO_EQ_MIN_DB}
          max={STUDIO_EQ_MAX_DB}
          step={0.1}
          value={[track.eq.lowDb]}
          aria-label={copy.eqLow}
          onValueChange={([value]) => studio.setEq(track.id, { lowDb: value ?? 0 })}
        />
      </Field>
      <Field label={copy.eqMid} value={`${track.eq.midDb.toFixed(1)} dB`}>
        <Slider
          min={STUDIO_EQ_MIN_DB}
          max={STUDIO_EQ_MAX_DB}
          step={0.1}
          value={[track.eq.midDb]}
          aria-label={copy.eqMid}
          onValueChange={([value]) => studio.setEq(track.id, { midDb: value ?? 0 })}
        />
      </Field>
      <Field label={copy.eqHigh} value={`${track.eq.highDb.toFixed(1)} dB`}>
        <Slider
          min={STUDIO_EQ_MIN_DB}
          max={STUDIO_EQ_MAX_DB}
          step={0.1}
          value={[track.eq.highDb]}
          aria-label={copy.eqHigh}
          onValueChange={([value]) => studio.setEq(track.id, { highDb: value ?? 0 })}
        />
      </Field>
      <Field label={copy.compressor} value={`${Math.round(track.compressor * 100)}`}>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[track.compressor]}
          aria-label={copy.compressor}
          onValueChange={([value]) => studio.setCompressor(track.id, value ?? 0)}
        />
      </Field>
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
      {comfort.pitch ? <p className="text-xs text-amber-700 dark:text-amber-300">{copy.pitchComfort}</p> : null}
      <p className="text-xs text-muted-foreground">{copy.formantNote}</p>
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
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
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
