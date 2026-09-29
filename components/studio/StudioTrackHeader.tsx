"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudioLevelMeter } from "@/components/studio/StudioLevelMeter";
import { StudioSliderField } from "@/components/studio/StudioControlField";
import { useStudio } from "@/components/studio/studio-context";
import { qviStudioLimits } from "@/lib/studio/definition";
import { formatPan } from "@/lib/studio/mix";
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/i18n";
import type { StudioTrack } from "@/lib/studio/types";

export function StudioTrackHeader({
  track,
  selected,
  armed = false,
  copy,
  onSelect,
  onMute,
  onSolo,
}: {
  track: StudioTrack;
  selected: boolean;
  armed?: boolean;
  copy: Messages["studio"];
  onSelect: () => void;
  onMute: () => void;
  onSolo: () => void;
}) {
  const studio = useStudio();
  const compact = studio.viewport === "mobile";
  const { min, max, unity } = qviStudioLimits.gainDb;
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(track.name);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftName(track.name);
  }, [track.name]);

  useEffect(() => {
    if (!renaming) return;
    nameRef.current?.focus();
    nameRef.current?.select();
  }, [renaming]);

  const commitName = () => {
    const next = draftName.trim() || track.name;
    setDraftName(next);
    setRenaming(false);
    if (next !== track.name) studio.setName(track.id, next);
  };

  return (
    <div
      className={cn("studio-track-head border-b border-border", selected && "is-selected")}
      data-armed={armed ? "true" : "false"}
      data-compact={compact ? "true" : "false"}
    >
      <StudioLevelMeter id={track.id} />
      <div className="studio-track-head-body min-w-0 flex-1">
        <div className="studio-track-head-row">
          <span className="studio-track-head-swatch shrink-0" style={{ backgroundColor: track.color }} aria-hidden />
          {renaming ? (
            <Input
              ref={nameRef}
              className="studio-track-head-name-input h-6 min-w-0 flex-1 px-1 py-0 text-xs"
              value={draftName}
              aria-label={copy.inspector}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setDraftName(track.name);
                  setRenaming(false);
                }
              }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            />
          ) : (
            <button
              type="button"
              className="studio-track-head-name min-w-0 flex-1 truncate text-start text-xs font-medium"
              title={track.name}
              onClick={onSelect}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setRenaming(true);
              }}
            >
              {track.name}
            </button>
          )}
          <Button
            type="button"
            size="sm"
            variant={armed ? "destructive" : "outline"}
            className="studio-track-head-btn"
            aria-pressed={armed}
            aria-label={`${copy.arm} ${track.name}`}
            title={copy.armForRecord}
            onClick={(event) => {
              event.stopPropagation();
              studio.setArmedTrack(armed ? null : track.id);
            }}
          >
            R
          </Button>
          <Button
            type="button"
            size="sm"
            variant={track.muted ? "default" : "outline"}
            className="studio-track-head-btn"
            aria-pressed={track.muted}
            aria-label={copy.mute}
            onClick={(event) => {
              event.stopPropagation();
              onMute();
            }}
          >
            M
          </Button>
          <Button
            type="button"
            size="sm"
            variant={track.solo ? "default" : "outline"}
            className="studio-track-head-btn"
            aria-pressed={track.solo}
            aria-label={copy.solo}
            onClick={(event) => {
              event.stopPropagation();
              onSolo();
            }}
          >
            S
          </Button>
        </div>
        {!compact ? (
          <div
            className="studio-track-head-mix"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <StudioSliderField
              className="studio-track-head-slider"
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
            <StudioSliderField
              className="studio-track-head-slider"
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
        ) : null}
      </div>
    </div>
  );
}
