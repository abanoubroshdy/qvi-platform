/**
 * Pure edits for a QVI Studio session (phase 1).
 *
 * Timeline length, solo, and mute go through the phase 0 contract.
 * Nothing here decodes audio or writes a file.
 */

import { clampGainDb } from "@/lib/audio-edit";
import { DEFAULT_STRETCH_PRESET, parseStretchPreset, type StretchPresetId } from "@/lib/audio-stretch-preset";
import {
  clampBpm,
  clampCents,
  clampSemitones,
  clampTempoPercent,
  resolveTempoRate,
} from "@/lib/audio-tempo";
import {
  audibleTracks,
  canPlayProject,
  clipTimelineEnd,
  defaultClipOffset,
  exportBlockReason,
  qviStudioLimits,
  studioImportExtensions,
  trackAddBlockReason,
  timelineDuration,
  type StudioRejectReason,
  type StudioTempoSetting,
  type StudioViewport,
} from "@/lib/studio/definition";
import {
  createStudioId,
  trackColorForIndex,
  STUDIO_SNAPSHOT_VERSION,
  type StudioClip,
  type StudioClipState,
  type StudioProject,
  type StudioProjectSnapshot,
  type StudioTrack,
} from "@/lib/studio/types";

const TEMPO_IDENTITY_EPS = 1e-6;

export const studioEditReasons = {
  trackNotFound: "track-not-found",
  clipNotFound: "clip-not-found",
  duplicateId: "duplicate-id",
  unsupportedFile: "unsupported-file",
} as const;

export type StudioEditReason = (typeof studioEditReasons)[keyof typeof studioEditReasons];

export type StudioEditFailure = StudioRejectReason | StudioEditReason;

export const studioFileWarning = "large-file" as const;

export type StudioFileWarning = typeof studioFileWarning;

export type StudioWriteResult =
  | { ok: true; project: StudioProject; warning: StudioFileWarning | null }
  | { ok: false; project: StudioProject; reason: StudioEditFailure };

export type StudioImportedFile = {
  fileName: string;
  byteLength: number;
  sourceDurationSec: number;
  sampleRate: number;
  channels: number;
  peaks?: number[];
  buffer?: AudioBuffer | null;
  id?: string;
};

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function fileExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext === fileName.toLowerCase() ? "" : ext;
}

export function isStudioImportFileName(fileName: string): boolean {
  return (studioImportExtensions as readonly string[]).includes(fileExtension(fileName));
}

export function largeFileWarning(byteLength: number): StudioFileWarning | null {
  if (!Number.isFinite(byteLength) || byteLength < qviStudioLimits.largeFileBytes) return null;
  return studioFileWarning;
}

export function trackNameFromFile(fileName: string, index: number): string {
  const base = fileName.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "").trim();
  return base || `Track ${index + 1}`;
}

export function defaultTempo(): StudioTempoSetting {
  const bpm = qviStudioLimits.tempo.defaultBpm;
  return { mode: "bpm", originalBpm: bpm, targetBpm: bpm, percent: 0 };
}

export function createStudioProject(name = "Untitled", id = createStudioId("project")): StudioProject {
  return {
    id,
    name: name.trim() || "Untitled",
    masterGainDb: qviStudioLimits.gainDb.unity,
    playheadSec: 0,
    tracks: [],
  };
}

export function createStudioClip(input: StudioImportedFile & { offsetSec?: number }): StudioClip {
  const sourceDurationSec = Math.max(0, finiteNumber(input.sourceDurationSec, 0));
  const trimStartSec = 0;
  const trimEndSec = sourceDurationSec;
  return {
    id: input.id ?? createStudioId("clip"),
    fileName: input.fileName,
    byteLength: Math.max(0, finiteNumber(input.byteLength, 0)),
    sourceDurationSec,
    offsetSec: Math.max(0, finiteNumber(input.offsetSec ?? 0, 0)),
    trimStartSec,
    trimEndSec,
    sampleRate: Math.max(0, Math.round(finiteNumber(input.sampleRate, 0))),
    channels: Math.max(0, Math.round(finiteNumber(input.channels, 0))),
    peaks: [...(input.peaks ?? [])],
    buffer: input.buffer ?? null,
  };
}

export function createStudioTrack(input: {
  id?: string;
  name: string;
  color?: string;
  clips?: StudioClip[];
  index?: number;
}): StudioTrack {
  return {
    id: input.id ?? createStudioId("track"),
    name: input.name.trim() || "Track",
    color: input.color ?? trackColorForIndex(input.index ?? 0),
    clips: [...(input.clips ?? [])],
    gainDb: qviStudioLimits.gainDb.unity,
    muted: false,
    solo: false,
    tempo: defaultTempo(),
    pitchSemitones: 0,
    pitchCents: 0,
    stretchPreset: DEFAULT_STRETCH_PRESET,
  };
}

function knownIds(project: StudioProject): { tracks: Set<string>; clips: Set<string> } {
  const tracks = new Set<string>();
  const clips = new Set<string>();
  for (const track of project.tracks) {
    tracks.add(track.id);
    for (const clip of track.clips) clips.add(clip.id);
  }
  return { tracks, clips };
}

function fail(project: StudioProject, reason: StudioEditFailure): StudioWriteResult {
  return { ok: false, project, reason };
}

function succeed(project: StudioProject, warning: StudioFileWarning | null = null): StudioWriteResult {
  return { ok: true, project: clampPlayhead(project), warning };
}

function clampPlayhead(project: StudioProject): StudioProject {
  const duration = projectDuration(project);
  const raw = finiteNumber(project.playheadSec, 0);
  const playheadSec = Math.min(duration, Math.max(0, raw));
  if (playheadSec === project.playheadSec) return project;
  return { ...project, playheadSec };
}

function replaceTrack(project: StudioProject, trackId: string, next: StudioTrack): StudioProject {
  return {
    ...project,
    tracks: project.tracks.map((track) => (track.id === trackId ? next : track)),
  };
}

export function projectTimelineItems(project: StudioProject, audibleOnly: boolean) {
  const tracks = audibleOnly ? audibleTracks(project.tracks) : project.tracks;
  return tracks.flatMap((track) => track.clips.map((clip) => ({ clip, tempo: track.tempo })));
}

/** Heard length of every clip, including muted tracks. */
export function projectDuration(project: StudioProject): number {
  return timelineDuration(projectTimelineItems(project, false));
}

/** Heard length of clips that would be bounced. */
export function audibleDuration(project: StudioProject): number {
  return timelineDuration(projectTimelineItems(project, true));
}

export function countClips(project: StudioProject, audibleOnly: boolean): number {
  const tracks = audibleOnly ? audibleTracks(project.tracks) : project.tracks;
  return tracks.reduce((sum, track) => sum + track.clips.length, 0);
}

export function projectExportBlockReason(project: StudioProject): StudioRejectReason | null {
  return exportBlockReason({
    clipCount: countClips(project, false),
    audibleClipCount: countClips(project, true),
  });
}

export function canPlayStudioProject(project: StudioProject): boolean {
  return canPlayProject(projectDuration(project));
}

export function trackTempoPitchIsIdentity(track: Pick<StudioTrack, "tempo" | "pitchSemitones" | "pitchCents">): boolean {
  const rate = resolveTempoRate(track.tempo);
  return Math.abs(rate - 1) < TEMPO_IDENTITY_EPS && track.pitchSemitones === 0 && track.pitchCents === 0;
}

export function trackHeardEnds(track: StudioTrack): number[] {
  return track.clips.map((clip) => clipTimelineEnd(clip, track.tempo));
}

function normalizeSpan(
  sourceDurationSec: number,
  span: { offsetSec: number; trimStartSec: number; trimEndSec: number },
): Pick<StudioClip, "offsetSec" | "trimStartSec" | "trimEndSec"> {
  const source = Math.max(0, finiteNumber(sourceDurationSec, 0));
  const offsetSec = Math.max(0, finiteNumber(span.offsetSec, 0));
  let trimStartSec = Math.min(source, Math.max(0, finiteNumber(span.trimStartSec, 0)));
  let trimEndSec = Math.min(source, Math.max(0, finiteNumber(span.trimEndSec, source)));
  if (trimEndSec <= trimStartSec) {
    trimStartSec = 0;
    trimEndSec = source;
  }
  return { offsetSec, trimStartSec, trimEndSec };
}

export function addTrack(project: StudioProject, track: StudioTrack, viewport: StudioViewport): StudioWriteResult {
  const ids = knownIds(project);
  if (ids.tracks.has(track.id)) return fail(project, studioEditReasons.duplicateId);
  if (track.clips.some((clip) => ids.clips.has(clip.id))) return fail(project, studioEditReasons.duplicateId);
  const blocked = trackAddBlockReason(project.tracks.length, viewport);
  if (blocked) return fail(project, blocked);
  const warning = track.clips.reduce<StudioFileWarning | null>(
    (current, clip) => current ?? largeFileWarning(clip.byteLength),
    null,
  );
  return succeed(
    { ...project, tracks: [...project.tracks, { ...track, clips: track.clips.map((clip) => ({ ...clip, peaks: [...clip.peaks] })) }] },
    warning,
  );
}

export function addImportedFileAsTrack(
  project: StudioProject,
  file: StudioImportedFile,
  viewport: StudioViewport,
): StudioWriteResult {
  if (!isStudioImportFileName(file.fileName)) return fail(project, studioEditReasons.unsupportedFile);
  const index = project.tracks.length;
  const clip = createStudioClip({ ...file, offsetSec: 0 });
  const track = createStudioTrack({
    name: trackNameFromFile(file.fileName, index),
    index,
    clips: [clip],
  });
  return addTrack(project, track, viewport);
}

export function addImportedFileToTrack(
  project: StudioProject,
  trackId: string,
  file: StudioImportedFile,
): StudioWriteResult {
  if (!isStudioImportFileName(file.fileName)) return fail(project, studioEditReasons.unsupportedFile);
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track) return fail(project, studioEditReasons.trackNotFound);
  const ids = knownIds(project);
  if (file.id && ids.clips.has(file.id)) return fail(project, studioEditReasons.duplicateId);
  const clip = createStudioClip(file);
  const placed: StudioClip = {
    ...clip,
    offsetSec: defaultClipOffset(trackHeardEnds(track)),
  };
  return succeed(replaceTrack(project, trackId, { ...track, clips: [...track.clips, placed] }), largeFileWarning(placed.byteLength));
}

export function removeTrack(project: StudioProject, trackId: string): StudioWriteResult {
  if (!project.tracks.some((track) => track.id === trackId)) return fail(project, studioEditReasons.trackNotFound);
  return succeed({ ...project, tracks: project.tracks.filter((track) => track.id !== trackId) });
}

export function removeClip(project: StudioProject, trackId: string, clipId: string): StudioWriteResult {
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track) return fail(project, studioEditReasons.trackNotFound);
  if (!track.clips.some((clip) => clip.id === clipId)) return fail(project, studioEditReasons.clipNotFound);
  const clips = track.clips.filter((clip) => clip.id !== clipId);
  if (clips.length === 0) return removeTrack(project, trackId);
  return succeed(replaceTrack(project, trackId, { ...track, clips }));
}

function editTrack(
  project: StudioProject,
  trackId: string,
  edit: (track: StudioTrack) => StudioTrack,
): StudioWriteResult {
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track) return fail(project, studioEditReasons.trackNotFound);
  return succeed(replaceTrack(project, trackId, edit(track)));
}

export function setTrackGain(project: StudioProject, trackId: string, gainDb: number): StudioWriteResult {
  return editTrack(project, trackId, (track) => ({ ...track, gainDb: clampGainDb(gainDb) }));
}

export function setMasterGain(project: StudioProject, gainDb: number): StudioProject {
  return { ...project, masterGainDb: clampGainDb(gainDb) };
}

export function setTrackMuted(project: StudioProject, trackId: string, muted: boolean): StudioWriteResult {
  return editTrack(project, trackId, (track) => ({ ...track, muted }));
}

export function setTrackSolo(project: StudioProject, trackId: string, solo: boolean): StudioWriteResult {
  return editTrack(project, trackId, (track) => ({ ...track, solo }));
}

export function setTrackName(project: StudioProject, trackId: string, name: string): StudioWriteResult {
  return editTrack(project, trackId, (track) => ({ ...track, name: name.trim() || track.name }));
}

export function setTrackTempo(
  project: StudioProject,
  trackId: string,
  patch: Partial<StudioTempoSetting>,
): StudioWriteResult {
  return editTrack(project, trackId, (track) => {
    const next = { ...track.tempo, ...patch };
    return {
      ...track,
      tempo: {
        mode: next.mode === "percent" ? "percent" : "bpm",
        originalBpm: clampBpm(next.originalBpm),
        targetBpm: clampBpm(next.targetBpm),
        percent: clampTempoPercent(next.percent),
      },
    };
  });
}

export function setTrackStretchPreset(
  project: StudioProject,
  trackId: string,
  preset: StretchPresetId,
): StudioWriteResult {
  return editTrack(project, trackId, (track) => ({
    ...track,
    stretchPreset: parseStretchPreset(preset),
  }));
}

export function setTrackPitch(
  project: StudioProject,
  trackId: string,
  pitch: { semitones?: number; cents?: number },
): StudioWriteResult {
  return editTrack(project, trackId, (track) => ({
    ...track,
    pitchSemitones: pitch.semitones === undefined ? track.pitchSemitones : clampSemitones(pitch.semitones),
    pitchCents: pitch.cents === undefined ? track.pitchCents : clampCents(pitch.cents),
  }));
}

export function setClipOffset(
  project: StudioProject,
  trackId: string,
  clipId: string,
  offsetSec: number,
): StudioWriteResult {
  return editClip(project, trackId, clipId, (clip) => ({
    ...clip,
    ...normalizeSpan(clip.sourceDurationSec, { ...clip, offsetSec }),
  }));
}

export function setClipTrim(
  project: StudioProject,
  trackId: string,
  clipId: string,
  trim: { trimStartSec?: number; trimEndSec?: number },
): StudioWriteResult {
  return editClip(project, trackId, clipId, (clip) => ({
    ...clip,
    ...normalizeSpan(clip.sourceDurationSec, {
      offsetSec: clip.offsetSec,
      trimStartSec: trim.trimStartSec ?? clip.trimStartSec,
      trimEndSec: trim.trimEndSec ?? clip.trimEndSec,
    }),
  }));
}

function editClip(
  project: StudioProject,
  trackId: string,
  clipId: string,
  edit: (clip: StudioClip) => StudioClip,
): StudioWriteResult {
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track) return fail(project, studioEditReasons.trackNotFound);
  if (!track.clips.some((clip) => clip.id === clipId)) return fail(project, studioEditReasons.clipNotFound);
  return succeed(
    replaceTrack(project, trackId, {
      ...track,
      clips: track.clips.map((clip) => (clip.id === clipId ? edit(clip) : clip)),
    }),
  );
}

export function seekPlayhead(project: StudioProject, playheadSec: number): StudioProject {
  return clampPlayhead({ ...project, playheadSec });
}

export function stopPlayhead(project: StudioProject): StudioProject {
  if (project.playheadSec === 0) return project;
  return { ...project, playheadSec: 0 };
}

export function snapshotStudioProject(project: StudioProject): StudioProjectSnapshot {
  return {
    version: STUDIO_SNAPSHOT_VERSION,
    id: project.id,
    name: project.name,
    masterGainDb: project.masterGainDb,
    playheadSec: project.playheadSec,
    tracks: project.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      color: track.color,
      gainDb: track.gainDb,
      muted: track.muted,
      solo: track.solo,
      tempo: { ...track.tempo },
      pitchSemitones: track.pitchSemitones,
      pitchCents: track.pitchCents,
      stretchPreset: track.stretchPreset,
      clips: track.clips.map((clip) => clipState(clip)),
    })),
  };
}

function clipState(clip: StudioClip): StudioClipState {
  return {
    id: clip.id,
    fileName: clip.fileName,
    byteLength: clip.byteLength,
    sourceDurationSec: clip.sourceDurationSec,
    offsetSec: clip.offsetSec,
    trimStartSec: clip.trimStartSec,
    trimEndSec: clip.trimEndSec,
    sampleRate: clip.sampleRate,
    channels: clip.channels,
    peaks: [...clip.peaks],
  };
}
