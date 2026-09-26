/**
 * Pure helpers for the studio console chrome.
 * Keyboard handling skips text fields. Session BPM is the grid clock.
 * It does not time-stretch clips. Per-track tempo does that.
 */

/** Session grid range. Wider than per-track stretch (40–240) and does not change playback rate. */
export const SESSION_BPM_MIN = 20;
export const SESSION_BPM_MAX = 300;
export const SESSION_BPM_DEFAULT = 120;

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

export function clampSessionBpm(value: number): number {
  if (!Number.isFinite(value)) return SESSION_BPM_DEFAULT;
  const clamped = Math.min(SESSION_BPM_MAX, Math.max(SESSION_BPM_MIN, value));
  return Math.round(clamped * 1000) / 1000;
}

/** Grid, snap, ruler, and metronome tempo. Missing values stay at 120. */
export function readSessionBpm(project: { sessionBpm?: number } | null | undefined): number {
  if (!project || typeof project.sessionBpm !== "number") return SESSION_BPM_DEFAULT;
  return clampSessionBpm(project.sessionBpm);
}

/** One wheel/arrow step. Shift nudges by a tenth so values like 92.5 are reachable. */
export function nudgeSessionBpm(current: number, steps: number, fine: boolean): number {
  const direction = steps < 0 ? -1 : 1;
  const count = Math.max(1, Math.round(Math.abs(steps)));
  const delta = (fine ? 0.1 : 1) * direction * count;
  return clampSessionBpm(readSessionBpm({ sessionBpm: current }) + delta);
}

/** Digits and one dot. Three places before the dot, three after (20–300, including 92.5). */
export function sanitizeSessionBpmDraft(text: string): string {
  const normalized = text.replace(/,/g, ".");
  let cleaned = "";
  let seenDot = false;
  for (const char of normalized) {
    if (char >= "0" && char <= "9") {
      const dotIndex = cleaned.indexOf(".");
      if (dotIndex === -1) {
        if (cleaned.length < 3) cleaned += char;
      } else if (cleaned.length - dotIndex - 1 < 3) {
        cleaned += char;
      }
      continue;
    }
    if (char === "." && !seenDot) {
      seenDot = true;
      cleaned += char;
    }
  }
  return cleaned;
}

/** Enter/blur. Empty or junk restores the current session tempo. */
export function commitSessionBpmText(text: string, fallback: number): number {
  const trimmed = text.trim().replace(/,/g, ".");
  if (!trimmed || trimmed === ".") return clampSessionBpm(fallback);
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return clampSessionBpm(fallback);
  return clampSessionBpm(value);
}

export function formatSessionBpm(value: number): string {
  const bpm = clampSessionBpm(value);
  return String(bpm);
}

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

export type StudioNewProjectButtonPhase = "new" | "clear" | "confirm";

/** Empty sessions show New. Open sessions show Clear, then Confirm clear when armed. */
export function studioNewProjectButtonPhase(open: boolean, armed: boolean): StudioNewProjectButtonPhase {
  if (!open) return "new";
  return armed ? "confirm" : "clear";
}
