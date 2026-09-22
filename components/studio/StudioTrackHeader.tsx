"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/i18n";
import type { StudioTrack } from "@/lib/studio/types";

export function StudioTrackHeader({
  track,
  selected,
  copy,
  onSelect,
  onMute,
  onSolo,
}: {
  track: StudioTrack;
  selected: boolean;
  copy: Messages["studio"];
  onSelect: () => void;
  onMute: () => void;
  onSolo: () => void;
}) {
  return (
    <div className={cn("flex h-16 items-center gap-1 border-b border-border px-2", selected && "bg-muted")}>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-start" onClick={onSelect}>
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: track.color }} />
        <span className="truncate text-sm font-medium">{track.name}</span>
      </button>
      <Button type="button" size="sm" variant={track.muted ? "default" : "outline"} aria-pressed={track.muted} aria-label={copy.mute} onClick={onMute}>
        M
      </Button>
      <Button type="button" size="sm" variant={track.solo ? "default" : "outline"} aria-pressed={track.solo} aria-label={copy.solo} onClick={onSolo}>
        S
      </Button>
    </div>
  );
}
