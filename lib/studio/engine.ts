/**
 * QVI Studio engine surface.
 *
 * Playback and tempo/pitch preview render on device.
 * Export bounces one audible mix through ffmpeg.wasm.
 */

import type { AudioExportSettings } from "@/lib/audio-export";
import type { StudioExportFormat } from "@/lib/studio/definition";
import type { StudioProject, StudioTrack } from "@/lib/studio/types";

export const studioEngineContract = {
  phase: 5,
  implementsPlayback: true,
  implementsPreview: true,
  implementsExport: true,
  playback: ["resumeFromUserGesture", "play", "pause", "stop", "seek", "sync", "dispose"],
  preview: ["renderTrack"],
  export: ["exportMix"],
} as const;

export type StudioEngineStatus = "idle" | "playing" | "paused";

/**
 * Live playback is Web Audio. When a SoundTouch worklet is registered, tempo
 * and pitch run there. Otherwise {@link StudioTempoPitchPreview} bakes them
 * into a buffer first. Export always uses the offline bake.
 * Audibility follows `isTrackAudible`. Start only after a user gesture.
 */
export interface StudioPlaybackEngine {
  resumeFromUserGesture(): Promise<void>;
  play(project: StudioProject): void;
  pause(): void;
  stop(): void;
  seek(playheadSec: number): void;
  /** Rebuild the graph after an edit. Must not start playback by itself. */
  sync(project: StudioProject): void;
  dispose(): void;
}

/**
 * Offline tempo/pitch render for one track.
 * Resolves `null` when tempo is 1 and pitch is 0 (identity, skip the render).
 */
export interface StudioTempoPitchPreview {
  renderTrack(track: StudioTrack, signal?: AbortSignal): Promise<AudioBuffer | null>;
}

export type StudioExportRequest = {
  project: StudioProject;
  format: StudioExportFormat;
  settings: AudioExportSettings;
};

export type StudioEngineExportResult =
  | { ok: true; blob: Blob; fileName: string; mimeType: string }
  | { ok: false; reason: "empty-project" | "nothing-audible" };

/**
 * One bounced mix through ffmpeg.wasm `amix`.
 * Mute and solo match playback. Formats are mp3 and wav.
 */
export interface StudioExportEngine {
  exportMix(request: StudioExportRequest): Promise<StudioEngineExportResult>;
}
