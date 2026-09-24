"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudioNumberField, StudioSliderField } from "@/components/studio/StudioControlField";
import { resolveTempoRate } from "@/lib/audio-tempo";
import { tempoPitchComfort, type StretchPresetId } from "@/lib/audio-stretch-preset";
import { heardClipDuration, qviStudioLimits, sourceClipDuration } from "@/lib/studio/definition";
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
  const gain = qviStudioLimits.gainDb;
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
          <StudioNumberField
            label={copy.originalBpm}
            value={track.tempo.originalBpm}
            min={limits.minBpm}
            max={limits.maxBpm}
            onCommit={(value) => studio.setTempo(track.id, { originalBpm: value })}
          />
          <StudioNumberField
            label={copy.targetBpm}
            value={track.tempo.targetBpm}
            min={limits.minBpm}
            max={limits.maxBpm}
            onCommit={(value) => studio.setTempo(track.id, { targetBpm: value })}
          />
        </div>
      ) : (
        <StudioNumberField
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
      <StudioSliderField
        label={copy.gain}
        value={track.gainDb}
        defaultValue={gain.unity}
        min={gain.min}
        max={gain.max}
        step={0.1}
        digits={1}
        unit="dB"
        resetHint={copy.resetDefaultHint}
        onChange={(value) => studio.setGain(track.id, value)}
      />
      <StudioSliderField
        label={copy.pan}
        value={track.pan}
        defaultValue={0}
        min={-1}
        max={1}
        step={0.01}
        digits={2}
        displayValue={formatPan(track.pan)}
        parse="pan"
        resetHint={copy.resetDefaultHint}
        onChange={(value) => studio.setPan(track.id, value)}
      />
      <StudioSliderField
        label={copy.eqLow}
        value={track.eq.lowDb}
        defaultValue={0}
        min={STUDIO_EQ_MIN_DB}
        max={STUDIO_EQ_MAX_DB}
        step={0.1}
        digits={1}
        unit="dB"
        resetHint={copy.resetDefaultHint}
        onChange={(value) => studio.setEq(track.id, { lowDb: value })}
      />
      <StudioSliderField
        label={copy.eqMid}
        value={track.eq.midDb}
        defaultValue={0}
        min={STUDIO_EQ_MIN_DB}
        max={STUDIO_EQ_MAX_DB}
        step={0.1}
        digits={1}
        unit="dB"
        resetHint={copy.resetDefaultHint}
        onChange={(value) => studio.setEq(track.id, { midDb: value })}
      />
      <StudioSliderField
        label={copy.eqHigh}
        value={track.eq.highDb}
        defaultValue={0}
        min={STUDIO_EQ_MIN_DB}
        max={STUDIO_EQ_MAX_DB}
        step={0.1}
        digits={1}
        unit="dB"
        resetHint={copy.resetDefaultHint}
        onChange={(value) => studio.setEq(track.id, { highDb: value })}
      />
      <StudioSliderField
        label={copy.compressor}
        value={track.compressor}
        defaultValue={0}
        min={0}
        max={1}
        step={0.01}
        digits={2}
        resetHint={copy.resetDefaultHint}
        onChange={(value) => studio.setCompressor(track.id, value)}
      />
      <StudioSliderField
        label={copy.semitones}
        value={track.pitchSemitones}
        defaultValue={0}
        min={limits.minSemitones}
        max={limits.maxSemitones}
        step={1}
        digits={0}
        resetHint={copy.resetDefaultHint}
        onChange={(value) => studio.setPitch(track.id, { semitones: Math.round(value) })}
      />
      <StudioSliderField
        label={copy.cents}
        value={track.pitchCents}
        defaultValue={0}
        min={limits.minCents}
        max={limits.maxCents}
        step={1}
        digits={0}
        resetHint={copy.resetDefaultHint}
        onChange={(value) => studio.setPitch(track.id, { cents: Math.round(value) })}
      />
      {comfort.pitch ? <p className="text-xs text-amber-700 dark:text-amber-300">{copy.pitchComfort}</p> : null}
      <p className="text-xs text-muted-foreground">{copy.formantNote}</p>
      {clip && (
        <div className="grid grid-cols-2 gap-2">
          <StudioNumberField
            label={copy.trimStart}
            value={clip.trimStartSec}
            min={0}
            max={clip.sourceDurationSec}
            step={0.01}
            digits={2}
            onCommit={(value) => studio.setTrim(track.id, clip.id, { trimStartSec: value })}
          />
          <StudioNumberField
            label={copy.trimEnd}
            value={clip.trimEndSec}
            min={0}
            max={clip.sourceDurationSec}
            step={0.01}
            digits={2}
            onCommit={(value) => studio.setTrim(track.id, clip.id, { trimEndSec: value })}
          />
          <StudioSliderField
            label={copy.fadeIn}
            value={clip.fadeInSec}
            defaultValue={0}
            min={0}
            max={Math.max(0.01, heardClipDuration(sourceClipDuration(clip), track.tempo) / 2)}
            step={0.01}
            digits={2}
            unit="s"
            resetHint={copy.resetDefaultHint}
            onChange={(value) => studio.setFades(track.id, clip.id, { fadeInSec: value })}
          />
          <StudioSliderField
            label={copy.fadeOut}
            value={clip.fadeOutSec}
            defaultValue={0}
            min={0}
            max={Math.max(0.01, heardClipDuration(sourceClipDuration(clip), track.tempo) / 2)}
            step={0.01}
            digits={2}
            unit="s"
            resetHint={copy.resetDefaultHint}
            onChange={(value) => studio.setFades(track.id, clip.id, { fadeOutSec: value })}
          />
        </div>
      )}
      {clip ? <p className="text-xs text-muted-foreground">{copy.fadeHint}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => studio.browse(track.id)}>
          {copy.addToTrack}
        </Button>
        {clip && (
          <Button type="button" variant="outline" onClick={() => studio.splitSelectedAtPlayhead()}>
            {copy.splitClip}
          </Button>
        )}
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
