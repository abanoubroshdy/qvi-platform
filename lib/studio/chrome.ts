/**
 * Pure helpers for the studio console chrome.
 * Keyboard handling skips text fields. Timecode and BPM are display-only.
 */

import type { StudioTempoSetting } from "@/lib/studio/definition";

export type StudioTransportCommand =
  | { action: "play-pause" }
  | { action: "stop" }
  | { action: "seek"; deltaSec: number };

type TransportKeyEvent = {
  key: string;
  code?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
};

export function isStudioTextTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const node = target as { tagName?: string; isContentEditable?: boolean };
  const tag = typeof node.tagName === "string" ? node.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return node.isContentEditable === true;
}

/** Space plays, Home stops, arrows seek. Repeats are kept for seeking only. */
export function studioTransportCommand(event: TransportKeyEvent): StudioTransportCommand | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  const space = event.code === "Space" || event.key === " " || event.key === "Spacebar";
  if (space) return event.repeat ? null : { action: "play-pause" };
  if (event.key === "Home") return event.repeat ? null : { action: "stop" };
  const step = event.shiftKey ? 5 : 1;
  if (event.key === "ArrowLeft") return { action: "seek", deltaSec: -step };
  if (event.key === "ArrowRight") return { action: "seek", deltaSec: step };
  return null;
}

/** Tenths, so the transport clock moves between whole seconds. */
export function formatStudioTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00.0";
  const totalTenths = Math.round(seconds * 10);
  const minutes = Math.floor(totalTenths / 600);
  const wholeSeconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${tenths}`;
}

type BpmTrack = {
  id: string;
  tempo: StudioTempoSetting;
};

/** Heard BPM for the selected track, or the first track once a session has audio. */
export function sessionDisplayBpm(tracks: readonly BpmTrack[], selectedTrackId: string | null): number | null {
  if (tracks.length === 0) return null;
  const track = tracks.find((item) => item.id === selectedTrackId) ?? tracks[0];
  if (!track) return null;
  const bpm =
    track.tempo.mode === "percent"
      ? Math.round(track.tempo.originalBpm * (1 + track.tempo.percent / 100) * 10) / 10
      : track.tempo.targetBpm;
  return Number.isFinite(bpm) ? bpm : null;
}

/** A session counts as open once it has at least one track (clips optional). */
export function studioProjectIsOpen(project: { tracks: readonly unknown[] }): boolean {
  return project.tracks.length > 0;
}
