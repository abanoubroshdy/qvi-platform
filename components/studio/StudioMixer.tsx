"use client";

import { Slider } from "@/components/ui/slider";
import { qviStudioLimits } from "@/lib/studio/definition";
import type { Messages } from "@/lib/i18n";
import { useStudio } from "@/components/studio/studio-context";

export function StudioMixer({ copy }: { copy: Messages["studio"] }) {
  const studio = useStudio();
  const { min, max } = qviStudioLimits.gainDb;

  return (
    <div className="flex flex-col gap-4 p-4" aria-label={copy.mixer}>
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{copy.master}</span>
          <span dir="ltr" className="font-mono text-xs tabular-nums">
            {studio.project.masterGainDb.toFixed(1)} dB
          </span>
        </div>
        <Slider
          min={min}
          max={max}
          step={0.1}
          value={[studio.project.masterGainDb]}
          aria-label={copy.master}
          onValueChange={([value]) => studio.setMasterGain(value ?? 0)}
        />
      </div>
      {studio.project.tracks.map((track) => (
        <div key={track.id}>
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <button type="button" className="flex min-w-0 items-center gap-2" onClick={() => studio.selectTrack(track.id, undefined, true)}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: track.color }} />
              <span className="truncate">{track.name}</span>
            </button>
            <span dir="ltr" className="font-mono text-xs tabular-nums">
              {track.gainDb.toFixed(1)} dB
            </span>
          </div>
          <Slider
            min={min}
            max={max}
            step={0.1}
            value={[track.gainDb]}
            aria-label={`${copy.gain} ${track.name}`}
            onValueChange={([value]) => studio.setGain(track.id, value ?? 0)}
          />
        </div>
      ))}
    </div>
  );
}
