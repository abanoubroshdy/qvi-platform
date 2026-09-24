/**
 * Bounce the audible QVI Studio mix with ffmpeg.wasm.
 * SoundTouch trims and stretches each clip first. ffmpeg only formats and sums.
 * Playback rate is not used.
 */

import { createPcmBuffer, stretchAudioBuffer, type AudioStretchOptions } from "@/lib/audio-stretch";
import { resolveTempoRate } from "@/lib/audio-tempo";
import { runFFmpegFiles, type FFmpegInputFile } from "@/lib/ffmpeg";
import { planStudioExport } from "@/lib/studio/export-plan";
import type { StudioExportEngine, StudioEngineExportResult } from "@/lib/studio/engine";
import { trackTempoPitchIsIdentity } from "@/lib/studio/project";
import { sliceAudioBuffer, type StudioBufferFactory } from "@/lib/studio/tempo-preview";
import type { StudioClip, StudioProject, StudioTrack } from "@/lib/studio/types";
import { encodeWavPcm16, wavArrayBuffer } from "@/lib/studio/wav";

export class StudioExportError extends Error {
  readonly code: "missing-buffer";

  constructor() {
    super("A clip is missing decoded audio.");
    this.name = "StudioExportError";
    this.code = "missing-buffer";
  }
}

export function createStudioExportEngine(deps?: {
  run?: typeof runFFmpegFiles;
  encodeClip?: (buffer: AudioBuffer, name: string) => File;
  createBuffer?: StudioBufferFactory;
  stretchClip?: (buffer: AudioBuffer, options: AudioStretchOptions) => AudioBuffer | Promise<AudioBuffer>;
  onProgress?: (ratio: number) => void;
}): StudioExportEngine {
  const run = deps?.run ?? runFFmpegFiles;
  const encodeClip = deps?.encodeClip ?? encodeClipWav;
  const createBuffer = deps?.createBuffer ?? createPcmBuffer;
  const stretchClip = deps?.stretchClip ?? ((buffer, options) => stretchAudioBuffer(buffer, { ...options, createBuffer }));

  return {
    async exportMix(request): Promise<StudioEngineExportResult> {
      const plan = planStudioExport(request.project, request.format, request.settings);
      if (!plan.ok) {
        if (plan.reason === "missing-buffer") throw new StudioExportError();
        return { ok: false, reason: plan.reason };
      }
      const files: FFmpegInputFile[] = [];
      for (const input of plan.inputs) {
        const located = findClip(request.project, input.clipId);
        if (!located?.clip.buffer) throw new StudioExportError();
        const prepared = await prepareClip(located.clip, located.track, createBuffer, stretchClip);
        files.push({ name: input.name, file: encodeClip(prepared, input.name) });
      }
      const blob = await run({
        files,
        outputName: plan.outputName,
        mimeType: plan.mimeType,
        args: plan.args,
        fallbackArgs: plan.fallbackArgs,
        onProgress: deps?.onProgress,
      });
      return { ok: true, blob, fileName: plan.fileName, mimeType: plan.mimeType };
    },
  };
}

async function prepareClip(
  clip: StudioClip,
  track: StudioTrack,
  createBuffer: StudioBufferFactory,
  stretchClip: (buffer: AudioBuffer, options: AudioStretchOptions) => AudioBuffer | Promise<AudioBuffer>,
): Promise<AudioBuffer> {
  if (!clip.buffer) throw new StudioExportError();
  const sliced = sliceAudioBuffer(clip.buffer, clip.trimStartSec, clip.trimEndSec, createBuffer);
  if (trackTempoPitchIsIdentity(track)) return sliced;
  return stretchClip(sliced, {
    tempoRate: resolveTempoRate(track.tempo),
    semitones: track.pitchSemitones,
    cents: track.pitchCents,
    preset: track.stretchPreset,
    createBuffer,
  });
}

function encodeClipWav(buffer: AudioBuffer, name: string): File {
  return new File([wavArrayBuffer(encodeWavPcm16(buffer))], name, { type: "audio/wav" });
}

function findClip(project: StudioProject, clipId: string): { clip: StudioClip; track: StudioTrack } | null {
  for (const track of project.tracks) {
    const clip = track.clips.find((item) => item.id === clipId);
    if (clip) return { clip, track };
  }
  return null;
}
