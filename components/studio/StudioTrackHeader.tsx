"use client";

import { Button } from "@/components/ui/button";
import { StudioLevelMeter } from "@/components/studio/StudioLevelMeter";
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
  return (
    <div
      className={cn("studio-track-head flex h-16 items-center gap-1 border-b border-border px-1.5", selected && "is-selected")}
      data-armed={armed ? "true" : "false"}
    >
      <StudioLevelMeter id={track.id} />
      <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-start" onClick={onSelect}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: track.color }} />
        <span className="truncate text-xs font-medium sm:text-sm">{track.name}</span>
      </button>
      <Button type="button" size="sm" variant={track.muted ? "default" : "outline"} className="h-6 w-6 px-0 text-[10px] font-semibold" aria-pressed={track.muted} aria-label={copy.mute} onClick={onMute}>
        M
      </Button>
      <Button type="button" size="sm" variant={track.solo ? "default" : "outline"} className="h-6 w-6 px-0 text-[10px] font-semibold" aria-pressed={track.solo} aria-label={copy.solo} onClick={onSolo}>
        S
      </Button>
    </div>
  );
}
