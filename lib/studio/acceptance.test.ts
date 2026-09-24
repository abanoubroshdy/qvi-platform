import { describe, expect, it } from "vitest";
import { defaultAudioExportSettings } from "@/lib/audio-export";
import { heardClipDuration, trackAddBlockReason } from "@/lib/studio/definition";
import { planStudioExport } from "@/lib/studio/export-plan";
import { planPlayback } from "@/lib/studio/playback-schedule";
import {
  addImportedFileAsTrack,
  addImportedFileToTrack,
  audibleDuration,
  canPlayStudioProject,
  createStudioProject,
  projectDuration,
  projectExportBlockReason,
  removeClip,
  setClipOffset,
  setTrackMuted,
  setTrackPitch,
  setTrackSolo,
  setTrackTempo,
  snapshotStudioProject,
} from "@/lib/studio/project";
import type { StudioProject } from "@/lib/studio/types";

function file(fileName: string, seconds: number) {
  return {
    fileName,
    byteLength: 1000,
    sourceDurationSec: seconds,
    sampleRate: 44100,
    channels: 1,
    peaks: [0.2],
  };
}

function take(result: { ok: true; project: StudioProject } | { ok: false; reason: string }): StudioProject {
  if (!result.ok) throw new Error(result.reason);
  return result.project;
}

describe("QVI Studio v1 acceptance", () => {
  it("keeps arrange, tempo, pitch, mute, and export on the same rules", () => {
    let project = take(addImportedFileAsTrack(createStudioProject("QVI Studio", "project-1"), file("drums.wav", 4), "desktop"));
    project = take(addImportedFileAsTrack(project, file("bass.wav", 4), "desktop"));
    const drumsId = project.tracks[0]!.id;
    project = take(addImportedFileToTrack(project, drumsId, file("hats.wav", 4)));
    expect(project.tracks[0]!.clips[1]!.offsetSec).toBe(4);

    project = take(setClipOffset(project, drumsId, project.tracks[0]!.clips[1]!.id, 2));
    expect(project.tracks[0]!.clips).toHaveLength(2);
    expect(projectDuration(project)).toBe(6);

    const buffer = { duration: 4 } as unknown as AudioBuffer;
    for (const track of project.tracks) {
      for (const clip of track.clips) clip.buffer = buffer;
    }
    const plan = planPlayback({ project, playheadSec: 0 });
    const drumEvents = plan.events.filter((event) => event.trackId === drumsId);
    expect(drumEvents).toHaveLength(2);
    expect(drumEvents.map((event) => event.clipId)).toEqual(project.tracks[0]!.clips.map((clip) => clip.id));

    const bounce = planStudioExport(project, "wav", defaultAudioExportSettings);
    expect(bounce.ok).toBe(true);
    if (bounce.ok) {
      expect(bounce.fileName).toBe("QVI Studio.wav");
      expect(bounce.estimatedDuration).toBe(6);
      expect(bounce.filterComplex).toContain("amix=inputs=2:duration=longest:dropout_transition=0:normalize=0");
    }

    const secret = { marker: "secret-pcm" };
    project.tracks[0]!.clips[0]!.buffer = secret as unknown as AudioBuffer;
    expect(JSON.stringify(snapshotStudioProject(project))).not.toContain("secret-pcm");

    const tempo = take(setTrackTempo(project, drumsId, { targetBpm: project.tracks[0]!.tempo.originalBpm * 2 }));
    expect(heardClipDuration(4, tempo.tracks[0]!.tempo)).toBe(2);
    expect(projectDuration(tempo)).toBe(4);

    const pitched = take(setTrackPitch(project, drumsId, { semitones: 3 }));
    expect(projectDuration(pitched)).toBe(projectDuration(project));
    expect(audibleDuration(pitched)).toBe(audibleDuration(project));

    const muted = take(setTrackMuted(project, drumsId, true));
    expect(audibleDuration(muted)).toBe(4);
    expect(projectExportBlockReason(muted)).toBeNull();
    expect(canPlayStudioProject(muted)).toBe(true);

    const soloed = take(setTrackSolo(muted, drumsId, true));
    expect(audibleDuration(soloed)).toBe(0);
    expect(projectExportBlockReason(soloed)).toBe("nothing-audible");
    expect(canPlayStudioProject(soloed)).toBe(true);
    expect(planStudioExport(soloed, "wav", defaultAudioExportSettings)).toMatchObject({
      ok: false,
      reason: "nothing-audible",
    });

    const dropped = take(removeClip(project, drumsId, project.tracks[0]!.clips[0]!.id));
    const emptied = take(removeClip(dropped, drumsId, dropped.tracks[0]!.clips[0]!.id));
    expect(emptied.tracks.map((track) => track.name)).toEqual(["drums", "bass"]);
    expect(emptied.tracks[0]!.clips).toEqual([]);
  });

  it("blocks a ninth track on a phone", () => {
    let project = createStudioProject("QVI Studio", "project-1");
    for (let index = 0; index < 8; index += 1) {
      project = take(addImportedFileAsTrack(project, file(`take-${index}.wav`, 1), "mobile"));
    }
    expect(project.tracks).toHaveLength(8);
    expect(trackAddBlockReason(project.tracks.length, "mobile")).toBe("track-cap-reached");
    expect(addImportedFileAsTrack(project, file("ninth.wav", 1), "mobile")).toMatchObject({
      ok: false,
      reason: "track-cap-reached",
    });
  });
});
