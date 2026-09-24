/**
 * QVI Studio session model (phase 1).
 *
 * Snapshots in `project.ts` omit AudioBuffers.
 * IndexedDB stores that snapshot plus the original audio bytes so refresh can decode them again.
 * There is no cloud copy.
 */

import type { StudioClipSpan, StudioTempoSetting } from "@/lib/studio/definition";
import type { StudioTrackEq } from "@/lib/studio/mix";

export const STUDIO_MODEL_PHASE = 1 as const;

export const STUDIO_SNAPSHOT_VERSION = 1 as const;

/** Cycled per track. Teal, violet, and sand follow the QVI brand. */
export const studioTrackColors = [
  "#1a7f96",
  "#6d5efc",
  "#c4a574",
  "#0f2744",
  "#d4654f",
  "#3d8b6e",
  "#8b5e83",
  "#4c6f8f",
] as const;

export type StudioClip = StudioClipSpan & {
  id: string;
  fileName: string;
  byteLength: number;
  /** Full file length in source seconds, before trim. */
  sourceDurationSec: number;
  sampleRate: number;
  channels: number;
  peaks: number[];
  /** Decoded PCM. Never written into a snapshot. */
  buffer: AudioBuffer | null;
};

export type StudioTrack = {
  id: string;
  name: string;
  color: string;
  clips: StudioClip[];
  /** dB, unity at 0. Mute is separate. */
  gainDb: number;
  muted: boolean;
  solo: boolean;
  tempo: StudioTempoSetting;
  pitchSemitones: number;
  pitchCents: number;
  /** -1 left, 0 center, 1 right. */
  pan: number;
  eq: StudioTrackEq;
  /** 0 bypasses the compressor. 1 is a light squeeze. */
  compressor: number;
};

export type StudioProject = {
  id: string;
  name: string;
  masterGainDb: number;
  /** Heard time. Playing and paused live on the engine, not here. */
  playheadSec: number;
  tracks: StudioTrack[];
};

export type StudioClipState = Omit<StudioClip, "buffer">;

export type StudioTrackState = Omit<StudioTrack, "clips"> & {
  clips: StudioClipState[];
};

export type StudioProjectSnapshot = {
  version: typeof STUDIO_SNAPSHOT_VERSION;
  id: string;
  name: string;
  masterGainDb: number;
  playheadSec: number;
  tracks: StudioTrackState[];
};

export function trackColorForIndex(index: number): string {
  const safe = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return studioTrackColors[safe % studioTrackColors.length] ?? studioTrackColors[0];
}

export function createStudioId(prefix: "project" | "track" | "clip"): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}
