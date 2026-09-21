"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { formatClock } from "@/lib/time";

export type AudioClipListItem = {
  id: string;
  name: string;
  bytes: number;
  duration: number;
  qualityLabel: string;
  selectionLabel: string;
  decodeFailed?: boolean;
};

type Props = {
  clips: AudioClipListItem[];
  selectedId: string | null;
  disabled?: boolean;
  filesLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  removeLabel: string;
  selectedHint: string;
  decodeFailedLabel: string;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
};

export function AudioClipList({
  clips,
  selectedId,
  disabled,
  filesLabel,
  moveUpLabel,
  moveDownLabel,
  removeLabel,
  selectedHint,
  decodeFailedLabel,
  onSelect,
  onMove,
  onRemove,
}: Props) {
  if (!clips.length) return null;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{filesLabel}</p>
        <p className="text-xs text-muted-foreground">{selectedHint}</p>
      </div>
      <ul className="space-y-2">
        {clips.map((clip, index) => {
          const selected = clip.id === selectedId;
          return (
            <li key={clip.id}>
              <div
                className={cn(
                  "flex flex-col gap-2 rounded-lg border px-2 py-2 transition sm:flex-row sm:items-stretch sm:gap-2",
                  selected ? "border-primary bg-primary/5" : "border-border",
                  clip.decodeFailed && "border-destructive/40 bg-destructive/5",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-md px-2 py-1 text-start"
                  onClick={() => onSelect(clip.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                >
                  <p className="truncate text-sm font-semibold">
                    {index + 1}. {clip.name}
                  </p>
                  {clip.decodeFailed ? (
                    <p className="mt-1 text-xs text-destructive">{decodeFailedLabel}</p>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                        {formatClock(clip.duration)} · {formatBytes(clip.bytes)} · {clip.qualityLabel}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
                        {clip.selectionLabel}
                      </p>
                    </>
                  )}
                </button>
                <div className="flex shrink-0 flex-row justify-end gap-1 sm:flex-col sm:justify-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => onMove(clip.id, -1)}
                    disabled={disabled || index === 0}
                    aria-label={moveUpLabel}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => onMove(clip.id, 1)}
                    disabled={disabled || index === clips.length - 1}
                    aria-label={moveDownLabel}
                  >
                    <ChevronDown />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => onRemove(clip.id)}
                    disabled={disabled}
                    aria-label={removeLabel}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
