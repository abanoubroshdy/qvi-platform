"use client";

import { Slider } from "@/components/ui/slider";
import { StudioLevelMeter } from "@/components/studio/StudioLevelMeter";
import { qviStudioLimits } from "@/lib/studio/definition";
import { formatPan } from "@/lib/studio/mix";
import { Button } from "@/components/ui/button";
import type { Messages } from "@/lib/i18n";
import { useStudio } from "@/components/studio/studio-context";

export function StudioMixer({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const { min, max } = qviStudioLimits.gainDb;

  return (
    <div className="flex flex-col gap-3 p-3" aria-label={copy.mixer}>
      <div className="studio-mix-strip">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-[hsl(var(--studio-sand))]">{copy.master}</span>
          <span dir="ltr" className="font-mono tabular-nums text-muted-foreground">
            {studio.project.masterGainDb.toFixed(1)} dB
          </span>
        </div>
        <StudioLevelMeter id="master" axis="x" />
        <Slider
          className="mt-2"
          min={min}
          max={max}
          step={0.1}
          value={[studio.project.masterGainDb]}
          aria-label={copy.master}
          onValueChange={([value]) => studio.setMasterGain(value ?? 0)}
        />
      </div>
      {studio.project.tracks.map((track) => (
        <div key={track.id} className="studio-mix-strip">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <button type="button" className="flex min-w-0 items-center gap-2" onClick={() => studio.selectTrack(track.id, undefined, true)}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: track.color }} />
              <span className="truncate">{track.name}</span>
            </button>
            <span dir="ltr" className="font-mono tabular-nums text-muted-foreground">
              {track.gainDb.toFixed(1)} dB
            </span>
          </div>
          <StudioLevelMeter id={track.id} axis="x" />
          <Slider
            className="mt-2"
            min={min}
            max={max}
            step={0.1}
            value={[track.gainDb]}
            aria-label={`${copy.gain} ${track.name}`}
            onValueChange={([value]) => studio.setGain(track.id, value ?? 0)}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={studio.armedTrackId === track.id ? "destructive" : "outline"}
              className="h-6 px-2 text-[10px]"
              aria-pressed={studio.armedTrackId === track.id}
              aria-label={`${copy.arm} ${track.name}`}
              onClick={() => studio.setArmedTrack(studio.armedTrackId === track.id ? null : track.id)}
            >
              {copy.arm}
            </Button>
            <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{copy.pan}</span>
            <Slider
              className="min-w-0 flex-1"
              min={-1}
              max={1}
              step={0.01}
              value={[track.pan]}
              aria-label={`${copy.pan} ${track.name}`}
              onValueChange={([value]) => studio.setPan(track.id, value ?? 0)}
            />
            <span dir="ltr" className="w-8 shrink-0 text-end font-mono text-[10px] tabular-nums text-muted-foreground">
              {formatPan(track.pan)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
