import { describe, expect, it } from "vitest";
import { MAX_GAIN_DB, MIN_GAIN_DB } from "@/lib/audio-edit";
import { resolveTempoRate } from "@/lib/audio-tempo";
import { FFMPEG_LARGE_FILE_BYTES } from "@/lib/ffmpeg";
import {
  studioEngineContract,
  type StudioExportEngine,
  type StudioPlaybackEngine,
  type StudioTempoPitchPreview,
} from "@/lib/studio/engine";
import {
  addImportedFileAsTrack,
  addImportedFileToTrack,
  audibleDuration,
  canPlayStudioProject,
  createStudioProject,
  defaultTempo,
  largeFileWarning,
  projectDuration,
  projectExportBlockReason,
  removeClip,
  seekPlayhead,
  setClipOffset,
  setClipTrim,
  setMasterGain,
  setTrackGain,
  setTrackMuted,
  setTrackPitch,
  setTrackSolo,
  setTrackStretchPreset,
  setTrackTempo,
  snapshotStudioProject,
  stopPlayhead,
  trackTempoPitchIsIdentity,
} from "@/lib/studio/project";
import { qviStudioLimits } from "@/lib/studio/definition";
import type { StudioProject } from "@/lib/studio/types";

function imported(fileName: string, seconds: number, byteLength = 1000) {
  return {
    fileName,
    byteLength,
    sourceDurationSec: seconds,
    sampleRate: 44100,
    channels: 2,
    peaks: [0.1, 0.4],
  };
}

function withTrack(fileName = "drums.wav", seconds = 8): StudioProject {
  const result = addImportedFileAsTrack(createStudioProject("Demo", "project-1"), imported(fileName, seconds), "desktop");
  if (!result.ok) throw new Error(result.reason);
  return result.project;
}

describe("studio project model", () => {
  it("starts empty at unity gain", () => {
    const project = createStudioProject();
    expect(project.masterGainDb).toBe(0);
    expect(project.tracks).toEqual([]);
    expect(project.playheadSec).toBe(0);
    expect(canPlayStudioProject(project)).toBe(false);
    expect(projectExportBlockReason(project)).toBe("empty-project");
  });

  it("places a dropped file on a new track at offset 0", () => {
    const result = addImportedFileAsTrack(createStudioProject("Demo", "project-1"), imported("drums.wav", 8), "desktop");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const track = result.project.tracks[0]!;
    expect(track.name).toBe("drums");
    expect(track.color).toBe("#1a7f96");
    expect(track.gainDb).toBe(0);
    expect(track.clips[0]).toMatchObject({ offsetSec: 0, trimStartSec: 0, trimEndSec: 8 });
    expect(projectDuration(result.project)).toBe(8);
    expect(canPlayStudioProject(result.project)).toBe(true);
    expect(projectExportBlockReason(result.project)).toBeNull();
  });

  it("places an extra file at the heard end of the track", () => {
    const first = withTrack("drums.wav", 8);
    const trackId = first.tracks[0]!.id;
    const doubled = setTrackTempo(first, trackId, { targetBpm: 240 });
    expect(doubled.ok).toBe(true);
    if (!doubled.ok) return;
    expect(projectDuration(doubled.project)).toBe(4);
    expect(resolveTempoRate(doubled.project.tracks[0]!.tempo)).toBe(2);

    const added = addImportedFileToTrack(doubled.project, trackId, imported("hat.wav", 2));
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.project.tracks[0]!.clips[1]!.offsetSec).toBe(4);
    // 2s source at 2x tempo is 1s heard, so the project ends at 5s.
    expect(projectDuration(added.project)).toBe(5);
  });

  it("keeps heard length when only pitch changes", () => {
    const project = withTrack();
    const pitched = setTrackPitch(project, project.tracks[0]!.id, { semitones: 2, cents: 10 });
    expect(pitched.ok).toBe(true);
    if (!pitched.ok) return;
    expect(projectDuration(pitched.project)).toBe(8);
    expect(trackTempoPitchIsIdentity(pitched.project.tracks[0]!)).toBe(false);
    expect(trackTempoPitchIsIdentity(project.tracks[0]!)).toBe(true);
  });

  it("stores the stretch preset on the track without changing identity", () => {
    const project = withTrack();
    expect(project.tracks[0]!.stretchPreset).toBe("music");
    const speech = setTrackStretchPreset(project, project.tracks[0]!.id, "speech");
    expect(speech.ok).toBe(true);
    if (!speech.ok) return;
    expect(speech.project.tracks[0]!.stretchPreset).toBe("speech");
    expect(trackTempoPitchIsIdentity(speech.project.tracks[0]!)).toBe(true);
    expect(snapshotStudioProject(speech.project).tracks[0]!.stretchPreset).toBe("speech");
  });

  it("counts muted clips in the timeline and drops them from the bounce", () => {
    let project = withTrack("a.wav", 10);
    const second = addImportedFileAsTrack(project, imported("b.wav", 4), "desktop");
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    project = second.project;
    const muted = setTrackMuted(project, project.tracks[0]!.id, true);
    expect(muted.ok).toBe(true);
    if (!muted.ok) return;
    expect(projectDuration(muted.project)).toBe(10);
    expect(audibleDuration(muted.project)).toBe(4);
    expect(projectExportBlockReason(muted.project)).toBeNull();

    const soloMuted = setTrackSolo(muted.project, muted.project.tracks[0]!.id, true);
    expect(soloMuted.ok).toBe(true);
    if (!soloMuted.ok) return;
    expect(projectExportBlockReason(soloMuted.project)).toBe("nothing-audible");
    expect(audibleDuration(soloMuted.project)).toBe(0);
    expect(projectDuration(soloMuted.project)).toBe(10);
  });

  it("blocks the ninth track on mobile and allows it on tablet", () => {
    let project = createStudioProject("Demo", "project-1");
    for (let index = 0; index < qviStudioLimits.tracks.mobile.maxTracks; index += 1) {
      const added = addImportedFileAsTrack(project, imported(`t${index}.wav`, 1), "mobile");
      expect(added.ok).toBe(true);
      if (!added.ok) return;
      project = added.project;
    }
    const blocked = addImportedFileAsTrack(project, imported("extra.wav", 1), "mobile");
    expect(blocked).toMatchObject({ ok: false, reason: "track-cap-reached" });
    if (blocked.ok) return;
    expect(blocked.project).toBe(project);

    const allowed = addImportedFileAsTrack(project, imported("extra.wav", 1), "tablet");
    expect(allowed.ok).toBe(true);
  });

  it("clamps gain, tempo, and pitch to the existing tool ranges", () => {
    const project = withTrack();
    const trackId = project.tracks[0]!.id;
    const quiet = setTrackGain(project, trackId, -100);
    const loud = setTrackGain(project, trackId, 24);
    expect(quiet.ok && quiet.project.tracks[0]!.gainDb).toBe(MIN_GAIN_DB);
    expect(loud.ok && loud.project.tracks[0]!.gainDb).toBe(MAX_GAIN_DB);
    expect(setMasterGain(project, 12).masterGainDb).toBe(MAX_GAIN_DB);

    const tempo = setTrackTempo(project, trackId, { mode: "percent", percent: 400, targetBpm: 1 });
    expect(tempo.ok).toBe(true);
    if (!tempo.ok) return;
    expect(tempo.project.tracks[0]!.tempo.percent).toBe(qviStudioLimits.tempo.maxPercent);
    expect(tempo.project.tracks[0]!.tempo.targetBpm).toBe(qviStudioLimits.tempo.minBpm);

    const pitch = setTrackPitch(project, trackId, { semitones: 40, cents: -80 });
    expect(pitch.ok).toBe(true);
    if (!pitch.ok) return;
    expect(pitch.project.tracks[0]!.pitchSemitones).toBe(qviStudioLimits.tempo.maxSemitones);
    expect(pitch.project.tracks[0]!.pitchCents).toBe(qviStudioLimits.tempo.minCents);
  });

  it("clamps seek and returns stop to the start", () => {
    const project = withTrack("drums.wav", 8);
    expect(seekPlayhead(project, 100).playheadSec).toBe(8);
    expect(seekPlayhead(project, -4).playheadSec).toBe(0);
    const stopped = stopPlayhead(seekPlayhead(project, 3));
    expect(stopped.playheadSec).toBe(0);
  });

  it("pulls the playhead back when a trim shortens the timeline", () => {
    const project = seekPlayhead(withTrack("drums.wav", 8), 7);
    const trackId = project.tracks[0]!.id;
    const clipId = project.tracks[0]!.clips[0]!.id;
    const trimmed = setClipTrim(project, trackId, clipId, { trimEndSec: 3 });
    expect(trimmed.ok).toBe(true);
    if (!trimmed.ok) return;
    expect(trimmed.project.playheadSec).toBe(3);
    expect(trimmed.project.tracks[0]!.clips[0]).toMatchObject({ trimStartSec: 0, trimEndSec: 3 });
  });

  it("keeps trim inside the source file", () => {
    const project = withTrack("drums.wav", 8);
    const trackId = project.tracks[0]!.id;
    const clipId = project.tracks[0]!.clips[0]!.id;
    const inverted = setClipTrim(project, trackId, clipId, { trimStartSec: 6, trimEndSec: 2 });
    expect(inverted.ok).toBe(true);
    if (!inverted.ok) return;
    expect(inverted.project.tracks[0]!.clips[0]).toMatchObject({ trimStartSec: 0, trimEndSec: 8 });

    const moved = setClipOffset(project, trackId, clipId, -2);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.project.tracks[0]!.clips[0]!.offsetSec).toBe(0);
  });

  it("omits decoded audio from the snapshot", () => {
    const project = withTrack();
    const secret = { marker: "secret-pcm" };
    project.tracks[0]!.clips[0]!.buffer = secret as unknown as AudioBuffer;
    const snapshot = snapshotStudioProject(project);
    const json = JSON.stringify(snapshot);
    expect(json).not.toContain("secret-pcm");
    expect(json).not.toContain("buffer");
    expect(snapshot.version).toBe(1);
    expect(snapshot.tracks[0]!.clips[0]!.peaks).toEqual([0.1, 0.4]);
    expect(project.tracks[0]!.clips[0]!.buffer).toBe(secret);
  });

  it("rejects an unsupported file and warns on a large one", () => {
    const project = createStudioProject("Demo", "project-1");
    const rejected = addImportedFileAsTrack(project, imported("notes.txt", 1), "desktop");
    expect(rejected).toMatchObject({ ok: false, reason: "unsupported-file" });

    const large = addImportedFileAsTrack(
      project,
      imported("big.wav", 30, FFMPEG_LARGE_FILE_BYTES),
      "desktop",
    );
    expect(large.ok).toBe(true);
    if (!large.ok) return;
    expect(large.warning).toBe("large-file");
    expect(largeFileWarning(FFMPEG_LARGE_FILE_BYTES - 1)).toBeNull();
  });

  it("removes a track when its last clip is removed", () => {
    const project = withTrack("only.wav", 3);
    const track = project.tracks[0]!;
    const removed = removeClip(project, track.id, track.clips[0]!.id);
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.project.tracks).toEqual([]);
    expect(projectDuration(removed.project)).toBe(0);
  });

  it("leaves the project unchanged when the clip is missing", () => {
    const project = withTrack();
    const removed = removeClip(project, project.tracks[0]!.id, "missing");
    expect(removed).toMatchObject({ ok: false, reason: "clip-not-found" });
    if (removed.ok) return;
    expect(removed.project).toBe(project);
  });

  it("uses the tempo helper for the default bpm identity", () => {
    expect(resolveTempoRate(defaultTempo())).toBe(1);
  });
});

describe("studio engine contract", () => {
  it("names playback, preview, and mix export", () => {
    expect(studioEngineContract.implementsPlayback).toBe(true);
    expect(studioEngineContract.implementsPreview).toBe(true);
    expect(studioEngineContract.implementsExport).toBe(true);
    const playback: (keyof StudioPlaybackEngine)[] = [...studioEngineContract.playback];
    const preview: (keyof StudioTempoPitchPreview)[] = [...studioEngineContract.preview];
    const bounce: (keyof StudioExportEngine)[] = [...studioEngineContract.export];
    expect(playback).toEqual(["resumeFromUserGesture", "play", "pause", "stop", "seek", "sync", "dispose"]);
    expect(preview).toEqual(["renderTrack"]);
    expect(bounce).toEqual(["exportMix"]);
  });
});
