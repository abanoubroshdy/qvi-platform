import { describe, expect, it } from "vitest";
import { defaultAudioExportSettings } from "@/lib/audio-export";
import type { runFFmpegFiles } from "@/lib/ffmpeg";
import { StudioExportError, createStudioExportEngine } from "@/lib/studio/export-engine";
import { planStudioExport } from "@/lib/studio/export-plan";
import {
  addImportedFileAsTrack,
  addImportedFileToTrack,
  audibleDuration,
  createStudioProject,
  setClipOffset,
  setMasterGain,
  setTrackGain,
  setTrackMuted,
  setTrackPitch,
  setTrackSolo,
  setTrackTempo,
} from "@/lib/studio/project";
import type { StudioImportedFile } from "@/lib/studio/project";
import type { StudioProject } from "@/lib/studio/types";

function imported(fileName: string, seconds: number): StudioImportedFile {
  return {
    fileName,
    byteLength: 1000,
    sourceDurationSec: seconds,
    sampleRate: 44100,
    channels: 2,
    peaks: [0.2],
    buffer: {
      duration: seconds,
      length: Math.round(seconds * 44100),
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(8),
    } as unknown as AudioBuffer,
  };
}

function projectWith(files: StudioImportedFile[]): StudioProject {
  let current = createStudioProject("QVI Studio", "project-1");
  for (const file of files) {
    const added = addImportedFileAsTrack(current, file, "desktop");
    if (!added.ok) throw new Error(added.reason);
    current = added.project;
  }
  return current;
}

const settings = defaultAudioExportSettings;

describe("studio export plan", () => {
  it("refuses an empty project and a mix with nothing audible", () => {
    expect(planStudioExport(createStudioProject(), "wav", settings)).toEqual({ ok: false, reason: "empty-project" });
    const project = projectWith([imported("a.wav", 4)]);
    const muted = setTrackMuted(project, project.tracks[0]!.id, true);
    expect(muted.ok).toBe(true);
    if (!muted.ok) return;
    expect(planStudioExport(muted.project, "mp3", settings)).toEqual({ ok: false, reason: "nothing-audible" });
    project.tracks[0]!.clips[0]!.buffer = null;
    expect(planStudioExport(project, "wav", settings)).toEqual({ ok: false, reason: "missing-buffer" });
  });

  it("keeps solo tracks and drops a muted solo", () => {
    let project = projectWith([imported("a.wav", 6), imported("b.wav", 3)]);
    const solo = setTrackSolo(project, project.tracks[1]!.id, true);
    expect(solo.ok).toBe(true);
    if (!solo.ok) return;
    project = solo.project;
    const plan = planStudioExport(project, "wav", settings);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.inputs).toHaveLength(1);
    expect(plan.inputs[0]!.trackId).toBe(project.tracks[1]!.id);
    expect(plan.estimatedDuration).toBe(audibleDuration(project));
    expect(plan.filterComplex).not.toContain("amix=");

    const hidden = setTrackMuted(project, project.tracks[1]!.id, true);
    expect(hidden.ok).toBe(true);
    if (!hidden.ok) return;
    expect(planStudioExport(hidden.project, "wav", settings)).toEqual({ ok: false, reason: "nothing-audible" });
  });

  it("sums overlapping clips before the track gain, then applies the master", () => {
    const first = projectWith([imported("a.wav", 4)]);
    const trackId = first.tracks[0]!.id;
    const added = addImportedFileToTrack(first, trackId, imported("b.wav", 2));
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const moved = setClipOffset(added.project, trackId, added.project.tracks[0]!.clips[1]!.id, 1.5);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    const gained = setTrackGain(moved.project, trackId, -6);
    expect(gained.ok).toBe(true);
    if (!gained.ok) return;
    const mastered = setMasterGain(gained.project, 3);
    const plan = planStudioExport(mastered, "wav", settings);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.inputs.map((input) => input.name)).toEqual(["clip0.wav", "clip1.wav"]);
    expect(plan.filterComplex).toContain("amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,volume=-6dB");
    expect(plan.filterComplex).toContain("adelay=1500|1500");
    expect(plan.filterComplex.endsWith("volume=3dB[out]")).toBe(true);
    expect(plan.filterComplex).not.toContain("atempo");
    expect(plan.filterComplex).not.toContain("asetrate");
    expect(plan.args).toContain("pcm_s16le");
    expect(plan.mimeType).toBe("audio/wav");
    expect(plan.fileName).toBe("QVI Studio.wav");
    expect(plan.estimatedDuration).toBe(audibleDuration(mastered));
  });

  it("leaves tempo and pitch out of the mix graph", () => {
    const project = projectWith([imported("a.wav", 8)]);
    const trackId = project.tracks[0]!.id;
    const tempo = setTrackTempo(project, trackId, { targetBpm: 240 });
    expect(tempo.ok).toBe(true);
    if (!tempo.ok) return;
    const pitched = setTrackPitch(tempo.project, trackId, { semitones: 2, cents: 0 });
    expect(pitched.ok).toBe(true);
    if (!pitched.ok) return;
    const plan = planStudioExport(pitched.project, "mp3", { ...settings, channels: 1 });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.filterComplex).not.toContain("atempo");
    expect(plan.filterComplex).not.toContain("asetrate");
    expect(plan.filterComplex).not.toContain("rubberband");
    expect(plan.filterComplex).toContain("channel_layouts=mono");
    expect(plan.estimatedDuration).toBe(4);
    expect(plan.args).toContain("libmp3lame");
    expect(plan.fileName).toBe("QVI Studio.mp3");
  });
});

describe("studio export engine", () => {
  it("encodes only the audible clips and returns the bounced file", async () => {
    const project = projectWith([imported("a.wav", 2), imported("b.wav", 2)]);
    const muted = setTrackMuted(project, project.tracks[0]!.id, true);
    expect(muted.ok).toBe(true);
    if (!muted.ok) return;
    const calls: { files: { name: string }[]; args: string[] }[] = [];
    let encoded = 0;
    const run: typeof runFFmpegFiles = async (options) => {
      calls.push({ files: options.files, args: options.args });
      return new Blob(["mix"], { type: "audio/wav" });
    };
    const engine = createStudioExportEngine({
      run,
      encodeClip: (_buffer, name) => {
        encoded += 1;
        return new File([new Uint8Array([1])], name, { type: "audio/wav" });
      },
    });
    const result = await engine.exportMix({ project: muted.project, format: "wav", settings });
    expect(result).toMatchObject({ ok: true, fileName: "QVI Studio.wav", mimeType: "audio/wav" });
    expect(encoded).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.files).toEqual([expect.objectContaining({ name: "clip0.wav" })]);
    expect(calls[0]?.args.join(" ")).not.toContain("amix=");
  });

  it("stops before ffmpeg when a clip has no decoded audio", async () => {
    const project = projectWith([imported("a.wav", 2)]);
    project.tracks[0]!.clips[0]!.buffer = null;
    let ran = false;
    const run: typeof runFFmpegFiles = async () => {
      ran = true;
      return new Blob();
    };
    const engine = createStudioExportEngine({ run });
    await expect(engine.exportMix({ project, format: "wav", settings })).rejects.toBeInstanceOf(StudioExportError);
    expect(ran).toBe(false);
  });

  it("stretches a clip before the mix and keeps pitch filters out of ffmpeg", async () => {
    const frames = 8000;
    const sampleRate = 16000;
    const project = projectWith([imported("a.wav", frames / sampleRate)]);
    const trackId = project.tracks[0]!.id;
    const clip = project.tracks[0]!.clips[0]!;
    const data = new Float32Array(frames).fill(0.25);
    clip.sampleRate = sampleRate;
    clip.sourceDurationSec = frames / sampleRate;
    clip.trimStartSec = 0;
    clip.trimEndSec = frames / sampleRate;
    clip.buffer = {
      duration: frames / sampleRate,
      length: frames,
      sampleRate,
      numberOfChannels: 1,
      getChannelData: () => data,
      copyFromChannel() {},
      copyToChannel() {},
    } as AudioBuffer;
    const tempo = setTrackTempo(project, trackId, { targetBpm: 240 });
    expect(tempo.ok).toBe(true);
    if (!tempo.ok) return;
    let encodedLength = 0;
    let args = "";
    const engine = createStudioExportEngine({
      run: async (options) => {
        args = options.args.join(" ");
        return new Blob(["mix"], { type: "audio/wav" });
      },
      encodeClip: (buffer, name) => {
        encodedLength = buffer.length;
        return new File([new Uint8Array([1])], name, { type: "audio/wav" });
      },
    });
    const result = await engine.exportMix({ project: tempo.project, format: "wav", settings });
    expect(result.ok).toBe(true);
    expect(encodedLength).toBe(frames / 2);
    expect(args).not.toMatch(/asetrate|atempo|rubberband/);
    expect(args).not.toContain("-af");
  });

  it("trims a clip before ffmpeg instead of using atrim", async () => {
    const frames = 8000;
    const sampleRate = 8000;
    const project = projectWith([imported("a.wav", 1)]);
    const clip = project.tracks[0]!.clips[0]!;
    const data = new Float32Array(frames).fill(0.2);
    clip.sampleRate = sampleRate;
    clip.sourceDurationSec = 1;
    clip.trimStartSec = 0.25;
    clip.trimEndSec = 0.5;
    clip.buffer = {
      duration: 1,
      length: frames,
      sampleRate,
      numberOfChannels: 1,
      getChannelData: () => data,
      copyFromChannel() {},
      copyToChannel() {},
    } as AudioBuffer;
    let encodedLength = 0;
    let filter = "";
    const engine = createStudioExportEngine({
      run: async (options) => {
        filter = options.args.join(" ");
        return new Blob(["mix"]);
      },
      encodeClip: (buffer, name) => {
        encodedLength = buffer.length;
        return new File([new Uint8Array([1])], name);
      },
    });
    await engine.exportMix({ project, format: "wav", settings });
    expect(encodedLength).toBe(2000);
    expect(filter).not.toContain("atrim=");
    expect(filter).not.toContain("asetrate");
  });

  it("does not run ffmpeg when the project cannot export", async () => {
    let ran = false;
    const run: typeof runFFmpegFiles = async () => {
      ran = true;
      return new Blob();
    };
    const engine = createStudioExportEngine({ run });
    const result = await engine.exportMix({ project: createStudioProject(), format: "mp3", settings });
    expect(result).toEqual({ ok: false, reason: "empty-project" });
    expect(ran).toBe(false);
  });
});
