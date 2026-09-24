"use client";

import { StudioLevelMeter } from "@/components/studio/StudioLevelMeter";
import { StudioSliderField } from "@/components/studio/StudioControlField";
import { Button } from "@/components/ui/button";
import { qviStudioLimits } from "@/lib/studio/definition";
import { formatPan } from "@/lib/studio/mix";
import type { Messages } from "@/lib/i18n";
import { useStudio } from "@/components/studio/studio-context";

export function StudioMixer({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const { min, max, unity } = qviStudioLimits.gainDb;

  return (
    <div className="flex flex-col gap-3 p-3" aria-label={copy.mixer}>
      <div className="studio-mix-strip">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-[hsl(var(--studio-sand))]">{copy.master}</span>
        </div>
        <StudioLevelMeter id="master" axis="x" />
        <StudioSliderField
          className="mt-2"
          compact
          showLabel={false}
          label={copy.master}
          value={studio.project.masterGainDb}
          defaultValue={unity}
          min={min}
          max={max}
          step={0.1}
          digits={1}
          unit="dB"
          resetHint={copy.resetDefaultHint}
          onChange={(value) => studio.setMasterGain(value)}
        />
      </div>
      {studio.project.tracks.map((track) => (
        <div key={track.id} className="studio-mix-strip">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <button type="button" className="flex min-w-0 items-center gap-2" onClick={() => studio.selectTrack(track.id, undefined, true)}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: track.color }} />
              <span className="truncate">{track.name}</span>
            </button>
          </div>
          <StudioLevelMeter id={track.id} axis="x" />
          <StudioSliderField
            className="mt-2"
            compact
            label={copy.gain}
            ariaLabel={`${copy.gain} ${track.name}`}
            value={track.gainDb}
            defaultValue={unity}
            min={min}
            max={max}
            step={0.1}
            digits={1}
            unit="dB"
            resetHint={copy.resetDefaultHint}
            onChange={(value) => studio.setGain(track.id, value)}
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
            <StudioSliderField
              className="min-w-0 flex-1"
              compact
              label={copy.pan}
              ariaLabel={`${copy.pan} ${track.name}`}
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
          </div>
        </div>
      ))}
    </div>
  );
}
